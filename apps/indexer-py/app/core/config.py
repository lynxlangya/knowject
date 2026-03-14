from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

from app.domain.indexing.pipeline import DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_SIZE


@dataclass(frozen=True)
class AppConfig:
    app_name: str
    app_version: str
    host: str
    port: int
    chunk_size: int
    chunk_overlap: int
    supported_formats: tuple[str, ...]


@lru_cache(maxsize=1)
def get_app_config() -> AppConfig:
    raw_port = os.getenv("KNOWLEDGE_INDEXER_PORT", "8001").strip()

    return AppConfig(
        app_name="knowject-indexer-py",
        app_version="0.1.0",
        host=os.getenv("KNOWLEDGE_INDEXER_HOST", "127.0.0.1").strip() or "127.0.0.1",
        port=int(raw_port or "8001"),
        chunk_size=DEFAULT_CHUNK_SIZE,
        chunk_overlap=DEFAULT_CHUNK_OVERLAP,
        supported_formats=("md", "txt"),
    )
