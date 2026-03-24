from __future__ import annotations

from hmac import compare_digest

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.schemas.indexing import (
    DeleteChunksRequestPayload,
    DeleteDocumentChunksSuccessResponse,
    DeleteKnowledgeChunksSuccessResponse,
    IndexDocumentRequestPayload,
    IndexDocumentSuccessResponse,
    IndexerDiagnosticsResponse,
)
from app.core.runtime_env import read_optional_string
from app.services.indexing_service import IndexingService, get_indexing_service


router = APIRouter(tags=["indexing"])


def is_development_environment() -> bool:
    return (read_optional_string("NODE_ENV") or "development").strip() == "development"


def validate_internal_auth_configuration() -> None:
    if is_development_environment():
        return

    if not read_optional_string("KNOWLEDGE_INDEXER_INTERNAL_TOKEN"):
        raise RuntimeError(
            "KNOWLEDGE_INDEXER_INTERNAL_TOKEN is required when NODE_ENV is not development"
        )


def verify_internal_request(
    authorization: str | None = Header(default=None),
    x_knowject_internal_token: str | None = Header(
        default=None,
        alias="X-Knowject-Internal-Token",
    ),
) -> None:
    configured_token = read_optional_string("KNOWLEDGE_INDEXER_INTERNAL_TOKEN")
    if not configured_token:
        if is_development_environment():
            return

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Internal authentication is unavailable",
        )

    provided_token: str | None = None
    if authorization:
        scheme, _, credentials = authorization.partition(" ")
        if scheme.lower() == "bearer" and credentials.strip():
            provided_token = credentials.strip()

    if not provided_token and x_knowject_internal_token:
        provided_token = x_knowject_internal_token.strip()

    if not provided_token or not compare_digest(provided_token, configured_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized internal request",
        )


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
    _internal_auth: None = Depends(verify_internal_request),
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
    _internal_auth: None = Depends(verify_internal_request),
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
    _internal_auth: None = Depends(verify_internal_request),
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
    _internal_auth: None = Depends(verify_internal_request),
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
    _internal_auth: None = Depends(verify_internal_request),
    service: IndexingService = Depends(get_indexing_service),
) -> IndexDocumentSuccessResponse:
    return handle_index_document(payload, service)


@router.get(
    "/internal/v1/index/diagnostics",
    response_model=IndexerDiagnosticsResponse,
)
def get_diagnostics(
    _internal_auth: None = Depends(verify_internal_request),
    service: IndexingService = Depends(get_indexing_service),
) -> IndexerDiagnosticsResponse:
    return service.get_diagnostics()
