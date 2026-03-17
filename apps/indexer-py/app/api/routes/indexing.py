from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.indexing import (
    DeleteChunksRequestPayload,
    DeleteDocumentChunksSuccessResponse,
    DeleteKnowledgeChunksSuccessResponse,
    IndexDocumentRequestPayload,
    IndexDocumentSuccessResponse,
    IndexerDiagnosticsResponse,
)
from app.services.indexing_service import IndexingService, get_indexing_service


router = APIRouter(tags=["indexing"])


def handle_index_document(
    payload: IndexDocumentRequestPayload,
    service: IndexingService,
) -> IndexDocumentSuccessResponse:
    return service.index_document(payload)


def handle_rebuild_document(
    document_id: str,
    payload: IndexDocumentRequestPayload,
    service: IndexingService,
) -> IndexDocumentSuccessResponse:
    return service.rebuild_document(document_id, payload)


def handle_delete_document_chunks(
    document_id: str,
    payload: DeleteChunksRequestPayload,
    service: IndexingService,
) -> DeleteDocumentChunksSuccessResponse:
    return service.delete_document_chunks(document_id, payload)


def handle_delete_knowledge_chunks(
    knowledge_id: str,
    payload: DeleteChunksRequestPayload,
    service: IndexingService,
) -> DeleteKnowledgeChunksSuccessResponse:
    return service.delete_knowledge_chunks(knowledge_id, payload)


@router.post(
    "/internal/v1/index/documents",
    response_model=IndexDocumentSuccessResponse,
)
def index_document(
    payload: IndexDocumentRequestPayload,
    service: IndexingService = Depends(get_indexing_service),
) -> IndexDocumentSuccessResponse:
    return handle_index_document(payload, service)


@router.post(
    "/internal/v1/index/documents/{document_id}/rebuild",
    response_model=IndexDocumentSuccessResponse,
)
def rebuild_document(
    document_id: str,
    payload: IndexDocumentRequestPayload,
    service: IndexingService = Depends(get_indexing_service),
) -> IndexDocumentSuccessResponse:
    return handle_rebuild_document(document_id, payload, service)


@router.post(
    "/internal/v1/index/documents/{document_id}/delete",
    response_model=DeleteDocumentChunksSuccessResponse,
)
def delete_document_chunks(
    document_id: str,
    payload: DeleteChunksRequestPayload,
    service: IndexingService = Depends(get_indexing_service),
) -> DeleteDocumentChunksSuccessResponse:
    return handle_delete_document_chunks(document_id, payload, service)


@router.post(
    "/internal/v1/index/knowledge/{knowledge_id}/delete",
    response_model=DeleteKnowledgeChunksSuccessResponse,
)
def delete_knowledge_chunks(
    knowledge_id: str,
    payload: DeleteChunksRequestPayload,
    service: IndexingService = Depends(get_indexing_service),
) -> DeleteKnowledgeChunksSuccessResponse:
    return handle_delete_knowledge_chunks(knowledge_id, payload, service)


@router.post(
    "/internal/index-documents",
    response_model=IndexDocumentSuccessResponse,
    include_in_schema=False,
)
def index_document_legacy(
    payload: IndexDocumentRequestPayload,
    service: IndexingService = Depends(get_indexing_service),
) -> IndexDocumentSuccessResponse:
    return handle_index_document(payload, service)


@router.get(
    "/internal/v1/index/diagnostics",
    response_model=IndexerDiagnosticsResponse,
)
def get_diagnostics(
    service: IndexingService = Depends(get_indexing_service),
) -> IndexerDiagnosticsResponse:
    return service.get_diagnostics()
