from __future__ import annotations

from fastapi.testclient import TestClient

from app.domain.indexing.pipeline import IndexerError
from app.main import app
from app.schemas.indexing import IndexDocumentSuccessResponse, IndexerDiagnosticsResponse
from app.services.indexing_service import IndexingService, get_indexing_service


client = TestClient(app, raise_server_exceptions=False)


class StubIndexingService(IndexingService):
    def __init__(
        self,
        *,
        index_behavior=None,
        rebuild_behavior=None,
        diagnostics_behavior=None,
    ):
        self._index_behavior = index_behavior
        self._rebuild_behavior = rebuild_behavior
        self._diagnostics_behavior = diagnostics_behavior

    def index_document(self, payload):  # type: ignore[override]
        if self._index_behavior is None:
            raise AssertionError("index_document should not be called in this test")
        return self._index_behavior(payload)

    def rebuild_document(self, document_id, payload):  # type: ignore[override]
        if self._rebuild_behavior is None:
            raise AssertionError("rebuild_document should not be called in this test")
        return self._rebuild_behavior(document_id, payload)

    def get_diagnostics(self):  # type: ignore[override]
        if self._diagnostics_behavior is None:
            raise AssertionError("get_diagnostics should not be called in this test")
        return self._diagnostics_behavior()


def override_indexing_service(
    *,
    index_behavior=None,
    rebuild_behavior=None,
    diagnostics_behavior=None,
):
    app.dependency_overrides[get_indexing_service] = lambda: StubIndexingService(
        index_behavior=index_behavior,
        rebuild_behavior=rebuild_behavior,
        diagnostics_behavior=diagnostics_behavior,
    )


def clear_overrides():
    app.dependency_overrides.clear()


def test_health_returns_current_service_metadata():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "knowject-indexer-py",
        "chunkSize": 1000,
        "chunkOverlap": 200,
        "supportedFormats": ["md", "txt"],
    }


def test_docs_endpoints_are_available():
    assert client.get("/docs").status_code == 200
    assert client.get("/redoc").status_code == 200
    assert client.get("/openapi.json").status_code == 200


def test_index_documents_success_response_keeps_existing_shape():
    override_indexing_service(
        index_behavior=lambda _payload: IndexDocumentSuccessResponse(
            status="completed",
            knowledge_id="knowledge-1",
            document_id="document-1",
            chunk_count=2,
            character_count=42,
            parser="markdown",
            collection_name="global_docs",
        )
    )

    try:
        response = client.post(
            "/internal/v1/index/documents",
            json={
                "knowledgeId": "knowledge-1",
                "documentId": "document-1",
                "sourceType": "global_docs",
                "fileName": "demo.md",
                "mimeType": "text/markdown",
                "storagePath": "/tmp/demo.md",
                "documentVersionHash": "hash-1",
            },
        )
    finally:
        clear_overrides()

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


def test_legacy_index_documents_route_still_works_for_backward_compatibility():
    override_indexing_service(
        index_behavior=lambda _payload: IndexDocumentSuccessResponse(
            status="completed",
            knowledge_id="knowledge-1",
            document_id="document-1",
            chunk_count=1,
            character_count=21,
            parser="text",
            collection_name="global_docs",
        )
    )

    try:
        response = client.post(
            "/internal/index-documents",
            json={
                "knowledgeId": "knowledge-1",
                "documentId": "document-1",
                "sourceType": "global_docs",
                "fileName": "demo.txt",
                "mimeType": "text/plain",
                "storagePath": "/tmp/demo.txt",
                "documentVersionHash": "hash-1",
            },
        )
    finally:
        clear_overrides()

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


def test_index_documents_returns_unified_failure_for_invalid_json():
    response = client.post(
        "/internal/v1/index/documents",
        content="{",
        headers={"content-type": "application/json"},
    )

    assert response.status_code == 400
    assert response.json() == {
        "status": "failed",
        "errorMessage": "请求体必须是合法 JSON",
    }


def test_index_documents_returns_unified_failure_for_non_object_body():
    response = client.post(
        "/internal/v1/index/documents",
        json=["not", "an", "object"],
    )

    assert response.status_code == 400
    assert response.json() == {
        "status": "failed",
        "errorMessage": "请求体必须是 JSON object",
    }


def test_index_documents_returns_unified_failure_for_missing_field():
    response = client.post(
        "/internal/v1/index/documents",
        json={
            "documentId": "document-1",
            "sourceType": "global_docs",
            "fileName": "demo.md",
            "mimeType": "text/markdown",
            "storagePath": "/tmp/demo.md",
            "documentVersionHash": "hash-1",
        },
    )

    assert response.status_code == 400
    assert response.json() == {
        "status": "failed",
        "errorMessage": "knowledgeId 缺失或格式不合法",
    }


def test_index_documents_maps_indexer_error_to_failed_response():
    override_indexing_service(
        index_behavior=lambda _payload: (_ for _ in ()).throw(IndexerError("boom"))
    )

    try:
        response = client.post(
            "/internal/v1/index/documents",
            json={
                "knowledgeId": "knowledge-1",
                "documentId": "document-1",
                "sourceType": "global_docs",
                "fileName": "demo.md",
                "mimeType": "text/markdown",
                "storagePath": "/tmp/demo.md",
                "documentVersionHash": "hash-1",
            },
        )
    finally:
        clear_overrides()

    assert response.status_code == 422
    assert response.json() == {
        "status": "failed",
        "errorMessage": "boom",
    }


def test_index_documents_maps_unexpected_error_to_failed_response():
    override_indexing_service(
        index_behavior=lambda _payload: (_ for _ in ()).throw(RuntimeError("boom"))
    )

    try:
        response = client.post(
            "/internal/v1/index/documents",
            json={
                "knowledgeId": "knowledge-1",
                "documentId": "document-1",
                "sourceType": "global_docs",
                "fileName": "demo.md",
                "mimeType": "text/markdown",
                "storagePath": "/tmp/demo.md",
                "documentVersionHash": "hash-1",
            },
        )
    finally:
        clear_overrides()

    assert response.status_code == 500
    assert response.json() == {
        "status": "failed",
        "errorMessage": "Python indexer 内部错误: boom",
    }


def test_rebuild_document_uses_document_scoped_internal_route():
    override_indexing_service(
        rebuild_behavior=lambda document_id, payload: IndexDocumentSuccessResponse(
            status="completed",
            knowledge_id=payload.knowledge_id,
            document_id=document_id,
            chunk_count=3,
            character_count=64,
            parser="markdown",
            collection_name="global_docs",
        )
    )

    try:
        response = client.post(
            "/internal/v1/index/documents/document-1/rebuild",
            json={
                "knowledgeId": "knowledge-1",
                "documentId": "document-1",
                "sourceType": "global_docs",
                "fileName": "demo.md",
                "mimeType": "text/markdown",
                "storagePath": "/tmp/demo.md",
                "documentVersionHash": "hash-1",
            },
        )
    finally:
        clear_overrides()

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


def test_index_diagnostics_returns_current_runtime_state():
    override_indexing_service(
        diagnostics_behavior=lambda: IndexerDiagnosticsResponse(
            status="degraded",
            service="knowject-indexer-py",
            chunk_size=1000,
            chunk_overlap=200,
            supported_formats=["md", "txt"],
            embedding_provider="local_dev",
            chroma_reachable=False,
            error_message="Chroma 诊断失败: connection refused",
        )
    )

    try:
        response = client.get("/internal/v1/index/diagnostics")
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json() == {
        "status": "degraded",
        "service": "knowject-indexer-py",
        "chunkSize": 1000,
        "chunkOverlap": 200,
        "supportedFormats": ["md", "txt"],
        "embeddingProvider": "local_dev",
        "chromaReachable": False,
        "errorMessage": "Chroma 诊断失败: connection refused",
    }
