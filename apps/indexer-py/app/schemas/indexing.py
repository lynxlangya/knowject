from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CamelCaseModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class IndexDocumentRequestPayload(CamelCaseModel):
    knowledge_id: str = Field(alias="knowledgeId")
    document_id: str = Field(alias="documentId")
    source_type: str = Field(alias="sourceType")
    file_name: str = Field(alias="fileName")
    mime_type: str = Field(alias="mimeType")
    storage_path: str = Field(alias="storagePath")
    document_version_hash: str = Field(alias="documentVersionHash")


class IndexDocumentSuccessResponse(CamelCaseModel):
    status: Literal["completed"]
    knowledge_id: str = Field(alias="knowledgeId")
    document_id: str = Field(alias="documentId")
    chunk_count: int = Field(alias="chunkCount")
    character_count: int = Field(alias="characterCount")
    parser: str
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
