from __future__ import annotations

from http.client import IncompleteRead
import unittest
from unittest.mock import Mock, patch

from app.domain.indexing import pipeline


class BuildChunksTest(unittest.TestCase):
    def test_large_block_does_not_duplicate_overlap_before_next_block(self):
        text = ("a" * 1500) + "\n\n" + ("b" * 150)

        chunks = pipeline.build_chunks(text, chunk_size=1000, overlap=200)

        self.assertEqual(len(chunks), 2)
        self.assertEqual(len(chunks[0]), 1000)
        self.assertEqual(len(chunks[1]), 852)
        self.assertTrue(chunks[1].endswith("b" * 150))

    def test_regular_blocks_still_reuse_previous_chunk_tail(self):
        text = ("a" * 450) + "\n\n" + ("b" * 450) + "\n\n" + ("c" * 300)

        chunks = pipeline.build_chunks(text, chunk_size=1000, overlap=200)

        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[1].split("\n\n", 1)[0], chunks[0][-200:])


class EmbeddingsTest(unittest.TestCase):
    def test_create_embeddings_batches_large_requests(self):
        captured_batches: list[list[str]] = []
        texts = [f"chunk-{index}" for index in range(130)]

        def fake_request_json(
            url, *, method="GET", timeout_ms, payload=None, headers=None, error_prefix
        ):
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

        with patch.object(
            pipeline,
            "read_optional_string",
            side_effect=lambda name: "test-key" if name == "OPENAI_API_KEY" else None,
        ), patch.object(pipeline, "request_json", side_effect=fake_request_json):
            embeddings = pipeline.create_embeddings(texts)

        self.assertEqual(len(captured_batches), 3)
        self.assertEqual([len(batch) for batch in captured_batches], [64, 64, 2])
        self.assertEqual(len(embeddings), len(texts))

    def test_create_embeddings_uses_local_fallback_in_development_without_openai_key(self):
        with patch.object(
            pipeline,
            "read_optional_string",
            side_effect=lambda name: "development" if name == "NODE_ENV" else None,
        ):
            embeddings = pipeline.create_embeddings(["知项 Knowject 项目认知总结"])

        self.assertEqual(len(embeddings), 1)
        self.assertEqual(len(embeddings[0]), pipeline.DEFAULT_LOCAL_EMBEDDING_DIMENSION)
        self.assertAlmostEqual(
            sum(value * value for value in embeddings[0]),
            1.0,
            places=6,
        )


class RequestJsonTest(unittest.TestCase):
    class _FakeResponse:
        def __init__(self, *, body: bytes | None = None, error: Exception | None = None):
            self._body = body
            self._error = error

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def read(self) -> bytes:
            if self._error is not None:
                raise self._error

            return self._body or b""

    def test_request_json_retries_incomplete_read_and_eventually_succeeds(self):
        responses = [
            self._FakeResponse(
                error=IncompleteRead(b'{"data":[', 8),
            ),
            self._FakeResponse(body=b'{"data":[{"embedding":[0.1]}]}'),
        ]

        with patch.object(
            pipeline.urllib_request,
            "urlopen",
            side_effect=responses,
        ) as urlopen:
            response = pipeline.request_json(
                "https://api.openai.com/v1/embeddings",
                method="POST",
                timeout_ms=15000,
                payload={"input": ["demo"]},
                error_prefix="OpenAI embedding 请求失败",
            )

        self.assertEqual(response, {"data": [{"embedding": [0.1]}]})
        self.assertEqual(urlopen.call_count, 2)

    def test_request_json_raises_indexer_error_after_repeated_incomplete_reads(self):
        responses = [
            self._FakeResponse(error=IncompleteRead(b'{"data":[', 8)),
            self._FakeResponse(error=IncompleteRead(b'{"data":[', 8)),
            self._FakeResponse(error=IncompleteRead(b'{"data":[', 8)),
        ]

        with patch.object(
            pipeline.urllib_request,
            "urlopen",
            side_effect=responses,
        ) as urlopen:
            with self.assertRaisesRegex(
                pipeline.IndexerError,
                "上游响应读取中断",
            ):
                pipeline.request_json(
                    "https://api.openai.com/v1/embeddings",
                    method="POST",
                    timeout_ms=15000,
                    payload={"input": ["demo"]},
                    error_prefix="OpenAI embedding 请求失败",
                )

        self.assertEqual(urlopen.call_count, pipeline.DEFAULT_HTTP_READ_RETRY_ATTEMPTS)


class ProcessDocumentTest(unittest.TestCase):
    def test_process_document_checks_collection_before_embedding(self):
        request = pipeline.IndexDocumentRequest(
            knowledge_id="knowledge-1",
            document_id="document-1",
            source_type="global_docs",
            collection_name="proj_project-1_docs",
            file_name="demo.md",
            mime_type="text/markdown",
            storage_path="/tmp/demo.md",
            document_version_hash="hash-1",
            embedding_config=pipeline.EmbeddingRuntimeConfig(
                provider="openai",
                api_key="test-key",
                base_url="https://api.openai.com/v1",
                model="text-embedding-3-small",
            ),
            indexing_config=pipeline.IndexingRuntimeConfig(
                chunk_size=1000,
                chunk_overlap=200,
                supported_types=("md", "txt"),
                indexer_timeout_ms=30000,
            ),
        )
        create_embeddings = Mock(return_value=[[0.1]])

        with patch.object(pipeline, "parse_request", return_value=request), patch.object(
            pipeline, "parse_document_text", return_value="demo"
        ), patch.object(pipeline, "clean_text", return_value="demo"), patch.object(
            pipeline, "build_chunks", return_value=["demo chunk"]
        ), patch.object(
            pipeline,
            "build_chunk_records",
            return_value=[
                pipeline.ChunkRecord(
                    chunk_id="document-1:0",
                    text="demo chunk",
                    metadata={},
                )
            ],
        ), patch.object(
            pipeline,
            "ensure_collection",
            side_effect=pipeline.IndexerError("Chroma down"),
        ), patch.object(
            pipeline, "create_embeddings", create_embeddings
        ):
            with self.assertRaisesRegex(pipeline.IndexerError, "Chroma down"):
                pipeline.process_document({})

        create_embeddings.assert_not_called()

    def test_parse_request_prefers_explicit_collection_name(self):
        request = pipeline.parse_request(
            {
                "knowledgeId": "knowledge-1",
                "documentId": "document-1",
                "sourceType": "global_docs",
                "collectionName": "proj_project-1_docs",
                "fileName": "demo.md",
                "mimeType": "text/markdown",
                "storagePath": "/tmp/demo.md",
                "documentVersionHash": "hash-1",
            }
        )

        self.assertEqual(request.collection_name, "proj_project-1_docs")

    def test_parse_request_accepts_request_level_overrides(self):
        request = pipeline.parse_request(
            {
                "knowledgeId": "knowledge-1",
                "documentId": "document-1",
                "sourceType": "global_docs",
                "fileName": "demo.md",
                "mimeType": "text/markdown",
                "storagePath": "/tmp/demo.md",
                "documentVersionHash": "hash-1",
                "embeddingConfig": {
                    "provider": "custom",
                    "apiKey": "db-key",
                    "baseUrl": "https://embedding.example.com/v1",
                    "model": "text-embedding-custom",
                },
                "indexingConfig": {
                    "chunkSize": 860,
                    "chunkOverlap": 120,
                    "supportedTypes": ["md"],
                    "indexerTimeoutMs": 45000,
                },
            }
        )

        self.assertEqual(request.embedding_config.provider, "custom")
        self.assertEqual(request.embedding_config.api_key, "db-key")
        self.assertEqual(request.embedding_config.base_url, "https://embedding.example.com/v1")
        self.assertEqual(request.embedding_config.model, "text-embedding-custom")
        self.assertEqual(request.indexing_config.chunk_size, 860)
        self.assertEqual(request.indexing_config.chunk_overlap, 120)
        self.assertEqual(request.indexing_config.supported_types, ("md",))
        self.assertEqual(request.indexing_config.indexer_timeout_ms, 45000)

    def test_process_document_uses_request_level_overrides(self):
        build_chunks = Mock(return_value=["demo chunk"])
        create_embeddings = Mock(return_value=[[0.1]])

        with patch.object(
            pipeline,
            "parse_document_text",
            return_value="demo",
        ), patch.object(
            pipeline,
            "clean_text",
            return_value="demo",
        ), patch.object(
            pipeline,
            "build_chunks",
            build_chunks,
        ), patch.object(
            pipeline,
            "build_chunk_records",
            return_value=[
                pipeline.ChunkRecord(
                    chunk_id="document-1:0",
                    text="demo chunk",
                    metadata={},
                )
            ],
        ), patch.object(
            pipeline,
            "ensure_collection",
            return_value={"id": "collection-1", "name": "global_docs"},
        ), patch.object(
            pipeline,
            "create_embeddings",
            create_embeddings,
        ), patch.object(
            pipeline,
            "delete_document_chunks",
            return_value=None,
        ), patch.object(
            pipeline,
            "upsert_chunk_records",
            return_value=None,
        ):
            pipeline.process_document(
                {
                    "knowledgeId": "knowledge-1",
                    "documentId": "document-1",
                    "sourceType": "global_docs",
                    "fileName": "demo.md",
                    "mimeType": "text/markdown",
                    "storagePath": "/tmp/demo.md",
                    "documentVersionHash": "hash-1",
                    "embeddingConfig": {
                        "provider": "custom",
                        "apiKey": "db-key",
                        "baseUrl": "https://embedding.example.com/v1",
                        "model": "text-embedding-custom",
                    },
                    "indexingConfig": {
                        "chunkSize": 860,
                        "chunkOverlap": 120,
                        "supportedTypes": ["md"],
                        "indexerTimeoutMs": 45000,
                    },
                }
            )

        build_chunks.assert_called_once_with("demo", chunk_size=860, overlap=120)
        create_embeddings.assert_called_once()
        self.assertEqual(create_embeddings.call_args.args[0], ["demo chunk"])
        self.assertEqual(
            create_embeddings.call_args.args[1],
            pipeline.EmbeddingRuntimeConfig(
                provider="custom",
                api_key="db-key",
                base_url="https://embedding.example.com/v1",
                model="text-embedding-custom",
            ),
        )


class DeleteChunksTest(unittest.TestCase):
    def test_delete_document_vectors_uses_document_selector(self):
        with patch.object(
            pipeline,
            "find_collection",
            return_value={"id": "collection-1", "name": "global_docs"},
        ), patch.object(pipeline, "request_json", return_value={}) as request_json:
            response = pipeline.delete_document_vectors(
                "document-1",
                {
                    "collectionName": "global_docs",
                },
            )

        request_json.assert_called_once_with(
            pipeline.build_chroma_database_url("/collections/collection-1/delete"),
            method="POST",
            timeout_ms=pipeline.DEFAULT_CHROMA_TIMEOUT_MS,
            payload={
                "where": {
                    "documentId": "document-1",
                }
            },
            error_prefix="Chroma 文档向量删除失败",
        )
        self.assertEqual(
            response,
            {
                "status": "completed",
                "documentId": "document-1",
                "collectionName": "global_docs",
            },
        )

    def test_delete_knowledge_vectors_noops_when_collection_is_missing(self):
        with patch.object(
            pipeline,
            "find_collection",
            return_value=None,
        ), patch.object(pipeline, "request_json") as request_json:
            response = pipeline.delete_knowledge_vectors(
                "knowledge-1",
                {
                    "collectionName": "global_docs",
                },
            )

        request_json.assert_not_called()
        self.assertEqual(
            response,
            {
                "status": "completed",
                "knowledgeId": "knowledge-1",
                "collectionName": "global_docs",
            },
        )


if __name__ == "__main__":
    unittest.main()
