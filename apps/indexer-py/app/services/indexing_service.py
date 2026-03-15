from __future__ import annotations

from app.domain.indexing import pipeline
from app.schemas.indexing import (
    IndexDocumentRequestPayload,
    IndexDocumentSuccessResponse,
    IndexerDiagnosticsResponse,
)


class IndexingService:
    def index_document(
        self,
        payload: IndexDocumentRequestPayload,
    ) -> IndexDocumentSuccessResponse:
        result = pipeline.process_document(payload.model_dump(by_alias=True))
        return IndexDocumentSuccessResponse.model_validate(result)

    def rebuild_document(
        self,
        document_id: str,
        payload: IndexDocumentRequestPayload,
    ) -> IndexDocumentSuccessResponse:
        if payload.document_id != document_id:
            raise pipeline.IndexerError("documentId 与路径参数不一致")

        return self.index_document(payload)

    def get_diagnostics(self) -> IndexerDiagnosticsResponse:
        result = pipeline.collect_diagnostics()
        return IndexerDiagnosticsResponse.model_validate(result)


def get_indexing_service() -> IndexingService:
    return IndexingService()
