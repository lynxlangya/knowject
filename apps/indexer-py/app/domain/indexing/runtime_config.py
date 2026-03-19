from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Callable

from app.core.runtime_env import read_optional_positive_integer


DEFAULT_CHUNK_SIZE = int(os.getenv("KNOWLEDGE_CHUNK_SIZE", "1000"))
DEFAULT_CHUNK_OVERLAP = int(os.getenv("KNOWLEDGE_CHUNK_OVERLAP", "200"))
DEFAULT_INDEXER_REQUEST_TIMEOUT_MS = 30000
SUPPORTED_EXTENSIONS = {".md", ".markdown", ".txt"}
SUPPORTED_FORMAT_LABELS = ["md", "txt"]

ErrorFactory = Callable[[str], Exception]


@dataclass(frozen=True)
class IndexingRuntimeConfig:
    chunk_size: int
    chunk_overlap: int
    supported_types: tuple[str, ...]
    indexer_timeout_ms: int


@dataclass
class IndexingRuntimeConfigResolver:
    error_factory: ErrorFactory

    def build_runtime_config(
        self,
        *,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
        supported_types: list[str] | None = None,
        indexer_timeout_ms: int | None = None,
    ) -> IndexingRuntimeConfig:
        resolved_chunk_size = (
            self._read_optional_positive_integer_field(
                chunk_size,
                "indexingConfig.chunkSize",
            )
            if chunk_size is not None
            else DEFAULT_CHUNK_SIZE
        )
        resolved_chunk_overlap = (
            self._read_optional_non_negative_integer_field(
                chunk_overlap,
                "indexingConfig.chunkOverlap",
            )
            if chunk_overlap is not None
            else DEFAULT_CHUNK_OVERLAP
        )

        if resolved_chunk_overlap >= resolved_chunk_size:
            raise self.error_factory("indexingConfig.chunkOverlap 必须小于 chunkSize")

        return IndexingRuntimeConfig(
            chunk_size=resolved_chunk_size,
            chunk_overlap=resolved_chunk_overlap,
            supported_types=tuple(self.parse_supported_types(supported_types)),
            indexer_timeout_ms=(
                self._read_optional_positive_integer_field(
                    indexer_timeout_ms,
                    "indexingConfig.indexerTimeoutMs",
                )
                if indexer_timeout_ms is not None
                else DEFAULT_INDEXER_REQUEST_TIMEOUT_MS
            ),
        )

    def parse_supported_types(self, raw_value: Any) -> list[str]:
        if raw_value is None:
            return list(SUPPORTED_FORMAT_LABELS)

        if not isinstance(raw_value, list):
            raise self.error_factory("indexingConfig.supportedTypes 缺失或格式不合法")

        normalized_values: list[str] = []
        for item in raw_value:
            if not isinstance(item, str) or not item.strip():
                raise self.error_factory("indexingConfig.supportedTypes 缺失或格式不合法")
            normalized = item.strip().lower().removeprefix(".")
            if normalized == "markdown":
                normalized = "md"
            if normalized not in {"md", "txt"}:
                raise self.error_factory("indexingConfig.supportedTypes 仅支持 md、txt")
            normalized_values.append(normalized)

        return list(dict.fromkeys(normalized_values))

    def resolve_supported_extensions(self, supported_types: tuple[str, ...]) -> set[str]:
        extensions: set[str] = set()
        for supported_type in supported_types:
            if supported_type == "md":
                extensions.update({".md", ".markdown"})
            elif supported_type == "txt":
                extensions.add(".txt")
        return extensions or set(SUPPORTED_EXTENSIONS)

    def _read_optional_positive_integer_field(
        self,
        value: Any,
        field_name: str,
    ) -> int | None:
        if value is None:
            return None

        if not isinstance(value, int) or value <= 0:
            raise self.error_factory(f"{field_name} 缺失或格式不合法")

        return value

    def _read_optional_non_negative_integer_field(
        self,
        value: Any,
        field_name: str,
    ) -> int | None:
        if value is None:
            return None

        if not isinstance(value, int) or value < 0:
            raise self.error_factory(f"{field_name} 缺失或格式不合法")

        return value
