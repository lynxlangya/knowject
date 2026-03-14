from __future__ import annotations

from app.domain.indexing import pipeline
from app.schemas.indexing import (
    IndexDocumentRequestPayload,
    IndexDocumentSuccessResponse,
)


class IndexingService:
    def index_document(
        self,
        payload: IndexDocumentRequestPayload,
    ) -> IndexDocumentSuccessResponse:
        result = pipeline.process_document(payload.model_dump(by_alias=True))
        return IndexDocumentSuccessResponse.model_validate(result)


def get_indexing_service() -> IndexingService:
    return IndexingService()
