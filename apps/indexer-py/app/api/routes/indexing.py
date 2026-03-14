from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas.indexing import (
    IndexDocumentRequestPayload,
    IndexDocumentSuccessResponse,
)
from app.services.indexing_service import IndexingService, get_indexing_service


router = APIRouter(tags=["indexing"])


def handle_index_document(
    payload: IndexDocumentRequestPayload,
    service: IndexingService,
) -> IndexDocumentSuccessResponse:
    return service.index_document(payload)


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
    "/internal/index-documents",
    response_model=IndexDocumentSuccessResponse,
    include_in_schema=False,
)
def index_document_legacy(
    payload: IndexDocumentRequestPayload,
    service: IndexingService = Depends(get_indexing_service),
) -> IndexDocumentSuccessResponse:
    return handle_index_document(payload, service)
