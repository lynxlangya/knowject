from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


DEFAULT_CHUNK_SIZE = int(os.getenv("KNOWLEDGE_CHUNK_SIZE", "1000"))
DEFAULT_CHUNK_OVERLAP = int(os.getenv("KNOWLEDGE_CHUNK_OVERLAP", "200"))
SUPPORTED_EXTENSIONS = {".md", ".markdown", ".txt"}


class IndexerError(Exception):
    pass


@dataclass(frozen=True)
class IndexDocumentRequest:
    knowledge_id: str
    document_id: str
    source_type: str
    file_name: str
    mime_type: str
    storage_path: str
    document_version_hash: str


@dataclass(frozen=True)
class ChunkBlock:
    text: str
    carries_overlap: bool = False


def process_document(payload: dict[str, Any]) -> dict[str, Any]:
    request = parse_request(payload)
    text = parse_document_text(request)
    cleaned_text = clean_text(text)

    if not cleaned_text.strip():
        raise IndexerError("文档清洗后内容为空，无法分块")

    chunks = build_chunks(
        cleaned_text,
        chunk_size=DEFAULT_CHUNK_SIZE,
        overlap=DEFAULT_CHUNK_OVERLAP,
    )

    if not chunks:
        raise IndexerError("文档未生成有效分块")

    return {
        "status": "completed",
        "knowledgeId": request.knowledge_id,
        "documentId": request.document_id,
        "chunkCount": len(chunks),
        "characterCount": len(cleaned_text),
        "parser": detect_parser_name(request.file_name),
    }


def parse_request(payload: dict[str, Any]) -> IndexDocumentRequest:
    required_fields = {
        "knowledgeId": "knowledge_id",
        "documentId": "document_id",
        "sourceType": "source_type",
        "fileName": "file_name",
        "mimeType": "mime_type",
        "storagePath": "storage_path",
        "documentVersionHash": "document_version_hash",
    }

    values: dict[str, str] = {}
    for raw_key, target_key in required_fields.items():
        raw_value = payload.get(raw_key)
        if not isinstance(raw_value, str) or not raw_value.strip():
            raise IndexerError(f"{raw_key} 缺失或格式不合法")
        values[target_key] = raw_value.strip()

    return IndexDocumentRequest(**values)


def parse_document_text(request: IndexDocumentRequest) -> str:
    path = Path(request.storage_path)
    if not path.exists() or not path.is_file():
        raise IndexerError("上传文件不存在，无法触发 Python 解析")

    extension = path.suffix.lower()

    if extension == ".pdf":
        raise IndexerError("当前 Python indexer 仅稳定支持 md/txt，pdf 解析稍后补充")

    if extension not in SUPPORTED_EXTENSIONS:
        raise IndexerError(f"当前暂不支持 {extension or '未知类型'} 文档解析")

    for encoding in ("utf-8", "utf-8-sig"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue

    return path.read_text(encoding="utf-8", errors="replace")


def clean_text(text: str) -> str:
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


def build_chunks(text: str, chunk_size: int, overlap: int) -> list[str]:
    if chunk_size <= 0:
        raise IndexerError("chunk_size 必须大于 0")

    if overlap < 0 or overlap >= chunk_size:
        raise IndexerError("chunk_overlap 必须满足 0 <= overlap < chunk_size")

    blocks = split_blocks(text, chunk_size, overlap)
    if not blocks:
        return []

    chunks: list[str] = []
    prefix = ""
    current_blocks: list[str] = []

    for block in blocks:
        candidate = join_chunk(prefix, current_blocks + [block.text])
        if current_blocks and len(candidate) > chunk_size:
            chunk = join_chunk(prefix, current_blocks)
            chunks.append(chunk)
            prefix = chunk[-overlap:].strip() if overlap > 0 else ""
            current_blocks = [block.text]

            if block.carries_overlap:
                prefix = ""

            if len(join_chunk(prefix, current_blocks)) > chunk_size:
                allowed_prefix_length = max(chunk_size - len(block.text) - 2, 0)
                prefix = prefix[-allowed_prefix_length:].strip() if allowed_prefix_length else ""
            continue

        current_blocks.append(block.text)

    if current_blocks:
        chunks.append(join_chunk(prefix, current_blocks))

    return [chunk for chunk in chunks if chunk.strip()]


def split_blocks(text: str, chunk_size: int, overlap: int) -> list[ChunkBlock]:
    base_blocks: list[str] = []
    current_lines: list[str] = []

    for line in text.split("\n"):
        if line.strip():
            current_lines.append(line)
            continue

        if current_lines:
            base_blocks.append("\n".join(current_lines).strip())
            current_lines = []

    if current_lines:
        base_blocks.append("\n".join(current_lines).strip())

    expanded_blocks: list[ChunkBlock] = []
    for block in base_blocks:
        if len(block) <= chunk_size:
            expanded_blocks.append(ChunkBlock(text=block))
            continue

        expanded_blocks.extend(split_large_block(block, chunk_size, overlap))

    return expanded_blocks


def split_large_block(block: str, chunk_size: int, overlap: int) -> list[ChunkBlock]:
    pieces: list[ChunkBlock] = []
    start = 0

    while start < len(block):
        end = min(start + chunk_size, len(block))
        piece = block[start:end].strip()
        if piece:
            pieces.append(ChunkBlock(text=piece, carries_overlap=start > 0))

        if end >= len(block):
            break

        start = end - overlap

    return pieces


def join_chunk(prefix: str, blocks: list[str]) -> str:
    parts = [part for part in [prefix.strip(), "\n\n".join(blocks).strip()] if part]
    return "\n\n".join(parts).strip()


def detect_parser_name(file_name: str) -> str:
    extension = Path(file_name).suffix.lower()
    if extension in {".md", ".markdown"}:
        return "markdown"

    return "text"
