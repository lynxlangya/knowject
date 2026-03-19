from __future__ import annotations

import hashlib
import math
import os
import unicodedata
from dataclasses import dataclass
from typing import Any, Callable, Protocol

from app.core.runtime_env import read_optional_positive_integer, read_optional_string


DEFAULT_OPENAI_BASE_URL = read_optional_string("OPENAI_BASE_URL") or "https://api.openai.com/v1"
DEFAULT_OPENAI_EMBEDDING_MODEL = (
    read_optional_string("OPENAI_EMBEDDING_MODEL") or "text-embedding-3-small"
)
DEFAULT_OPENAI_TIMEOUT_MS = read_optional_positive_integer("OPENAI_TIMEOUT_MS", 15000)
DEFAULT_OPENAI_EMBEDDING_BATCH_SIZE = 64
DEFAULT_LOCAL_EMBEDDING_DIMENSION = 1536
EMBEDDING_BATCH_SIZE_BY_PROVIDER = {
    "aliyun": 10,
}
EMBEDDING_ERROR_PREFIX_BY_PROVIDER = {
    "openai": "OpenAI embedding 请求失败",
    "aliyun": "阿里云 embedding 请求失败",
    "zhipu": "智谱 embedding 请求失败",
    "voyage": "Voyage embedding 请求失败",
    "custom": "兼容 embedding 请求失败",
}


@dataclass(frozen=True)
class EmbeddingRuntimeConfig:
    provider: str
    api_key: str | None
    base_url: str
    model: str


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


class BuildApiUrlCallable(Protocol):
    def __call__(self, base_url: str, path: str) -> str: ...


class ReadOptionalStringCallable(Protocol):
    def __call__(self, name: str) -> str | None: ...


ErrorFactory = Callable[[str], Exception]


@dataclass
class EmbeddingClient:
    request_json: RequestJsonCallable
    build_api_url: BuildApiUrlCallable
    read_optional_string: ReadOptionalStringCallable
    error_factory: ErrorFactory

    def build_runtime_config(
        self,
        *,
        provider: str | None = None,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
    ) -> EmbeddingRuntimeConfig:
        normalized_provider = self._read_optional_config_string(
            provider,
            "embeddingConfig.provider",
        )
        normalized_api_key = self._read_optional_nullable_string(
            api_key,
            "embeddingConfig.apiKey",
        )
        normalized_base_url = self._read_optional_config_string(
            base_url,
            "embeddingConfig.baseUrl",
        )
        normalized_model = self._read_optional_config_string(
            model,
            "embeddingConfig.model",
        )
        default_provider, _default_error = self.resolve_embedding_provider()

        return EmbeddingRuntimeConfig(
            provider=normalized_provider or default_provider,
            api_key=(
                normalized_api_key
                if normalized_api_key is not None
                else self.read_optional_string("OPENAI_API_KEY")
            ),
            base_url=normalized_base_url or DEFAULT_OPENAI_BASE_URL,
            model=normalized_model or DEFAULT_OPENAI_EMBEDDING_MODEL,
        )

    def resolve_embedding_provider(self) -> tuple[str, str | None]:
        api_key = self.read_optional_string("OPENAI_API_KEY")
        if api_key:
            return "openai", None

        if (self.read_optional_string("NODE_ENV") or "development") == "development":
            return "local_dev", None

        return "unconfigured", "OPENAI_API_KEY 未配置，无法生成 embedding"

    def create_embeddings(
        self,
        texts: list[str],
        embedding_config: EmbeddingRuntimeConfig | None = None,
    ) -> list[list[float]]:
        if not texts:
            return []

        resolved_config = embedding_config or self.build_runtime_config()

        if resolved_config.provider == "local_dev":
            return [self.create_local_development_embedding(text) for text in texts]

        api_key = resolved_config.api_key
        if not api_key:
            if (self.read_optional_string("NODE_ENV") or "development") == "development":
                return [self.create_local_development_embedding(text) for text in texts]
            raise self.error_factory("embedding apiKey 未配置，无法生成 embedding")

        embeddings: list[list[float]] = []
        batch_size = self.resolve_embedding_batch_size(resolved_config.provider)
        error_prefix = self.resolve_embedding_error_prefix(resolved_config.provider)
        for batch in self.iter_embedding_batches(
            texts,
            batch_size,
        ):
            response = self.request_json(
                self.build_api_url(resolved_config.base_url, "/embeddings"),
                method="POST",
                timeout_ms=DEFAULT_OPENAI_TIMEOUT_MS,
                headers={
                    "Authorization": f"Bearer {api_key}",
                },
                payload={
                    "model": resolved_config.model,
                    "input": batch,
                },
                error_prefix=error_prefix,
            )
            embeddings.extend(
                self.parse_embeddings_response(response, expected_count=len(batch))
            )

        return embeddings

    def create_local_development_embedding(self, text: str) -> list[float]:
        normalized = unicodedata.normalize("NFKC", text).casefold()
        units = [char for char in normalized if not char.isspace()]
        vector = [0.0] * DEFAULT_LOCAL_EMBEDDING_DIMENSION

        if not units:
            vector[0] = 1.0
            return vector

        for size, weight in ((1, 1.0), (2, 1.5), (3, 2.0)):
            if len(units) < size:
                continue

            for start in range(0, len(units) - size + 1):
                feature = "".join(units[start : start + size]).encode("utf-8")
                digest = hashlib.sha256(feature).digest()

                for projection in range(4):
                    offset = projection * 2
                    index = int.from_bytes(
                        digest[offset : offset + 2],
                        "big",
                    ) % DEFAULT_LOCAL_EMBEDDING_DIMENSION
                    sign = 1.0 if digest[8 + projection] % 2 == 0 else -1.0
                    vector[index] += weight * sign

        norm = math.sqrt(sum(value * value for value in vector))
        if norm <= 0:
            vector[0] = 1.0
            return vector

        return [value / norm for value in vector]

    def iter_embedding_batches(
        self,
        texts: list[str],
        batch_size: int,
    ) -> list[list[str]]:
        if batch_size <= 0:
            raise self.error_factory("embedding_batch_size 必须大于 0")

        return [texts[start : start + batch_size] for start in range(0, len(texts), batch_size)]

    def parse_embeddings_response(
        self,
        response: Any,
        *,
        expected_count: int,
    ) -> list[list[float]]:
        data = response.get("data") if isinstance(response, dict) else None
        if not isinstance(data, list):
            raise self.error_factory("OpenAI embedding 响应缺少 data")

        if len(data) != expected_count:
            raise self.error_factory("OpenAI embedding 响应数量与请求不一致")

        embeddings: list[list[float]] = []
        for item in data:
            embedding = item.get("embedding") if isinstance(item, dict) else None
            if not isinstance(embedding, list):
                raise self.error_factory("OpenAI embedding 响应缺少 embedding")
            embeddings.append([float(value) for value in embedding])

        return embeddings

    def resolve_embedding_batch_size(self, provider: str) -> int:
        return EMBEDDING_BATCH_SIZE_BY_PROVIDER.get(
            provider,
            DEFAULT_OPENAI_EMBEDDING_BATCH_SIZE,
        )

    def resolve_embedding_error_prefix(self, provider: str) -> str:
        return EMBEDDING_ERROR_PREFIX_BY_PROVIDER.get(
            provider,
            "Embedding 请求失败",
        )

    def _read_optional_config_string(self, value: Any, field_name: str) -> str | None:
        if value is None:
            return None

        if not isinstance(value, str) or not value.strip():
            raise self.error_factory(f"{field_name} 缺失或格式不合法")

        return value.strip()

    def _read_optional_nullable_string(self, value: Any, field_name: str) -> str | None:
        if value is None:
            return None

        if not isinstance(value, str):
            raise self.error_factory(f"{field_name} 缺失或格式不合法")

        normalized = value.strip()
        return normalized or None
