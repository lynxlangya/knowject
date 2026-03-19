from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Protocol


ErrorFactory = Callable[[str], Exception]
ResolveSupportedExtensionsCallable = Callable[[tuple[str, ...]], set[str]]


class IndexingConfigLike(Protocol):
    supported_types: tuple[str, ...]


class DocumentRequestLike(Protocol):
    storage_path: str
    indexing_config: IndexingConfigLike


@dataclass
class DocumentParser:
    resolve_supported_extensions: ResolveSupportedExtensionsCallable
    error_factory: ErrorFactory

    def parse_document_text(self, request: DocumentRequestLike) -> str:
        path = Path(request.storage_path)
        if not path.exists() or not path.is_file():
            raise self.error_factory("上传文件不存在，无法触发 Python 解析")

        extension = path.suffix.lower()

        if extension == ".pdf":
            raise self.error_factory("当前 Python indexer 仅稳定支持 md/txt，pdf 解析稍后补充")

        if extension not in self.resolve_supported_extensions(request.indexing_config.supported_types):
            raise self.error_factory(f"当前暂不支持 {extension or '未知类型'} 文档解析")

        for encoding in ("utf-8", "utf-8-sig"):
            try:
                return path.read_text(encoding=encoding)
            except UnicodeDecodeError:
                continue

        return path.read_text(encoding="utf-8", errors="replace")

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
        if extension in {".md", ".markdown"}:
            return "markdown"

        return "text"
