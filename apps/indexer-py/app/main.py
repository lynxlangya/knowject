from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes.health import router as health_router
from app.api.routes.indexing import router as indexing_router
from app.core.config import get_app_config
from app.core.runtime_env import read_optional_string
from app.domain.indexing.pipeline import IndexerError
from app.schemas.indexing import IndexerFailureResponse, IndexerNotFoundResponse


def create_failure_response(status_code: int, message: str) -> JSONResponse:
    payload = IndexerFailureResponse(
        status="failed",
        error_message=message,
    ).model_dump(by_alias=True)
    return JSONResponse(status_code=status_code, content=payload)


def build_validation_error_message(error: dict[str, Any]) -> str:
    error_type = str(error.get("type", "")).strip()
    location = tuple(error.get("loc", ()))

    if error_type == "json_invalid":
        return "请求体必须是合法 JSON"

    if location == ("body",) and error_type == "missing":
        return "请求体不能为空"

    if location == ("body",):
        return "请求体必须是 JSON object"

    field_name = next(
        (item for item in reversed(location) if isinstance(item, str) and item != "body"),
        None,
    )
    if field_name:
        return f"{field_name} 缺失或格式不合法"

    return "请求体不合法"


def is_development_environment() -> bool:
    return (read_optional_string("NODE_ENV") or "development").strip() == "development"


def create_app() -> FastAPI:
    config = get_app_config()
    docs_url = "/docs" if is_development_environment() else None
    redoc_url = "/redoc" if is_development_environment() else None
    openapi_url = "/openapi.json" if is_development_environment() else None
    app = FastAPI(
        title="Knowject Indexer API",
        version=config.app_version,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
    )

    @app.exception_handler(IndexerError)
    def handle_indexer_error(_request: Request, exc: IndexerError) -> JSONResponse:
        return create_failure_response(422, str(exc))

    @app.exception_handler(RequestValidationError)
    def handle_validation_error(
        _request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        errors = exc.errors()
        message = build_validation_error_message(errors[0] if errors else {})
        return create_failure_response(400, message)

    @app.exception_handler(StarletteHTTPException)
    def handle_http_exception(
        _request: Request,
        exc: StarletteHTTPException,
    ) -> JSONResponse:
        if exc.status_code == 404:
            payload = IndexerNotFoundResponse(
                status="not_found",
                message="Unknown route",
            ).model_dump(by_alias=True)
            return JSONResponse(status_code=404, content=payload)

        detail = exc.detail if isinstance(exc.detail, str) else "HTTP error"
        if exc.status_code in {401, 403}:
            return create_failure_response(exc.status_code, detail)

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status": "error",
                "message": detail,
            },
        )

    @app.exception_handler(Exception)
    def handle_unexpected_error(_request: Request, exc: Exception) -> JSONResponse:
        return create_failure_response(
            500,
            f"Python indexer 内部错误: {exc}",
        )

    app.include_router(health_router)
    app.include_router(indexing_router)

    return app


app = create_app()
