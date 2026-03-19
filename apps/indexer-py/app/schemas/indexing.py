from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from app.domain.indexing import pipeline


class CamelCaseModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class EmbeddingConfigOverridePayload(CamelCaseModel):
    provider: str | None = None
    api_key: str | None = Field(default=None, alias="apiKey")
    base_url: str | None = Field(default=None, alias="baseUrl")
    model: str | None = None

    def to_runtime_config(self) -> pipeline.EmbeddingRuntimeConfig:
        return pipeline.build_embedding_runtime_config(
            provider=self.provider,
            api_key=self.api_key,
            base_url=self.base_url,
            model=self.model,
        )


class IndexingConfigOverridePayload(CamelCaseModel):
    chunk_size: int | None = Field(default=None, alias="chunkSize")
    chunk_overlap: int | None = Field(default=None, alias="chunkOverlap")
    supported_types: list[str] | None = Field(default=None, alias="supportedTypes")
    indexer_timeout_ms: int | None = Field(default=None, alias="indexerTimeoutMs")

    def to_runtime_config(self) -> pipeline.IndexingRuntimeConfig:
        return pipeline.build_indexing_runtime_config(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            supported_types=self.supported_types,
            indexer_timeout_ms=self.indexer_timeout_ms,
        )


class IndexDocumentRequestPayload(CamelCaseModel):
    knowledge_id: str = Field(alias="knowledgeId")
    document_id: str = Field(alias="documentId")
    source_type: str = Field(alias="sourceType")
    collection_name: str | None = Field(default=None, alias="collectionName")
    file_name: str = Field(alias="fileName")
    mime_type: str = Field(alias="mimeType")
    storage_path: str = Field(alias="storagePath")
    document_version_hash: str = Field(alias="documentVersionHash")
    embedding_config: EmbeddingConfigOverridePayload | None = Field(
        default=None,
        alias="embeddingConfig",
    )
    indexing_config: IndexingConfigOverridePayload | None = Field(
        default=None,
        alias="indexingConfig",
    )

    def to_domain_request(self) -> pipeline.IndexDocumentRequest:
        return pipeline.build_index_document_request(
            knowledge_id=self.knowledge_id,
            document_id=self.document_id,
            source_type=self.source_type,
            collection_name=self.collection_name,
            file_name=self.file_name,
            mime_type=self.mime_type,
            storage_path=self.storage_path,
            document_version_hash=self.document_version_hash,
            embedding_config=(
                self.embedding_config.to_runtime_config()
                if self.embedding_config is not None
                else None
            ),
            indexing_config=(
                self.indexing_config.to_runtime_config()
                if self.indexing_config is not None
                else None
            ),
        )


class IndexDocumentSuccessResponse(CamelCaseModel):
    status: Literal["completed"]
    knowledge_id: str = Field(alias="knowledgeId")
    document_id: str = Field(alias="documentId")
    chunk_count: int = Field(alias="chunkCount")
    character_count: int = Field(alias="characterCount")
    parser: str
    collection_name: str = Field(alias="collectionName")


class DeleteChunksRequestPayload(CamelCaseModel):
    collection_name: str = Field(alias="collectionName")

    def to_domain_request(self) -> pipeline.DeleteChunksRequest:
        return pipeline.build_delete_chunks_request(
            collection_name=self.collection_name,
        )


class DeleteDocumentChunksSuccessResponse(CamelCaseModel):
    status: Literal["completed"]
    document_id: str = Field(alias="documentId")
    collection_name: str = Field(alias="collectionName")


class DeleteKnowledgeChunksSuccessResponse(CamelCaseModel):
    status: Literal["completed"]
    knowledge_id: str = Field(alias="knowledgeId")
    collection_name: str = Field(alias="collectionName")


class IndexerFailureResponse(CamelCaseModel):
    status: Literal["failed"]
    error_message: str = Field(alias="errorMessage")


class IndexerNotFoundResponse(CamelCaseModel):
    status: Literal["not_found"]
    message: str


class IndexerHealthResponse(CamelCaseModel):
    status: Literal["ok"]
    service: str
    chunk_size: int = Field(alias="chunkSize")
    chunk_overlap: int = Field(alias="chunkOverlap")
    supported_formats: list[str] = Field(alias="supportedFormats")


class IndexerDiagnosticsResponse(CamelCaseModel):
    status: Literal["ok", "degraded"]
    service: str
    chunk_size: int = Field(alias="chunkSize")
    chunk_overlap: int = Field(alias="chunkOverlap")
    supported_formats: list[str] = Field(alias="supportedFormats")
    embedding_provider: str = Field(alias="embeddingProvider")
    chroma_reachable: bool = Field(alias="chromaReachable")
    error_message: str | None = Field(alias="errorMessage")


# Reserved for future internal control-plane schemas in the same namespace:
# - POST /internal/v1/index/documents/{documentId}/retry
# - POST /internal/v1/index/knowledge/{knowledgeId}/rebuild
