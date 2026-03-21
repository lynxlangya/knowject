from __future__ import annotations

import json
from dataclasses import dataclass
from http.client import IncompleteRead
from typing import Any
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from app.core.runtime_env import read_optional_positive_integer, read_optional_string
from app.domain.indexing.chroma_client import ChromaClient
from app.domain.indexing.chunking import ChunkBlock, ChunkBuilder, ChunkRecord, SegmentChunk
from app.domain.indexing.diagnostics import DiagnosticsCollector
from app.domain.indexing.embedding_client import (
    DEFAULT_LOCAL_EMBEDDING_DIMENSION,
    DEFAULT_OPENAI_BASE_URL,
    DEFAULT_OPENAI_EMBEDDING_BATCH_SIZE,
    DEFAULT_OPENAI_EMBEDDING_MODEL,
    DEFAULT_OPENAI_TIMEOUT_MS,
    EmbeddingClient,
    EmbeddingRuntimeConfig,
)
from app.domain.indexing.parser import DocumentParser
from app.domain.indexing.segments import ParsedSegment
from app.domain.indexing.runtime_config import (
    DEFAULT_CHUNK_OVERLAP,
    DEFAULT_CHUNK_SIZE,
    DEFAULT_INDEXER_REQUEST_TIMEOUT_MS,
    SUPPORTED_EXTENSIONS,
    SUPPORTED_FORMAT_LABELS,
    IndexingRuntimeConfig,
    IndexingRuntimeConfigResolver,
)

DEFAULT_CHROMA_TIMEOUT_MS = read_optional_positive_integer("CHROMA_TIMEOUT_MS", 15000)
DEFAULT_HTTP_READ_RETRY_ATTEMPTS = 3
DEFAULT_CHROMA_TENANT = read_optional_string("CHROMA_TENANT") or "default_tenant"
DEFAULT_CHROMA_DATABASE = read_optional_string("CHROMA_DATABASE") or "default_database"
COLLECTION_NAME_BY_SOURCE_TYPE = {
    "global_docs": "global_docs",
    "global_code": "global_code",
}


class IndexerError(Exception):
    pass


class ResponseReadInterruptedError(Exception):
    def __init__(self, *, partial_body: str, bytes_read: int, bytes_remaining: int | None):
        super().__init__("response read interrupted")
        self.partial_body = partial_body
        self.bytes_read = bytes_read
        self.bytes_remaining = bytes_remaining


@dataclass(frozen=True)
class IndexDocumentRequest:
    knowledge_id: str
    document_id: str
    source_type: str
    collection_name: str
    file_name: str
    mime_type: str
    storage_path: str
    document_version_hash: str
    embedding_config: EmbeddingRuntimeConfig
    indexing_config: IndexingRuntimeConfig


@dataclass(frozen=True)
class DeleteChunksRequest:
    collection_name: str


_CHROMA_CLIENT: ChromaClient | None = None


def process_document(request: IndexDocumentRequest) -> dict[str, Any]:
    segments = parse_document_segments(request)
    if not segments:
        raise IndexerError("文档清洗后内容为空，无法分块")

    segment_chunks = build_segment_chunks(
        segments,
        chunk_size=request.indexing_config.chunk_size,
        overlap=request.indexing_config.chunk_overlap,
    )

    if not segment_chunks:
        raise IndexerError("文档未生成有效分块")

    chunk_records = build_chunk_records_from_segment_chunks(request, segment_chunks)
    collection = ensure_collection(request.collection_name)
    embeddings = create_embeddings(
        [chunk.text for chunk in chunk_records],
        request.embedding_config,
    )
    delete_document_chunks(collection["name"], request.document_id)
    upsert_chunk_records(collection["name"], chunk_records, embeddings)

    return {
        "status": "completed",
        "knowledgeId": request.knowledge_id,
        "documentId": request.document_id,
        "chunkCount": len(chunk_records),
        "characterCount": count_segment_characters(segments),
        "parser": detect_parser_name(request.file_name),
        "collectionName": collection["name"],
    }


def delete_document_vectors(document_id: str, request: DeleteChunksRequest) -> dict[str, Any]:
    delete_chunks_by_where(
        request.collection_name,
        {"documentId": document_id},
        error_prefix="Chroma 文档向量删除失败",
    )

    return {
        "status": "completed",
        "documentId": document_id,
        "collectionName": request.collection_name,
    }


def delete_knowledge_vectors(knowledge_id: str, request: DeleteChunksRequest) -> dict[str, Any]:
    delete_chunks_by_where(
        request.collection_name,
        {"knowledgeId": knowledge_id},
        error_prefix="Chroma 知识库向量删除失败",
    )

    return {
        "status": "completed",
        "knowledgeId": knowledge_id,
        "collectionName": request.collection_name,
    }


def build_index_document_request(
    *,
    knowledge_id: str,
    document_id: str,
    source_type: str,
    collection_name: str | None,
    file_name: str,
    mime_type: str,
    storage_path: str,
    document_version_hash: str,
    embedding_config: EmbeddingRuntimeConfig | None = None,
    indexing_config: IndexingRuntimeConfig | None = None,
) -> IndexDocumentRequest:
    normalized_source_type = read_required_string_field(source_type, "sourceType")

    return IndexDocumentRequest(
        knowledge_id=read_required_string_field(knowledge_id, "knowledgeId"),
        document_id=read_required_string_field(document_id, "documentId"),
        source_type=normalized_source_type,
        collection_name=resolve_request_collection_name(
            source_type=normalized_source_type,
            collection_name=collection_name,
        ),
        file_name=read_required_string_field(file_name, "fileName"),
        mime_type=read_required_string_field(mime_type, "mimeType"),
        storage_path=read_required_string_field(storage_path, "storagePath"),
        document_version_hash=read_required_string_field(
            document_version_hash,
            "documentVersionHash",
        ),
        embedding_config=embedding_config or build_embedding_runtime_config(),
        indexing_config=indexing_config or build_indexing_runtime_config(),
    )


def build_delete_chunks_request(*, collection_name: str) -> DeleteChunksRequest:
    return DeleteChunksRequest(
        collection_name=read_required_string_field(collection_name, "collectionName"),
    )


def parse_document_text(request: IndexDocumentRequest) -> str:
    return create_document_parser().parse_document_text(request)


def parse_document_segments(request: IndexDocumentRequest) -> list[ParsedSegment]:
    return create_document_parser().parse_document_segments(request)


def clean_text(text: str) -> str:
    return create_document_parser().clean_text(text)


def build_chunks(text: str, chunk_size: int, overlap: int) -> list[str]:
    return create_chunk_builder().build_chunks(text, chunk_size, overlap)


def split_blocks(text: str, chunk_size: int, overlap: int) -> list[ChunkBlock]:
    return create_chunk_builder().split_blocks(text, chunk_size, overlap)


def split_large_block(block: str, chunk_size: int, overlap: int) -> list[ChunkBlock]:
    return create_chunk_builder().split_large_block(block, chunk_size, overlap)


def join_chunk(prefix: str, blocks: list[str]) -> str:
    return create_chunk_builder().join_chunk(prefix, blocks)


def build_chunk_records(
    request: IndexDocumentRequest,
    chunk_texts: list[str],
) -> list[ChunkRecord]:
    return create_chunk_builder().build_chunk_records(request, chunk_texts)


def build_segment_chunks(
    segments: list[ParsedSegment],
    chunk_size: int,
    overlap: int,
) -> list[SegmentChunk]:
    return create_chunk_builder().build_segment_chunks(segments, chunk_size, overlap)


def build_chunk_records_from_segment_chunks(
    request: IndexDocumentRequest,
    segment_chunks: list[SegmentChunk],
) -> list[ChunkRecord]:
    return create_chunk_builder().build_chunk_records_from_segment_chunks(
        request,
        segment_chunks,
    )


def build_chunk_records_from_segments(
    request: IndexDocumentRequest,
    segments: list[ParsedSegment],
    *,
    chunk_size: int,
    overlap: int,
) -> list[ChunkRecord]:
    segment_chunks = build_segment_chunks(segments, chunk_size=chunk_size, overlap=overlap)
    return build_chunk_records_from_segment_chunks(request, segment_chunks)


def count_segment_characters(segments: list[ParsedSegment]) -> int:
    return len("\n\n".join(segment.text for segment in segments).strip())


def resolve_collection_name(source_type: str) -> str:
    collection_name = COLLECTION_NAME_BY_SOURCE_TYPE.get(source_type)
    if not collection_name:
        raise IndexerError(f"当前暂不支持 {source_type} 索引命名空间")
    return collection_name


def resolve_request_collection_name(*, source_type: str, collection_name: str | None) -> str:
    if collection_name is None:
        return resolve_collection_name(source_type)

    return read_required_string_field(collection_name, "collectionName")


def build_embedding_runtime_config(
    *,
    provider: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> EmbeddingRuntimeConfig:
    return create_embedding_client().build_runtime_config(
        provider=provider,
        api_key=api_key,
        base_url=base_url,
        model=model,
    )


def build_indexing_runtime_config(
    *,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
    supported_types: list[str] | None = None,
    indexer_timeout_ms: int | None = None,
) -> IndexingRuntimeConfig:
    return create_indexing_runtime_config_resolver().build_runtime_config(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        supported_types=supported_types,
        indexer_timeout_ms=indexer_timeout_ms,
    )


def parse_supported_types(raw_value: Any) -> list[str]:
    return create_indexing_runtime_config_resolver().parse_supported_types(raw_value)


def resolve_supported_extensions(supported_types: tuple[str, ...]) -> set[str]:
    return create_indexing_runtime_config_resolver().resolve_supported_extensions(
        supported_types
    )


def read_required_string_field(value: Any, field_name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise IndexerError(f"{field_name} 缺失或格式不合法")

    return value.strip()


def resolve_embedding_provider() -> tuple[str, str | None]:
    return create_embedding_client().resolve_embedding_provider()


def merge_diagnostic_error(current: str | None, message: str | None) -> str | None:
    return create_diagnostics_collector().merge_diagnostic_error(current, message)


def collect_diagnostics() -> dict[str, Any]:
    return create_diagnostics_collector().collect_diagnostics()


def create_embeddings(
    texts: list[str],
    embedding_config: EmbeddingRuntimeConfig | None = None,
) -> list[list[float]]:
    return create_embedding_client().create_embeddings(
        texts,
        embedding_config,
    )


def create_local_development_embedding(text: str) -> list[float]:
    return create_embedding_client().create_local_development_embedding(text)


def iter_embedding_batches(texts: list[str], batch_size: int) -> list[list[str]]:
    return create_embedding_client().iter_embedding_batches(texts, batch_size)


def parse_embeddings_response(response: Any, *, expected_count: int) -> list[list[float]]:
    return create_embedding_client().parse_embeddings_response(
        response,
        expected_count=expected_count,
    )


def create_embedding_client() -> EmbeddingClient:
    return EmbeddingClient(
        request_json=lambda url, **kwargs: request_json(url, **kwargs),
        build_api_url=build_api_url,
        read_optional_string=read_optional_string,
        error_factory=IndexerError,
    )


def create_indexing_runtime_config_resolver() -> IndexingRuntimeConfigResolver:
    return IndexingRuntimeConfigResolver(error_factory=IndexerError)


def create_document_parser() -> DocumentParser:
    return DocumentParser(
        resolve_supported_extensions=resolve_supported_extensions,
        error_factory=IndexerError,
    )


def create_chunk_builder() -> ChunkBuilder:
    return ChunkBuilder(error_factory=IndexerError)


def create_diagnostics_collector() -> DiagnosticsCollector:
    return DiagnosticsCollector(
        request_json=lambda url, **kwargs: request_json(url, **kwargs),
        build_chroma_database_url=build_chroma_database_url,
        resolve_embedding_provider=resolve_embedding_provider,
        handled_error_type=IndexerError,
        chunk_size=DEFAULT_CHUNK_SIZE,
        chunk_overlap=DEFAULT_CHUNK_OVERLAP,
        supported_formats=list(SUPPORTED_FORMAT_LABELS),
    )


def find_collection(
    name: str,
    *,
    bypass_cache: bool = False,
) -> dict[str, Any] | None:
    return get_chroma_client().find_collection(name, bypass_cache=bypass_cache)


def ensure_collection(name: str) -> dict[str, Any]:
    try:
        return get_chroma_client().ensure_collection(name)
    except ValueError as error:
        raise IndexerError(str(error)) from error


def delete_chunks_by_where(
    collection_name: str,
    where: dict[str, Any],
    *,
    error_prefix: str,
) -> None:
    get_chroma_client().delete_chunks_by_where(
        collection_name,
        where,
        error_prefix=error_prefix,
    )


def delete_document_chunks(collection_name: str, document_id: str) -> None:
    get_chroma_client().delete_document_chunks(collection_name, document_id)


def upsert_chunk_records(
    collection_name: str,
    chunks: list[ChunkRecord],
    embeddings: list[list[float]],
) -> None:
    get_chroma_client().upsert_chunk_records(collection_name, chunks, embeddings)


def get_chroma_client() -> ChromaClient:
    global _CHROMA_CLIENT
    if _CHROMA_CLIENT is None:
        _CHROMA_CLIENT = ChromaClient(
            request_json=lambda url, **kwargs: request_json(url, **kwargs),
            build_database_url=build_chroma_database_url,
            timeout_ms=DEFAULT_CHROMA_TIMEOUT_MS,
        )

    return _CHROMA_CLIENT


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

    def format_interrupted_read_message(error: ResponseReadInterruptedError) -> str:
        if error.bytes_remaining is None:
            return f"{error_prefix}: 上游响应读取中断（已读 {error.bytes_read} bytes）"

        return (
            f"{error_prefix}: 上游响应读取中断（已读 {error.bytes_read} bytes，"
            f"仍缺 {error.bytes_remaining} bytes）"
        )

    def parse_json_body(body: str) -> Any:
        if not body:
            return None

        try:
            return json.loads(body)
        except json.JSONDecodeError as error:
            raise IndexerError(f"{error_prefix}: 上游响应不是合法 JSON") from error

    def read_response_body(response: Any) -> str:
        try:
            return response.read().decode("utf-8")
        except IncompleteRead as error:
            partial = error.partial.decode("utf-8", errors="replace")
            raise ResponseReadInterruptedError(
                partial_body=partial,
                bytes_read=len(error.partial),
                bytes_remaining=error.expected,
            ) from error

    for attempt in range(DEFAULT_HTTP_READ_RETRY_ATTEMPTS):
        request = urllib_request.Request(
            url,
            data=data,
            headers=request_headers,
            method=method,
        )

        try:
            with urllib_request.urlopen(request, timeout=timeout_ms / 1000) as response:
                try:
                    body = read_response_body(response)
                except ResponseReadInterruptedError as error:
                    if error.partial_body:
                        try:
                            return parse_json_body(error.partial_body)
                        except IndexerError:
                            pass

                    if attempt < DEFAULT_HTTP_READ_RETRY_ATTEMPTS - 1:
                        continue

                    raise IndexerError(format_interrupted_read_message(error)) from error

                return parse_json_body(body)
        except urllib_error.HTTPError as error:
            try:
                body = read_response_body(error)
            except ResponseReadInterruptedError as read_error:
                if attempt < DEFAULT_HTTP_READ_RETRY_ATTEMPTS - 1:
                    continue

                message = f"{error_prefix}（HTTP {error.code}）"
                raise IndexerError(
                    f"{message}: 上游响应读取中断（已读 {read_error.bytes_read} bytes，"
                    f"仍缺 {read_error.bytes_remaining} bytes）"
                ) from read_error

            message = f"{error_prefix}（HTTP {error.code}）"

            if body:
                try:
                    response_payload = json.loads(body)
                    if isinstance(response_payload, dict):
                        detail = response_payload.get("errorMessage") or response_payload.get("message")
                        if isinstance(detail, str) and detail.strip():
                            message = f"{message}: {detail.strip()}"
                except json.JSONDecodeError:
                    message = f"{message}: {body.strip()}"

            raise IndexerError(message) from error
        except (urllib_error.URLError, TimeoutError) as error:
            raise IndexerError(f"{error_prefix}: {error}") from error

    raise IndexerError(f"{error_prefix}: 未知响应读取失败")


def detect_parser_name(file_name: str) -> str:
    return create_document_parser().detect_parser_name(file_name)
