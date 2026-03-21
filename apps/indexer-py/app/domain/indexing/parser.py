from __future__ import annotations

from dataclasses import dataclass
from os import PathLike
from pathlib import Path
from typing import Callable, Protocol

from app.core.runtime_env import WORKSPACE_ROOT, read_optional_string
from app.domain.indexing.parsers.docx_parser import parse_docx_segments
from app.domain.indexing.parsers.pdf_parser import parse_pdf_segments
from app.domain.indexing.parsers.text_parser import parse_text_segments
from app.domain.indexing.parsers.xlsx_parser import parse_xlsx_segments
from app.domain.indexing.segments import ParsedSegment


ErrorFactory = Callable[[str], Exception]
ResolveSupportedExtensionsCallable = Callable[[tuple[str, ...]], set[str]]


class IndexingConfigLike(Protocol):
    supported_types: tuple[str, ...]


class DocumentRequestLike(Protocol):
    file_name: str
    storage_path: str
    indexing_config: IndexingConfigLike


DEFAULT_KNOWLEDGE_STORAGE_ROOT = WORKSPACE_ROOT / ".knowject-storage" / "knowledge"


def resolve_knowledge_storage_root() -> Path:
    configured_root = read_optional_string("KNOWLEDGE_STORAGE_ROOT")
    root = Path(configured_root).expanduser() if configured_root else DEFAULT_KNOWLEDGE_STORAGE_ROOT
    return root.resolve(strict=False)


def normalize_storage_path(storage_path: str | PathLike[str]) -> str:
    root = resolve_knowledge_storage_root()
    candidate = Path(storage_path).expanduser()

    if not candidate.is_absolute():
        candidate = root / candidate

    normalized = candidate.resolve(strict=False)

    try:
        normalized.relative_to(root)
    except ValueError as error:
        raise ValueError("storagePath 超出知识库存储根目录") from error

    return str(normalized)


@dataclass
class DocumentParser:
    resolve_supported_extensions: ResolveSupportedExtensionsCallable
    error_factory: ErrorFactory

    def parse_document_text(self, request: DocumentRequestLike) -> str:
        path, extension = self.resolve_document_path(request)

        if extension == ".pdf":
            segments = parse_pdf_segments(
                path=path,
                error_factory=self.error_factory,
                clean_text=self.clean_text,
            )
            return "\n\n".join(segment.text for segment in segments).strip()
        if extension == ".docx":
            segments = parse_docx_segments(
                path=path,
                error_factory=self.error_factory,
                clean_text=self.clean_text,
            )
            return "\n\n".join(segment.text for segment in segments).strip()
        if extension == ".xlsx":
            segments = parse_xlsx_segments(
                path=path,
                error_factory=self.error_factory,
                clean_text=self.clean_text,
            )
            return "\n\n".join(segment.text for segment in segments).strip()

        for encoding in ("utf-8", "utf-8-sig"):
            try:
                return path.read_text(encoding=encoding)
            except UnicodeDecodeError:
                continue

        return path.read_text(encoding="utf-8", errors="replace")

    def parse_document_segments(self, request: DocumentRequestLike) -> list[ParsedSegment]:
        path, extension = self.resolve_document_path(request)
        if extension == ".pdf":
            return parse_pdf_segments(
                path=path,
                error_factory=self.error_factory,
                clean_text=self.clean_text,
            )
        if extension == ".docx":
            return parse_docx_segments(
                path=path,
                error_factory=self.error_factory,
                clean_text=self.clean_text,
            )
        if extension == ".xlsx":
            return parse_xlsx_segments(
                path=path,
                error_factory=self.error_factory,
                clean_text=self.clean_text,
            )

        text = self.clean_text(self.parse_document_text(request))
        source_kind = "md" if extension in {".md", ".markdown"} else "txt"
        return parse_text_segments(text=text, source_kind=source_kind)

    def clean_text(self, text: str) -> str:
        normalized = text.replace("\r\n", "\n").replace("\r", "\n").replace("\ufeff", "")
        cleaned_lines: list[str] = []
        blank_run = 0

        for raw_line in normalized.split("\n"):
            line = raw_line.rstrip()
            if not line.strip():
                blank_run += 1
                if blank_run <= 2:
                    cleaned_lines.append("")
                continue

            blank_run = 0
            cleaned_lines.append(line)

        return "\n".join(cleaned_lines).strip()

    def detect_parser_name(self, file_name: str) -> str:
        extension = Path(file_name).suffix.lower()
        if extension == ".pdf":
            return "pdf"
        if extension == ".docx":
            return "docx"
        if extension == ".xlsx":
            return "xlsx"
        if extension in {".md", ".markdown"}:
            return "markdown"

        return "text"

    def resolve_document_path(self, request: DocumentRequestLike) -> tuple[Path, str]:
        try:
            normalized_storage_path = normalize_storage_path(request.storage_path)
        except ValueError as error:
            raise self.error_factory(str(error)) from error

        path = Path(normalized_storage_path)
        if not path.exists() or not path.is_file():
            raise self.error_factory("上传文件不存在，无法触发 Python 解析")

        extension = path.suffix.lower()
        if extension not in self.resolve_supported_extensions(request.indexing_config.supported_types):
            raise self.error_factory(f"当前暂不支持 {extension or '未知类型'} 文档解析")

        return path, extension
