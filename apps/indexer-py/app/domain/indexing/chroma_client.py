from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


class ChunkRecordLike(Protocol):
    chunk_id: str
    text: str
    metadata: dict[str, Any]


class RequestJsonCallable(Protocol):
    def __call__(
        self,
        url: str,
        *,
        method: str = "GET",
        timeout_ms: int,
        payload: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        error_prefix: str,
    ) -> Any: ...


class BuildChromaUrlCallable(Protocol):
    def __call__(self, path: str) -> str: ...


@dataclass
class ChromaClient:
    request_json: RequestJsonCallable
    build_database_url: BuildChromaUrlCallable
    timeout_ms: int
    collection_cache: dict[str, dict[str, Any]] = field(default_factory=dict)

    def find_collection(
        self,
        name: str,
        *,
        bypass_cache: bool = False,
    ) -> dict[str, Any] | None:
        if not bypass_cache:
            cached = self.collection_cache.get(name)
            if cached:
                return cached

        collections = self.request_json(
            self.build_database_url("/collections"),
            timeout_ms=self.timeout_ms,
            error_prefix="Chroma collection 列表请求失败",
        )
        if isinstance(collections, list):
            existing = next(
                (
                    collection
                    for collection in collections
                    if isinstance(collection, dict) and collection.get("name") == name
                ),
                None,
            )
            if isinstance(existing, dict):
                self.collection_cache[name] = existing
                return existing

        self.collection_cache.pop(name, None)
        return None

    def ensure_collection(self, name: str) -> dict[str, Any]:
        existing = self.find_collection(name)
        if existing:
            return existing

        try:
            created = self.request_json(
                self.build_database_url("/collections"),
                method="POST",
                timeout_ms=self.timeout_ms,
                payload={"name": name},
                error_prefix="Chroma collection 创建失败",
            )
            if not isinstance(created, dict) or not isinstance(created.get("id"), str):
                raise ValueError("Chroma collection 创建响应不合法")

            self.collection_cache[name] = created
            return created
        except Exception:
            refreshed = self.request_json(
                self.build_database_url("/collections"),
                timeout_ms=self.timeout_ms,
                error_prefix="Chroma collection 列表请求失败",
            )
            if isinstance(refreshed, list):
                existing = next(
                    (
                        collection
                        for collection in refreshed
                        if isinstance(collection, dict) and collection.get("name") == name
                    ),
                    None,
                )
                if isinstance(existing, dict):
                    self.collection_cache[name] = existing
                    return existing

            raise

    def _should_refresh_collection_cache(self, error: Exception) -> bool:
        normalized_message = str(error).lower()

        return (
            "http 404" in normalized_message
            or "not found" in normalized_message
            or "does not exist" in normalized_message
        )

    def delete_chunks_by_where(
        self,
        collection_name: str,
        where: dict[str, Any],
        *,
        error_prefix: str,
    ) -> None:
        collection = self.find_collection(collection_name)
        if collection is None:
            return

        try:
            self.request_json(
                self.build_database_url(f"/collections/{collection['id']}/delete"),
                method="POST",
                timeout_ms=self.timeout_ms,
                payload={"where": where},
                error_prefix=error_prefix,
            )
        except Exception as error:
            if not self._should_refresh_collection_cache(error):
                raise

            refreshed = self.find_collection(collection_name, bypass_cache=True)
            if refreshed is None:
                return

            self.request_json(
                self.build_database_url(f"/collections/{refreshed['id']}/delete"),
                method="POST",
                timeout_ms=self.timeout_ms,
                payload={"where": where},
                error_prefix=error_prefix,
            )

    def delete_document_chunks(self, collection_name: str, document_id: str) -> None:
        self.delete_chunks_by_where(
            collection_name,
            {"documentId": document_id},
            error_prefix="Chroma 文档向量删除失败",
        )

    def upsert_chunk_records(
        self,
        collection_name: str,
        chunks: list[ChunkRecordLike],
        embeddings: list[list[float]],
    ) -> None:
        collection = self.ensure_collection(collection_name)

        try:
            self.request_json(
                self.build_database_url(f"/collections/{collection['id']}/upsert"),
                method="POST",
                timeout_ms=self.timeout_ms,
                payload={
                    "ids": [chunk.chunk_id for chunk in chunks],
                    "documents": [chunk.text for chunk in chunks],
                    "embeddings": embeddings,
                    "metadatas": [chunk.metadata for chunk in chunks],
                },
                error_prefix="Chroma 文档向量写入失败",
            )
        except Exception as error:
            if not self._should_refresh_collection_cache(error):
                raise

            self.collection_cache.pop(collection_name, None)
            refreshed = self.ensure_collection(collection_name)
            self.request_json(
                self.build_database_url(f"/collections/{refreshed['id']}/upsert"),
                method="POST",
                timeout_ms=self.timeout_ms,
                payload={
                    "ids": [chunk.chunk_id for chunk in chunks],
                    "documents": [chunk.text for chunk in chunks],
                    "embeddings": embeddings,
                    "metadatas": [chunk.metadata for chunk in chunks],
                },
                error_prefix="Chroma 文档向量写入失败",
            )
