from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Protocol


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


BuildChromaDatabaseUrlCallable = Callable[[str], str]
ResolveEmbeddingProviderCallable = Callable[[], tuple[str, str | None]]


@dataclass
class DiagnosticsCollector:
    request_json: RequestJsonCallable
    build_chroma_database_url: BuildChromaDatabaseUrlCallable
    resolve_embedding_provider: ResolveEmbeddingProviderCallable
    handled_error_type: type[Exception]
    chunk_size: int
    chunk_overlap: int
    supported_formats: list[str]
    service_name: str = "knowject-indexer-py"

    def merge_diagnostic_error(
        self,
        current: str | None,
        message: str | None,
    ) -> str | None:
        if not message:
            return current

        if not current:
            return message

        if message in current:
            return current

        return f"{current}; {message}"

    def collect_diagnostics(self) -> dict[str, Any]:
        status = "ok"
        chroma_reachable = True
        error_message: str | None = None
        embedding_provider, embedding_error = self.resolve_embedding_provider()

        if embedding_error:
            status = "degraded"
            error_message = self.merge_diagnostic_error(error_message, embedding_error)

        try:
            self.request_json(
                self.build_chroma_database_url("/collections"),
                timeout_ms=15000,
                error_prefix="Chroma 诊断失败",
            )
        except self.handled_error_type as error:
            chroma_reachable = False
            status = "degraded"
            error_message = self.merge_diagnostic_error(error_message, str(error))

        return {
            "status": status,
            "service": self.service_name,
            "chunkSize": self.chunk_size,
            "chunkOverlap": self.chunk_overlap,
            "supportedFormats": self.supported_formats,
            "embeddingProvider": embedding_provider,
            "chromaReachable": chroma_reachable,
            "errorMessage": error_message,
        }
