from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.config import AppConfig, get_app_config
from app.schemas.indexing import IndexerHealthResponse


router = APIRouter(tags=["health"])


@router.get("/health", response_model=IndexerHealthResponse)
def get_health(
    config: AppConfig = Depends(get_app_config),
) -> IndexerHealthResponse:
    return IndexerHealthResponse(
        status="ok",
        service=config.app_name,
        chunk_size=config.chunk_size,
        chunk_overlap=config.chunk_overlap,
        supported_formats=list(config.supported_formats),
    )
