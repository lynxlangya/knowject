from __future__ import annotations

from fastapi.testclient import TestClient

from app.domain.indexing.pipeline import IndexerError
from app.main import app
from app.schemas.indexing import IndexDocumentSuccessResponse
from app.services.indexing_service import IndexingService, get_indexing_service


client = TestClient(app, raise_server_exceptions=False)


class StubIndexingService(IndexingService):
    def __init__(self, behavior):
        self._behavior = behavior

    def index_document(self, payload):  # type: ignore[override]
        return self._behavior(payload)


def override_indexing_service(behavior):
    app.dependency_overrides[get_indexing_service] = lambda: StubIndexingService(behavior)


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
        lambda _payload: IndexDocumentSuccessResponse(
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
        lambda _payload: IndexDocumentSuccessResponse(
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
    override_indexing_service(lambda _payload: (_ for _ in ()).throw(IndexerError("boom")))

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
    override_indexing_service(lambda _payload: (_ for _ in ()).throw(RuntimeError("boom")))

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
