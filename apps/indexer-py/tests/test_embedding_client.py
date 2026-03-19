from __future__ import annotations

import unittest

from app.domain.indexing.embedding_client import (
    DEFAULT_LOCAL_EMBEDDING_DIMENSION,
    EmbeddingClient,
)
from app.domain.indexing.pipeline import IndexerError


class EmbeddingClientTest(unittest.TestCase):
    def test_resolve_embedding_provider_returns_unconfigured_in_non_development_without_api_key(self):
        client = EmbeddingClient(
            request_json=lambda *_args, **_kwargs: None,
            build_api_url=lambda base_url, path: f"{base_url.rstrip('/')}/{path.lstrip('/')}",
            read_optional_string=lambda name: "production" if name == "NODE_ENV" else None,
            error_factory=IndexerError,
        )

        provider, error_message = client.resolve_embedding_provider()

        self.assertEqual(provider, "unconfigured")
        self.assertEqual(error_message, "OPENAI_API_KEY 未配置，无法生成 embedding")

    def test_build_runtime_config_uses_request_level_overrides(self):
        client = EmbeddingClient(
            request_json=lambda *_args, **_kwargs: None,
            build_api_url=lambda base_url, path: f"{base_url.rstrip('/')}/{path.lstrip('/')}",
            read_optional_string=lambda _name: None,
            error_factory=IndexerError,
        )

        config = client.build_runtime_config(
            provider="custom",
            api_key="db-key",
            base_url="https://embedding.example.com/v1",
            model="text-embedding-custom",
        )

        self.assertEqual(config.provider, "custom")
        self.assertEqual(config.api_key, "db-key")
        self.assertEqual(config.base_url, "https://embedding.example.com/v1")
        self.assertEqual(config.model, "text-embedding-custom")

    def test_create_embeddings_batches_openai_requests(self):
        captured_batches: list[list[str]] = []

        def request_json(url, *, method="GET", timeout_ms, payload=None, headers=None, error_prefix):
            self.assertEqual(method, "POST")
            self.assertIsNotNone(payload)
            batch = payload["input"]
            captured_batches.append(batch)
            return {
                "data": [
                    {
                        "embedding": [float(index)],
                    }
                    for index, _value in enumerate(batch)
                ]
            }

        client = EmbeddingClient(
            request_json=request_json,
            build_api_url=lambda base_url, path: f"{base_url.rstrip('/')}/{path.lstrip('/')}",
            read_optional_string=lambda name: "test-key" if name == "OPENAI_API_KEY" else None,
            error_factory=IndexerError,
        )

        embeddings = client.create_embeddings([f"chunk-{index}" for index in range(130)])

        self.assertEqual(len(captured_batches), 3)
        self.assertEqual([len(batch) for batch in captured_batches], [64, 64, 2])
        self.assertEqual(len(embeddings), 130)

    def test_create_embeddings_uses_provider_aware_batch_size_for_aliyun(self):
        captured_batches: list[list[str]] = []

        def request_json(url, *, method="GET", timeout_ms, payload=None, headers=None, error_prefix):
            self.assertEqual(method, "POST")
            self.assertIsNotNone(payload)
            self.assertEqual(error_prefix, "阿里云 embedding 请求失败")
            batch = payload["input"]
            captured_batches.append(batch)
            return {
                "data": [
                    {
                        "embedding": [float(index)],
                    }
                    for index, _value in enumerate(batch)
                ]
            }

        client = EmbeddingClient(
            request_json=request_json,
            build_api_url=lambda base_url, path: f"{base_url.rstrip('/')}/{path.lstrip('/')}",
            read_optional_string=lambda _name: None,
            error_factory=IndexerError,
        )

        embeddings = client.create_embeddings(
            [f"chunk-{index}" for index in range(18)],
            client.build_runtime_config(
                provider="aliyun",
                api_key="db-key",
                base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
                model="text-embedding-v3",
            ),
        )

        self.assertEqual(len(captured_batches), 2)
        self.assertEqual([len(batch) for batch in captured_batches], [10, 8])
        self.assertEqual(len(embeddings), 18)

    def test_create_embeddings_uses_local_fallback_in_development_without_api_key(self):
        client = EmbeddingClient(
            request_json=lambda *_args, **_kwargs: None,
            build_api_url=lambda base_url, path: f"{base_url.rstrip('/')}/{path.lstrip('/')}",
            read_optional_string=lambda name: "development" if name == "NODE_ENV" else None,
            error_factory=IndexerError,
        )

        embeddings = client.create_embeddings(["知项 Knowject 项目认知总结"])

        self.assertEqual(len(embeddings), 1)
        self.assertEqual(len(embeddings[0]), DEFAULT_LOCAL_EMBEDDING_DIMENSION)
        self.assertAlmostEqual(
            sum(value * value for value in embeddings[0]),
            1.0,
            places=6,
        )

    def test_parse_embeddings_response_rejects_mismatched_count(self):
        client = EmbeddingClient(
            request_json=lambda *_args, **_kwargs: None,
            build_api_url=lambda base_url, path: f"{base_url.rstrip('/')}/{path.lstrip('/')}",
            read_optional_string=lambda _name: None,
            error_factory=IndexerError,
        )

        with self.assertRaisesRegex(IndexerError, "OpenAI embedding 响应数量与请求不一致"):
            client.parse_embeddings_response(
                {"data": [{"embedding": [0.1]}]},
                expected_count=2,
            )


if __name__ == "__main__":
    unittest.main()
