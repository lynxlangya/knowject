from __future__ import annotations

import hashlib
import json
import math
import os
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from app.core.runtime_env import read_optional_positive_integer, read_optional_string


DEFAULT_CHUNK_SIZE = int(os.getenv("KNOWLEDGE_CHUNK_SIZE", "1000"))
DEFAULT_CHUNK_OVERLAP = int(os.getenv("KNOWLEDGE_CHUNK_OVERLAP", "200"))
DEFAULT_OPENAI_BASE_URL = read_optional_string("OPENAI_BASE_URL") or "https://api.openai.com/v1"
DEFAULT_OPENAI_EMBEDDING_MODEL = (
    read_optional_string("OPENAI_EMBEDDING_MODEL") or "text-embedding-3-small"
)
DEFAULT_OPENAI_TIMEOUT_MS = read_optional_positive_integer("OPENAI_TIMEOUT_MS", 15000)
DEFAULT_OPENAI_EMBEDDING_BATCH_SIZE = 64
DEFAULT_LOCAL_EMBEDDING_DIMENSION = 1536
DEFAULT_CHROMA_TIMEOUT_MS = read_optional_positive_integer("CHROMA_TIMEOUT_MS", 15000)
DEFAULT_CHROMA_TENANT = read_optional_string("CHROMA_TENANT") or "default_tenant"
DEFAULT_CHROMA_DATABASE = read_optional_string("CHROMA_DATABASE") or "default_database"
SUPPORTED_EXTENSIONS = {".md", ".markdown", ".txt"}
COLLECTION_NAME_BY_SOURCE_TYPE = {
    "global_docs": "global_docs",
    "global_code": "global_code",
}


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


@dataclass(frozen=True)
class ChunkRecord:
    chunk_id: str
    text: str
    metadata: dict[str, Any]


_COLLECTION_CACHE: dict[str, dict[str, Any]] = {}


def process_document(payload: dict[str, Any]) -> dict[str, Any]:
    request = parse_request(payload)
    text = parse_document_text(request)
    cleaned_text = clean_text(text)

    if not cleaned_text.strip():
        raise IndexerError("文档清洗后内容为空，无法分块")

    chunk_texts = build_chunks(
        cleaned_text,
        chunk_size=DEFAULT_CHUNK_SIZE,
        overlap=DEFAULT_CHUNK_OVERLAP,
    )

    if not chunk_texts:
        raise IndexerError("文档未生成有效分块")

    chunk_records = build_chunk_records(request, chunk_texts)
    collection = ensure_collection(resolve_collection_name(request.source_type))
    embeddings = create_embeddings([chunk.text for chunk in chunk_records])
    delete_document_chunks(collection["id"], request.document_id)
    upsert_chunk_records(collection["id"], chunk_records, embeddings)

    return {
        "status": "completed",
        "knowledgeId": request.knowledge_id,
        "documentId": request.document_id,
        "chunkCount": len(chunk_records),
        "characterCount": len(cleaned_text),
        "parser": detect_parser_name(request.file_name),
        "collectionName": collection["name"],
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


def build_chunk_records(
    request: IndexDocumentRequest,
    chunk_texts: list[str],
) -> list[ChunkRecord]:
    collection_name = resolve_collection_name(request.source_type)
    records: list[ChunkRecord] = []

    for index, chunk_text in enumerate(chunk_texts):
        chunk_id = f"{request.document_id}:{index}"
        records.append(
            ChunkRecord(
                chunk_id=chunk_id,
                text=chunk_text,
                metadata={
                    "knowledgeId": request.knowledge_id,
                    "documentId": request.document_id,
                    "type": request.source_type,
                    "source": request.file_name,
                    "chunkIndex": index,
                    "chunkId": chunk_id,
                    "documentVersionHash": request.document_version_hash,
                    "collectionName": collection_name,
                },
            )
        )

    return records


def resolve_collection_name(source_type: str) -> str:
    collection_name = COLLECTION_NAME_BY_SOURCE_TYPE.get(source_type)
    if not collection_name:
        raise IndexerError(f"当前暂不支持 {source_type} 索引命名空间")
    return collection_name


def create_embeddings(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    api_key = read_optional_string("OPENAI_API_KEY")
    if not api_key:
        if (read_optional_string("NODE_ENV") or "development") == "development":
            return [create_local_development_embedding(text) for text in texts]
        raise IndexerError("OPENAI_API_KEY 未配置，无法生成 embedding")

    embeddings: list[list[float]] = []
    for batch in iter_embedding_batches(texts, DEFAULT_OPENAI_EMBEDDING_BATCH_SIZE):
        response = request_json(
            build_api_url(DEFAULT_OPENAI_BASE_URL, "/embeddings"),
            method="POST",
            timeout_ms=DEFAULT_OPENAI_TIMEOUT_MS,
            headers={
                "Authorization": f"Bearer {api_key}",
            },
            payload={
                "model": DEFAULT_OPENAI_EMBEDDING_MODEL,
                "input": batch,
            },
            error_prefix="OpenAI embedding 请求失败",
        )
        embeddings.extend(parse_embeddings_response(response, expected_count=len(batch)))

    return embeddings


def create_local_development_embedding(text: str) -> list[float]:
    normalized = unicodedata.normalize("NFKC", text).casefold()
    units = [char for char in normalized if not char.isspace()]
    vector = [0.0] * DEFAULT_LOCAL_EMBEDDING_DIMENSION

    if not units:
        vector[0] = 1.0
        return vector

    for size, weight in ((1, 1.0), (2, 1.5), (3, 2.0)):
        if len(units) < size:
            continue

        for start in range(0, len(units) - size + 1):
            feature = "".join(units[start : start + size]).encode("utf-8")
            digest = hashlib.sha256(feature).digest()

            for projection in range(4):
                offset = projection * 2
                index = int.from_bytes(digest[offset : offset + 2], "big") % DEFAULT_LOCAL_EMBEDDING_DIMENSION
                sign = 1.0 if digest[8 + projection] % 2 == 0 else -1.0
                vector[index] += weight * sign

    norm = math.sqrt(sum(value * value for value in vector))
    if norm <= 0:
        vector[0] = 1.0
        return vector

    return [value / norm for value in vector]


def iter_embedding_batches(texts: list[str], batch_size: int) -> list[list[str]]:
    if batch_size <= 0:
        raise IndexerError("embedding_batch_size 必须大于 0")

    return [texts[start : start + batch_size] for start in range(0, len(texts), batch_size)]


def parse_embeddings_response(response: Any, *, expected_count: int) -> list[list[float]]:
    data = response.get("data") if isinstance(response, dict) else None
    if not isinstance(data, list):
        raise IndexerError("OpenAI embedding 响应缺少 data")

    if len(data) != expected_count:
        raise IndexerError("OpenAI embedding 响应数量与请求不一致")

    embeddings: list[list[float]] = []
    for item in data:
        embedding = item.get("embedding") if isinstance(item, dict) else None
        if not isinstance(embedding, list):
            raise IndexerError("OpenAI embedding 响应缺少 embedding")
        embeddings.append([float(value) for value in embedding])

    return embeddings


def ensure_collection(name: str) -> dict[str, Any]:
    cached = _COLLECTION_CACHE.get(name)
    if cached:
        return cached

    collections = request_json(
        build_chroma_database_url("/collections"),
        timeout_ms=DEFAULT_CHROMA_TIMEOUT_MS,
        error_prefix="Chroma collection 列表请求失败",
    )
    if isinstance(collections, list):
        existing = next(
            (
                collection
                for collection in collections
                if isinstance(collection, dict) and collection.get("name") == name
            ),
            None,
        )
        if isinstance(existing, dict):
            _COLLECTION_CACHE[name] = existing
            return existing

    try:
        created = request_json(
            build_chroma_database_url("/collections"),
            method="POST",
            timeout_ms=DEFAULT_CHROMA_TIMEOUT_MS,
            payload={"name": name},
            error_prefix="Chroma collection 创建失败",
        )
        if not isinstance(created, dict) or not isinstance(created.get("id"), str):
            raise IndexerError("Chroma collection 创建响应不合法")

        _COLLECTION_CACHE[name] = created
        return created
    except IndexerError:
        refreshed = request_json(
            build_chroma_database_url("/collections"),
            timeout_ms=DEFAULT_CHROMA_TIMEOUT_MS,
            error_prefix="Chroma collection 列表请求失败",
        )
        if isinstance(refreshed, list):
            existing = next(
                (
                    collection
                    for collection in refreshed
                    if isinstance(collection, dict) and collection.get("name") == name
                ),
                None,
            )
            if isinstance(existing, dict):
                _COLLECTION_CACHE[name] = existing
                return existing

        raise


def delete_document_chunks(collection_id: str, document_id: str) -> None:
    request_json(
        build_chroma_database_url(f"/collections/{collection_id}/delete"),
        method="POST",
        timeout_ms=DEFAULT_CHROMA_TIMEOUT_MS,
        payload={
            "where": {
                "documentId": document_id,
            }
        },
        error_prefix="Chroma 文档向量删除失败",
    )


def upsert_chunk_records(
    collection_id: str,
    chunks: list[ChunkRecord],
    embeddings: list[list[float]],
) -> None:
    request_json(
        build_chroma_database_url(f"/collections/{collection_id}/upsert"),
        method="POST",
        timeout_ms=DEFAULT_CHROMA_TIMEOUT_MS,
        payload={
            "ids": [chunk.chunk_id for chunk in chunks],
            "documents": [chunk.text for chunk in chunks],
            "embeddings": embeddings,
            "metadatas": [chunk.metadata for chunk in chunks],
        },
        error_prefix="Chroma 文档向量写入失败",
    )


def build_api_url(base_url: str, path: str) -> str:
    normalized_base = base_url if base_url.endswith("/") else f"{base_url}/"
    return urllib_parse.urljoin(normalized_base, path.lstrip("/"))


def build_chroma_database_url(path: str) -> str:
    chroma_url = read_optional_string("CHROMA_URL")
    if not chroma_url:
        raise IndexerError("CHROMA_URL 未配置，无法写入向量索引")

    return build_api_url(
        chroma_url,
        f"/api/v2/tenants/{DEFAULT_CHROMA_TENANT}/databases/{DEFAULT_CHROMA_DATABASE}{path}",
    )


def request_json(
    url: str,
    *,
    method: str = "GET",
    timeout_ms: int,
    payload: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    error_prefix: str,
) -> Any:
    request_headers = {
        "Accept": "application/json",
        **(headers or {}),
    }

    data = None
    if payload is not None:
        request_headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")

    request = urllib_request.Request(
        url,
        data=data,
        headers=request_headers,
        method=method,
    )

    try:
        with urllib_request.urlopen(request, timeout=timeout_ms / 1000) as response:
            body = response.read().decode("utf-8")
            if not body:
                return None
            return json.loads(body)
    except urllib_error.HTTPError as error:
        body = error.read().decode("utf-8")
        message = f"{error_prefix}（HTTP {error.code}）"

        if body:
            try:
                payload = json.loads(body)
                if isinstance(payload, dict):
                    detail = payload.get("errorMessage") or payload.get("message")
                    if isinstance(detail, str) and detail.strip():
                        message = f"{message}: {detail.strip()}"
            except json.JSONDecodeError:
                message = f"{message}: {body.strip()}"

        raise IndexerError(message) from error
    except (urllib_error.URLError, TimeoutError) as error:
        raise IndexerError(f"{error_prefix}: {error}") from error


def detect_parser_name(file_name: str) -> str:
    extension = Path(file_name).suffix.lower()
    if extension in {".md", ".markdown"}:
        return "markdown"

    return "text"
