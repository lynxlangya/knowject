from __future__ import annotations

import unittest

from app.domain.indexing.chroma_client import ChromaClient
from app.domain.indexing.pipeline import IndexerError


class ChromaClientTest(unittest.TestCase):
    def test_find_collection_uses_cache_until_bypass_requested(self):
        calls: list[str] = []

        def request_json(url, *, method="GET", timeout_ms, payload=None, headers=None, error_prefix):
            calls.append(url)
            return [{"id": "collection-1", "name": "global_docs"}]

        client = ChromaClient(
            request_json=request_json,
            build_database_url=lambda path: f"https://chroma.example{path}",
            timeout_ms=15000,
        )

        first = client.find_collection("global_docs")
        second = client.find_collection("global_docs")
        refreshed = client.find_collection("global_docs", bypass_cache=True)

        self.assertEqual(first, {"id": "collection-1", "name": "global_docs"})
        self.assertEqual(second, first)
        self.assertEqual(refreshed, first)
        self.assertEqual(
            calls,
            [
                "https://chroma.example/collections",
                "https://chroma.example/collections",
            ],
        )

    def test_ensure_collection_refreshes_cache_after_create_conflict(self):
        calls: list[tuple[str, str]] = []
        request_count = 0

        def request_json(url, *, method="GET", timeout_ms, payload=None, headers=None, error_prefix):
            nonlocal request_count
            request_count += 1
            calls.append((method, url))
            if method == "GET" and request_count == 1:
                return []
            if method == "GET":
                return [{"id": "collection-2", "name": "global_docs"}]
            raise IndexerError("collection already exists")

        client = ChromaClient(
            request_json=request_json,
            build_database_url=lambda path: f"https://chroma.example{path}",
            timeout_ms=15000,
        )

        collection = client.ensure_collection("global_docs")

        self.assertEqual(collection, {"id": "collection-2", "name": "global_docs"})
        self.assertEqual(
            calls,
            [
                ("GET", "https://chroma.example/collections"),
                ("POST", "https://chroma.example/collections"),
                ("GET", "https://chroma.example/collections"),
            ],
        )

    def test_delete_chunks_by_where_uses_collection_delete_endpoint(self):
        calls: list[tuple[str, str, dict[str, object] | None]] = []

        def request_json(url, *, method="GET", timeout_ms, payload=None, headers=None, error_prefix):
            calls.append((method, url, payload))
            if method == "GET":
                return [{"id": "collection-1", "name": "global_docs"}]
            return {}

        client = ChromaClient(
            request_json=request_json,
            build_database_url=lambda path: f"https://chroma.example{path}",
            timeout_ms=15000,
        )

        client.delete_chunks_by_where(
            "global_docs",
            {"documentId": "document-1"},
            error_prefix="Chroma 文档向量删除失败",
        )

        self.assertEqual(
            calls,
            [
                ("GET", "https://chroma.example/collections", None),
                (
                    "POST",
                    "https://chroma.example/collections/collection-1/delete",
                    {"where": {"documentId": "document-1"}},
                ),
            ],
        )

    def test_delete_chunks_by_where_noops_when_collection_is_missing(self):
        calls: list[tuple[str, str]] = []

        def request_json(url, *, method="GET", timeout_ms, payload=None, headers=None, error_prefix):
            calls.append((method, url))
            return []

        client = ChromaClient(
            request_json=request_json,
            build_database_url=lambda path: f"https://chroma.example{path}",
            timeout_ms=15000,
        )

        client.delete_chunks_by_where(
            "global_docs",
            {"documentId": "document-1"},
            error_prefix="Chroma 文档向量删除失败",
        )

        self.assertEqual(calls, [("GET", "https://chroma.example/collections")])

    def test_delete_document_chunks_refreshes_stale_collection_cache_after_chroma_restart(self):
        calls: list[tuple[str, str, dict[str, object] | None]] = []
        delete_attempts = 0

        def request_json(url, *, method="GET", timeout_ms, payload=None, headers=None, error_prefix):
            nonlocal delete_attempts
            calls.append((method, url, payload))

            if method == "GET":
                if len([call for call in calls if call[0] == "GET"]) == 1:
                    return [{"id": "collection-stale", "name": "global_docs"}]

                return [{"id": "collection-fresh", "name": "global_docs"}]

            delete_attempts += 1
            if delete_attempts == 1:
                raise IndexerError("Chroma 文档向量删除失败（HTTP 404）")

            return {}

        client = ChromaClient(
            request_json=request_json,
            build_database_url=lambda path: f"https://chroma.example{path}",
            timeout_ms=15000,
        )

        client.find_collection("global_docs")
        client.delete_document_chunks("global_docs", "document-1")

        self.assertEqual(
            calls,
            [
                ("GET", "https://chroma.example/collections", None),
                (
                    "POST",
                    "https://chroma.example/collections/collection-stale/delete",
                    {"where": {"documentId": "document-1"}},
                ),
                ("GET", "https://chroma.example/collections", None),
                (
                    "POST",
                    "https://chroma.example/collections/collection-fresh/delete",
                    {"where": {"documentId": "document-1"}},
                ),
            ],
        )

    def test_upsert_chunk_records_refreshes_stale_collection_cache_before_retry(self):
        calls: list[tuple[str, str, dict[str, object] | None]] = []
        upsert_attempts = 0

        def request_json(url, *, method="GET", timeout_ms, payload=None, headers=None, error_prefix):
            nonlocal upsert_attempts
            calls.append((method, url, payload))

            if method == "GET":
                if len([call for call in calls if call[0] == "GET"]) == 1:
                    return [{"id": "collection-stale", "name": "global_docs"}]

                return [{"id": "collection-fresh", "name": "global_docs"}]

            if method == "POST" and url.endswith("/upsert"):
                upsert_attempts += 1
                if upsert_attempts == 1:
                    raise IndexerError("Chroma 文档向量写入失败（HTTP 404）")

            return {}

        client = ChromaClient(
            request_json=request_json,
            build_database_url=lambda path: f"https://chroma.example{path}",
            timeout_ms=15000,
        )

        client.find_collection("global_docs")
        client.upsert_chunk_records(
            "global_docs",
            [
                type(
                    "Chunk",
                    (),
                    {
                        "chunk_id": "chunk-1",
                        "text": "demo",
                        "metadata": {"documentId": "document-1"},
                    },
                )(),
            ],
            [[0.1]],
        )

        self.assertEqual(
            calls,
            [
                ("GET", "https://chroma.example/collections", None),
                (
                    "POST",
                    "https://chroma.example/collections/collection-stale/upsert",
                    {
                        "ids": ["chunk-1"],
                        "documents": ["demo"],
                        "embeddings": [[0.1]],
                        "metadatas": [{"documentId": "document-1"}],
                    },
                ),
                ("GET", "https://chroma.example/collections", None),
                (
                    "POST",
                    "https://chroma.example/collections/collection-fresh/upsert",
                    {
                        "ids": ["chunk-1"],
                        "documents": ["demo"],
                        "embeddings": [[0.1]],
                        "metadatas": [{"documentId": "document-1"}],
                    },
                ),
            ],
        )


if __name__ == "__main__":
    unittest.main()
