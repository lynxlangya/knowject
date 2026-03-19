from __future__ import annotations

import argparse
import json
from pathlib import Path

import uvicorn

from app.main import app
from app.schemas.indexing import (
    IndexDocumentRequestPayload,
    IndexDocumentSuccessResponse,
)
from app.services.indexing_service import IndexingService, get_indexing_service


class CaptureIndexingService(IndexingService):
    def __init__(self, capture_path: Path):
        self._capture_path = capture_path

    def index_document(
        self,
        payload: IndexDocumentRequestPayload,
    ) -> IndexDocumentSuccessResponse:
        domain_request = payload.to_domain_request()
        self._capture_path.parent.mkdir(parents=True, exist_ok=True)
        self._capture_path.write_text(
            json.dumps(
                {
                    "knowledgeId": payload.knowledge_id,
                    "documentId": payload.document_id,
                    "collectionName": payload.collection_name,
                    "embeddingConfig": (
                        payload.embedding_config.model_dump(by_alias=True)
                        if payload.embedding_config is not None
                        else None
                    ),
                    "indexingConfig": (
                        payload.indexing_config.model_dump(by_alias=True)
                        if payload.indexing_config is not None
                        else None
                    ),
                    "parsed": {
                        "embeddingProvider": domain_request.embedding_config.provider,
                        "embeddingBaseUrl": domain_request.embedding_config.base_url,
                        "embeddingModel": domain_request.embedding_config.model,
                        "chunkSize": domain_request.indexing_config.chunk_size,
                        "chunkOverlap": domain_request.indexing_config.chunk_overlap,
                        "supportedTypes": list(domain_request.indexing_config.supported_types),
                        "indexerTimeoutMs": domain_request.indexing_config.indexer_timeout_ms,
                    },
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        return IndexDocumentSuccessResponse(
            status="completed",
            knowledge_id=payload.knowledge_id,
            document_id=payload.document_id,
            chunk_count=1,
            character_count=12,
            parser="markdown",
            collection_name=domain_request.collection_name,
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--capture-path", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    capture_path = Path(args.capture_path).resolve()
    app.dependency_overrides[get_indexing_service] = (
        lambda: CaptureIndexingService(capture_path)
    )
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level="warning",
        access_log=False,
    )


if __name__ == "__main__":
    main()
