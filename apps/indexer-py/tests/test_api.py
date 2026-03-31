from __future__ import annotations

import importlib

import pytest
from fastapi.testclient import TestClient

def build_storage_path(file_name: str) -> str:
    return f"fixtures/{file_name}"


def build_index_document_success_response(
    *,
    knowledge_id: str,
    document_id: str,
    chunk_count: int,
    character_count: int,
    parser: str,
    collection_name: str,
) -> dict[str, object]:
    return {
        "status": "completed",
        "knowledge_id": knowledge_id,
        "document_id": document_id,
        "chunk_count": chunk_count,
        "character_count": character_count,
        "parser": parser,
        "collection_name": collection_name,
    }


def build_delete_document_success_response(
    *,
    document_id: str,
    collection_name: str,
) -> dict[str, object]:
    return {
        "status": "completed",
        "document_id": document_id,
        "collection_name": collection_name,
    }


def build_delete_knowledge_success_response(
    *,
    knowledge_id: str,
    collection_name: str,
) -> dict[str, object]:
    return {
        "status": "completed",
        "knowledge_id": knowledge_id,
        "collection_name": collection_name,
    }


def build_indexer_diagnostics_response(
    *,
    status: str,
    embedding_provider: str,
    chroma_reachable: bool,
    error_message: str | None,
) -> dict[str, object]:
    return {
        "status": status,
        "service": "knowject-indexer-py",
        "chunk_size": 1000,
        "chunk_overlap": 200,
        "supported_formats": ["md", "txt", "pdf", "docx", "xlsx"],
        "embedding_provider": embedding_provider,
        "chroma_reachable": chroma_reachable,
        "error_message": error_message,
    }


class StubIndexingService:
    def __init__(
        self,
        *,
        index_behavior=None,
        rebuild_behavior=None,
        delete_document_behavior=None,
        delete_knowledge_behavior=None,
        diagnostics_behavior=None,
    ):
        self._index_behavior = index_behavior
        self._rebuild_behavior = rebuild_behavior
        self._delete_document_behavior = delete_document_behavior
        self._delete_knowledge_behavior = delete_knowledge_behavior
        self._diagnostics_behavior = diagnostics_behavior

    def index_document(self, payload):
        if self._index_behavior is None:
            raise AssertionError("index_document should not be called in this test")
        return self._index_behavior(payload)

    def rebuild_document(self, document_id, payload):
        if self._rebuild_behavior is None:
            raise AssertionError("rebuild_document should not be called in this test")
        return self._rebuild_behavior(document_id, payload)

    def delete_document_chunks(self, document_id, payload):
        if self._delete_document_behavior is None:
            raise AssertionError("delete_document_chunks should not be called in this test")
        return self._delete_document_behavior(document_id, payload)

    def delete_knowledge_chunks(self, knowledge_id, payload):
        if self._delete_knowledge_behavior is None:
            raise AssertionError("delete_knowledge_chunks should not be called in this test")
        return self._delete_knowledge_behavior(knowledge_id, payload)

    def get_diagnostics(self):
        if self._diagnostics_behavior is None:
            raise AssertionError("get_diagnostics should not be called in this test")
        return self._diagnostics_behavior()


def override_indexing_service(
    test_client: TestClient,
    *,
    index_behavior=None,
    rebuild_behavior=None,
    delete_document_behavior=None,
    delete_knowledge_behavior=None,
    diagnostics_behavior=None,
):
    from app.services.indexing_service import get_indexing_service

    test_client.app.dependency_overrides[get_indexing_service] = lambda: StubIndexingService(
        index_behavior=index_behavior,
        rebuild_behavior=rebuild_behavior,
        delete_document_behavior=delete_document_behavior,
        delete_knowledge_behavior=delete_knowledge_behavior,
        diagnostics_behavior=diagnostics_behavior,
    )


def clear_overrides(test_client: TestClient):
    test_client.app.dependency_overrides.clear()


def test_health_returns_current_service_metadata(indexer_test_client: TestClient):
    response = indexer_test_client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "knowject-indexer-py",
        "chunkSize": 1000,
        "chunkOverlap": 200,
        "supportedFormats": ["md", "txt", "pdf", "docx", "xlsx"],
    }


def test_docs_endpoints_are_available(indexer_test_client: TestClient):
    assert indexer_test_client.get("/docs").status_code == 200
    assert indexer_test_client.get("/redoc").status_code == 200
    assert indexer_test_client.get("/openapi.json").status_code == 200


def test_internal_routes_allow_development_without_token(
    create_indexer_test_client,
):
    test_client = create_indexer_test_client(node_env="development")
    override_indexing_service(
        test_client,
        diagnostics_behavior=lambda: build_indexer_diagnostics_response(
            status="ok",
            embedding_provider="openai",
            chroma_reachable=True,
            error_message=None,
        ),
    )

    try:
        response = test_client.get("/internal/v1/index/diagnostics")
    finally:
        clear_overrides(test_client)

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "knowject-indexer-py",
        "chunkSize": 1000,
        "chunkOverlap": 200,
        "supportedFormats": ["md", "txt", "pdf", "docx", "xlsx"],
        "embeddingProvider": "openai",
        "chromaReachable": True,
        "errorMessage": None,
    }


def test_create_app_requires_internal_token_outside_development(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("NODE_ENV", "development")
    app_factory = importlib.import_module("app.app_factory")

    monkeypatch.setenv("NODE_ENV", "production")
    monkeypatch.delenv("KNOWLEDGE_INDEXER_INTERNAL_TOKEN", raising=False)
    monkeypatch.delenv("KNOWLEDGE_INDEXER_INTERNAL_TOKEN_FILE", raising=False)

    with pytest.raises(
        RuntimeError,
        match="KNOWLEDGE_INDEXER_INTERNAL_TOKEN is required when NODE_ENV is not development",
    ):
        app_factory.create_app(load_env_files=False)


def test_index_documents_success_response_keeps_existing_shape(indexer_test_client: TestClient):
    override_indexing_service(
        indexer_test_client,
        index_behavior=lambda _payload: build_index_document_success_response(
            knowledge_id="knowledge-1",
            document_id="document-1",
            chunk_count=2,
            character_count=42,
            parser="markdown",
            collection_name="global_docs",
        ),
    )

    try:
        response = indexer_test_client.post(
            "/internal/v1/index/documents",
            json={
                "knowledgeId": "knowledge-1",
                "documentId": "document-1",
                "sourceType": "global_docs",
                "fileName": "demo.md",
                "mimeType": "text/markdown",
                "storagePath": build_storage_path("demo.md"),
                "documentVersionHash": "hash-1",
            },
        )
    finally:
        clear_overrides(indexer_test_client)

    assert response.status_code == 200
    assert response.json() == {
        "status": "completed",
        "knowledgeId": "knowledge-1",
        "documentId": "document-1",
        "chunkCount": 2,
        "characterCount": 42,
        "parser": "markdown",
        "collectionName": "global_docs",
    }


def test_legacy_index_documents_route_still_works_for_backward_compatibility(
    indexer_test_client: TestClient,
):
    override_indexing_service(
        indexer_test_client,
        index_behavior=lambda _payload: build_index_document_success_response(
            knowledge_id="knowledge-1",
            document_id="document-1",
            chunk_count=1,
            character_count=21,
            parser="text",
            collection_name="global_docs",
        ),
    )

    try:
        response = indexer_test_client.post(
            "/internal/index-documents",
            json={
                "knowledgeId": "knowledge-1",
                "documentId": "document-1",
                "sourceType": "global_docs",
                "fileName": "demo.txt",
                "mimeType": "text/plain",
                "storagePath": build_storage_path("demo.txt"),
                "documentVersionHash": "hash-1",
            },
        )
    finally:
        clear_overrides(indexer_test_client)

    assert response.status_code == 200
    assert response.json() == {
        "status": "completed",
        "knowledgeId": "knowledge-1",
        "documentId": "document-1",
        "chunkCount": 1,
        "characterCount": 21,
        "parser": "text",
        "collectionName": "global_docs",
    }


def test_internal_routes_require_bearer_token_when_configured(
    monkeypatch: pytest.MonkeyPatch,
    indexer_test_client: TestClient,
):
    monkeypatch.setenv("NODE_ENV", "development")
    monkeypatch.setenv("KNOWLEDGE_INDEXER_INTERNAL_TOKEN", "internal-secret")
    override_indexing_service(
        indexer_test_client,
        diagnostics_behavior=lambda: build_indexer_diagnostics_response(
            status="ok",
            embedding_provider="openai",
            chroma_reachable=True,
            error_message=None,
        ),
    )

    try:
        unauthorized = indexer_test_client.get("/internal/v1/index/diagnostics")
        authorized = indexer_test_client.get(
            "/internal/v1/index/diagnostics",
            headers={"authorization": "Bearer internal-secret"},
        )
    finally:
        clear_overrides(indexer_test_client)

    assert unauthorized.status_code == 401
    assert unauthorized.json() == {
        "status": "failed",
        "errorMessage": "Unauthorized internal request",
    }
    assert authorized.status_code == 200
    assert authorized.json() == {
        "status": "ok",
        "service": "knowject-indexer-py",
        "chunkSize": 1000,
        "chunkOverlap": 200,
        "supportedFormats": ["md", "txt", "pdf", "docx", "xlsx"],
        "embeddingProvider": "openai",
        "chromaReachable": True,
        "errorMessage": None,
    }


def test_index_documents_returns_unified_failure_for_invalid_json(
    indexer_test_client: TestClient,
):
    response = indexer_test_client.post(
        "/internal/v1/index/documents",
        content="{",
        headers={"content-type": "application/json"},
    )

    assert response.status_code == 400
    assert response.json() == {
        "status": "failed",
        "errorMessage": "请求体必须是合法 JSON",
    }


def test_index_documents_returns_unified_failure_for_non_object_body(
    indexer_test_client: TestClient,
):
    response = indexer_test_client.post(
        "/internal/v1/index/documents",
        json=["not", "an", "object"],
    )

    assert response.status_code == 400
    assert response.json() == {
        "status": "failed",
        "errorMessage": "请求体必须是 JSON object",
    }


def test_index_documents_returns_unified_failure_for_missing_field(
    indexer_test_client: TestClient,
):
    response = indexer_test_client.post(
        "/internal/v1/index/documents",
        json={
            "documentId": "document-1",
            "sourceType": "global_docs",
            "fileName": "demo.md",
            "mimeType": "text/markdown",
            "storagePath": build_storage_path("demo.md"),
            "documentVersionHash": "hash-1",
        },
    )

    assert response.status_code == 400
    assert response.json() == {
        "status": "failed",
        "errorMessage": "knowledgeId 缺失或格式不合法",
    }


def test_index_documents_maps_indexer_error_to_failed_response(
    indexer_test_client: TestClient,
):
    from app.domain.indexing.pipeline import IndexerError

    override_indexing_service(
        indexer_test_client,
        index_behavior=lambda _payload: (_ for _ in ()).throw(IndexerError("boom")),
    )

    try:
        response = indexer_test_client.post(
            "/internal/v1/index/documents",
            json={
                "knowledgeId": "knowledge-1",
                "documentId": "document-1",
                "sourceType": "global_docs",
                "fileName": "demo.md",
                "mimeType": "text/markdown",
                "storagePath": build_storage_path("demo.md"),
                "documentVersionHash": "hash-1",
            },
        )
    finally:
        clear_overrides(indexer_test_client)

    assert response.status_code == 422
    assert response.json() == {
        "status": "failed",
        "errorMessage": "boom",
    }


def test_index_documents_maps_unexpected_error_to_failed_response(
    indexer_test_client: TestClient,
):
    override_indexing_service(
        indexer_test_client,
        index_behavior=lambda _payload: (_ for _ in ()).throw(RuntimeError("boom")),
    )

    try:
        response = indexer_test_client.post(
            "/internal/v1/index/documents",
            json={
                "knowledgeId": "knowledge-1",
                "documentId": "document-1",
                "sourceType": "global_docs",
                "fileName": "demo.md",
                "mimeType": "text/markdown",
                "storagePath": build_storage_path("demo.md"),
                "documentVersionHash": "hash-1",
            },
        )
    finally:
        clear_overrides(indexer_test_client)

    assert response.status_code == 500
    assert response.json() == {
        "status": "failed",
        "errorMessage": "Python indexer 内部错误: boom",
    }


def test_index_documents_accepts_override_payload_fields(indexer_test_client: TestClient):
    captured: dict[str, object] = {}

    def index_behavior(payload):
        captured["embedding_provider"] = (
            payload.embedding_config.provider if payload.embedding_config else None
        )
        captured["embedding_model"] = (
            payload.embedding_config.model if payload.embedding_config else None
        )
        captured["chunk_size"] = (
            payload.indexing_config.chunk_size if payload.indexing_config else None
        )
        captured["chunk_overlap"] = (
            payload.indexing_config.chunk_overlap if payload.indexing_config else None
        )

        return build_index_document_success_response(
            knowledge_id=payload.knowledge_id,
            document_id=payload.document_id,
            chunk_count=1,
            character_count=12,
            parser="markdown",
            collection_name=payload.collection_name or "global_docs",
        )

    override_indexing_service(indexer_test_client, index_behavior=index_behavior)

    try:
        response = indexer_test_client.post(
            "/internal/v1/index/documents",
            json={
                "knowledgeId": "knowledge-1",
                "documentId": "document-1",
                "sourceType": "global_docs",
                "fileName": "demo.md",
                "mimeType": "text/markdown",
                "storagePath": build_storage_path("demo.md"),
                "documentVersionHash": "hash-1",
                "embeddingConfig": {
                    "provider": "custom",
                    "apiKey": "db-key",
                    "baseUrl": "https://embedding.example.com/v1",
                    "model": "text-embedding-custom",
                },
                "indexingConfig": {
                    "chunkSize": 860,
                    "chunkOverlap": 120,
                    "supportedTypes": ["md"],
                    "indexerTimeoutMs": 45000,
                },
            },
        )
    finally:
        clear_overrides(indexer_test_client)

    assert response.status_code == 200
    assert captured == {
        "embedding_provider": "custom",
        "embedding_model": "text-embedding-custom",
        "chunk_size": 860,
        "chunk_overlap": 120,
    }


def test_rebuild_document_uses_document_scoped_internal_route(
    indexer_test_client: TestClient,
):
    override_indexing_service(
        indexer_test_client,
        rebuild_behavior=lambda document_id, payload: build_index_document_success_response(
            knowledge_id=payload.knowledge_id,
            document_id=document_id,
            chunk_count=3,
            character_count=64,
            parser="markdown",
            collection_name="global_docs",
        ),
    )

    try:
        response = indexer_test_client.post(
            "/internal/v1/index/documents/document-1/rebuild",
            json={
                "knowledgeId": "knowledge-1",
                "documentId": "document-1",
                "sourceType": "global_docs",
                "fileName": "demo.md",
                "mimeType": "text/markdown",
                "storagePath": build_storage_path("demo.md"),
                "documentVersionHash": "hash-1",
            },
        )
    finally:
        clear_overrides(indexer_test_client)

    assert response.status_code == 200
    assert response.json() == {
        "status": "completed",
        "knowledgeId": "knowledge-1",
        "documentId": "document-1",
        "chunkCount": 3,
        "characterCount": 64,
        "parser": "markdown",
        "collectionName": "global_docs",
    }


def test_delete_document_chunks_uses_document_scoped_internal_route(
    indexer_test_client: TestClient,
):
    override_indexing_service(
        indexer_test_client,
        delete_document_behavior=lambda document_id, payload: build_delete_document_success_response(
            document_id=document_id,
            collection_name=payload.collection_name,
        ),
    )

    try:
        response = indexer_test_client.post(
            "/internal/v1/index/documents/document-1/delete",
            json={
                "collectionName": "global_docs",
            },
        )
    finally:
        clear_overrides(indexer_test_client)

    assert response.status_code == 200
    assert response.json() == {
        "status": "completed",
        "documentId": "document-1",
        "collectionName": "global_docs",
    }


def test_delete_knowledge_chunks_uses_knowledge_scoped_internal_route(
    indexer_test_client: TestClient,
):
    override_indexing_service(
        indexer_test_client,
        delete_knowledge_behavior=lambda knowledge_id, payload: build_delete_knowledge_success_response(
            knowledge_id=knowledge_id,
            collection_name=payload.collection_name,
        ),
    )

    try:
        response = indexer_test_client.post(
            "/internal/v1/index/knowledge/knowledge-1/delete",
            json={
                "collectionName": "proj_project-1_docs",
            },
        )
    finally:
        clear_overrides(indexer_test_client)

    assert response.status_code == 200
    assert response.json() == {
        "status": "completed",
        "knowledgeId": "knowledge-1",
        "collectionName": "proj_project-1_docs",
    }


def test_index_diagnostics_returns_current_runtime_state(indexer_test_client: TestClient):
    override_indexing_service(
        indexer_test_client,
        diagnostics_behavior=lambda: build_indexer_diagnostics_response(
            status="degraded",
            embedding_provider="local_dev",
            chroma_reachable=False,
            error_message="Chroma 诊断失败: connection refused",
        ),
    )

    try:
        response = indexer_test_client.get("/internal/v1/index/diagnostics")
    finally:
        clear_overrides(indexer_test_client)

    assert response.status_code == 200
    assert response.json() == {
        "status": "degraded",
        "service": "knowject-indexer-py",
        "chunkSize": 1000,
        "chunkOverlap": 200,
        "supportedFormats": ["md", "txt", "pdf", "docx", "xlsx"],
        "embeddingProvider": "local_dev",
        "chromaReachable": False,
        "errorMessage": "Chroma 诊断失败: connection refused",
    }
