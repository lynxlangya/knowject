from __future__ import annotations

from http.client import IncompleteRead
import unittest
from unittest.mock import Mock, patch

from app.domain.indexing.parser import resolve_knowledge_storage_root
from app.domain.indexing import pipeline
from app.schemas.indexing import DeleteChunksRequestPayload, IndexDocumentRequestPayload
from app.domain.indexing.segments import ParsedSegment


def build_storage_path(file_name: str) -> str:
    return str(resolve_knowledge_storage_root() / file_name)


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

    def test_build_segment_chunks_preserves_single_md_segment_behavior(self):
        text = ("a" * 450) + "\n\n" + ("b" * 450) + "\n\n" + ("c" * 300)
        segments = [ParsedSegment(text=text, source_kind="md", order=0)]

        segment_chunks = pipeline.build_segment_chunks(segments, chunk_size=1000, overlap=200)
        chunks = pipeline.build_chunks(text, chunk_size=1000, overlap=200)

        self.assertEqual([item.text for item in segment_chunks], chunks)

    def test_build_chunk_records_from_segments_adds_foundation_metadata(self):
        request = pipeline.IndexDocumentRequest(
            knowledge_id="knowledge-1",
            document_id="document-1",
            source_type="global_docs",
            collection_name="global_docs",
            file_name="demo.md",
            mime_type="text/markdown",
            storage_path=build_storage_path("demo.md"),
            document_version_hash="hash-1",
            embedding_config=pipeline.EmbeddingRuntimeConfig(
                provider="local_dev",
                api_key=None,
                base_url="https://api.openai.com/v1",
                model="text-embedding-3-small",
            ),
            indexing_config=pipeline.IndexingRuntimeConfig(
                chunk_size=1000,
                chunk_overlap=200,
                supported_types=("md", "txt", "pdf", "docx", "xlsx"),
                indexer_timeout_ms=30000,
            ),
        )
        segments = [ParsedSegment(text="hello world", source_kind="md", order=0)]

        records = pipeline.build_chunk_records_from_segments(
            request,
            segments,
            chunk_size=1000,
            overlap=200,
        )

        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].metadata["sourceKind"], "md")
        self.assertEqual(records[0].metadata["fileName"], "demo.md")
        self.assertEqual(records[0].metadata["chunkAnchorLabel"], "段落 1")
        self.assertEqual(records[0].metadata["order"], 0)

    def test_build_chunk_records_from_segments_adds_pdf_page_metadata(self):
        request = pipeline.IndexDocumentRequest(
            knowledge_id="knowledge-1",
            document_id="document-1",
            source_type="global_docs",
            collection_name="global_docs",
            file_name="demo.pdf",
            mime_type="application/pdf",
            storage_path=build_storage_path("demo.pdf"),
            document_version_hash="hash-1",
            embedding_config=pipeline.EmbeddingRuntimeConfig(
                provider="local_dev",
                api_key=None,
                base_url="https://api.openai.com/v1",
                model="text-embedding-3-small",
            ),
            indexing_config=pipeline.IndexingRuntimeConfig(
                chunk_size=1000,
                chunk_overlap=200,
                supported_types=("md", "txt", "pdf", "docx", "xlsx"),
                indexer_timeout_ms=30000,
            ),
        )
        segments = [
            ParsedSegment(
                text="pdf page 1",
                source_kind="pdf",
                order=0,
                page_number=1,
            )
        ]

        records = pipeline.build_chunk_records_from_segments(
            request,
            segments,
            chunk_size=1000,
            overlap=200,
        )

        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].metadata["sourceKind"], "pdf")
        self.assertEqual(records[0].metadata["chunkAnchorLabel"], "第 1 页")
        self.assertEqual(records[0].metadata["pageNumber"], 1)

    def test_build_chunk_records_from_segments_adds_docx_section_metadata(self):
        request = pipeline.IndexDocumentRequest(
            knowledge_id="knowledge-1",
            document_id="document-1",
            source_type="global_docs",
            collection_name="global_docs",
            file_name="demo.docx",
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            storage_path=build_storage_path("demo.docx"),
            document_version_hash="hash-1",
            embedding_config=pipeline.EmbeddingRuntimeConfig(
                provider="local_dev",
                api_key=None,
                base_url="https://api.openai.com/v1",
                model="text-embedding-3-small",
            ),
            indexing_config=pipeline.IndexingRuntimeConfig(
                chunk_size=1000,
                chunk_overlap=200,
                supported_types=("md", "txt", "pdf", "docx", "xlsx"),
                indexer_timeout_ms=30000,
            ),
        )
        segments = [
            ParsedSegment(
                text="Overview\n\nIntro",
                source_kind="docx",
                order=0,
                section_title="Overview",
                heading_level=1,
            )
        ]

        records = pipeline.build_chunk_records_from_segments(
            request,
            segments,
            chunk_size=1000,
            overlap=200,
        )

        self.assertEqual(records[0].metadata["sectionTitle"], "Overview")
        self.assertEqual(records[0].metadata["headingLevel"], 1)

    def test_build_chunk_records_from_segments_adds_xlsx_row_metadata(self):
        request = pipeline.IndexDocumentRequest(
            knowledge_id="knowledge-1",
            document_id="document-1",
            source_type="global_docs",
            collection_name="global_docs",
            file_name="demo.xlsx",
            mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            storage_path=build_storage_path("demo.xlsx"),
            document_version_hash="hash-1",
            embedding_config=pipeline.EmbeddingRuntimeConfig(
                provider="local_dev",
                api_key=None,
                base_url="https://api.openai.com/v1",
                model="text-embedding-3-small",
            ),
            indexing_config=pipeline.IndexingRuntimeConfig(
                chunk_size=1000,
                chunk_overlap=200,
                supported_types=("md", "txt", "pdf", "docx", "xlsx"),
                indexer_timeout_ms=30000,
            ),
        )
        segments = [
            ParsedSegment(
                text="Roadmap | 第 2 行\nFeature: Upload",
                source_kind="xlsx",
                order=0,
                sheet_name="Roadmap",
                row_index=2,
                header_path=("Feature",),
            )
        ]

        records = pipeline.build_chunk_records_from_segments(
            request,
            segments,
            chunk_size=1000,
            overlap=200,
        )

        self.assertEqual(records[0].metadata["sheetName"], "Roadmap")
        self.assertEqual(records[0].metadata["rowIndex"], 2)
        self.assertEqual(records[0].metadata["headerPath"], ["Feature"])


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

        with patch.object(
            pipeline,
            "parse_document_segments",
            return_value=[ParsedSegment(text="demo", source_kind="md", order=0)],
        ), patch.object(
            pipeline,
            "build_segment_chunks",
            return_value=[
                pipeline.SegmentChunk(
                    text="demo chunk",
                    segment=ParsedSegment(text="demo", source_kind="md", order=0),
                    order=0,
                )
            ],
        ), patch.object(
            pipeline,
            "build_chunk_records_from_segment_chunks",
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
                pipeline.process_document(request)

        create_embeddings.assert_not_called()

    def test_to_domain_request_prefers_explicit_collection_name(self):
        request = IndexDocumentRequestPayload(
            knowledge_id="knowledge-1",
            document_id="document-1",
            source_type="global_docs",
            collection_name="proj_project-1_docs",
            file_name="demo.md",
            mime_type="text/markdown",
            storage_path=build_storage_path("demo.md"),
            document_version_hash="hash-1",
        )
        domain_request = request.to_domain_request()

        self.assertEqual(domain_request.collection_name, "proj_project-1_docs")

    def test_to_domain_request_accepts_request_level_overrides(self):
        request = IndexDocumentRequestPayload.model_validate(
            {
                "knowledgeId": "knowledge-1",
                "documentId": "document-1",
                "sourceType": "global_docs",
                "fileName": "demo.md",
                "mimeType": "text/markdown",
                "storagePath": build_storage_path("demo.md"),
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
        domain_request = request.to_domain_request()

        self.assertEqual(domain_request.embedding_config.provider, "custom")
        self.assertEqual(domain_request.embedding_config.api_key, "db-key")
        self.assertEqual(
            domain_request.embedding_config.base_url,
            "https://embedding.example.com/v1",
        )
        self.assertEqual(domain_request.embedding_config.model, "text-embedding-custom")
        self.assertEqual(domain_request.indexing_config.chunk_size, 860)
        self.assertEqual(domain_request.indexing_config.chunk_overlap, 120)
        self.assertEqual(domain_request.indexing_config.supported_types, ("md",))
        self.assertEqual(domain_request.indexing_config.indexer_timeout_ms, 45000)

    def test_process_document_uses_request_level_overrides(self):
        build_segment_chunks = Mock(
            return_value=[
                pipeline.SegmentChunk(
                    text="demo chunk",
                    segment=ParsedSegment(text="demo", source_kind="md", order=0),
                    order=0,
                )
            ]
        )
        create_embeddings = Mock(return_value=[[0.1]])
        delete_document_chunks = Mock(return_value=None)
        upsert_chunk_records = Mock(return_value=None)

        with patch.object(
            pipeline,
            "parse_document_segments",
            return_value=[ParsedSegment(text="demo", source_kind="md", order=0)],
        ), patch.object(
            pipeline,
            "build_segment_chunks",
            build_segment_chunks,
        ), patch.object(
            pipeline,
            "build_chunk_records_from_segment_chunks",
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
            delete_document_chunks,
        ), patch.object(
            pipeline,
            "upsert_chunk_records",
            upsert_chunk_records,
        ):
            request = IndexDocumentRequestPayload.model_validate(
                {
                    "knowledgeId": "knowledge-1",
                    "documentId": "document-1",
                    "sourceType": "global_docs",
                    "fileName": "demo.md",
                    "mimeType": "text/markdown",
                    "storagePath": build_storage_path("demo.md"),
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
            ).to_domain_request()
            pipeline.process_document(
                request
            )

        build_segment_chunks.assert_called_once_with(
            [ParsedSegment(text="demo", source_kind="md", order=0)],
            chunk_size=860,
            overlap=120,
        )
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
        delete_document_chunks.assert_called_once_with(
            "global_docs",
            "document-1",
        )
        upsert_chunk_records.assert_called_once_with(
            "global_docs",
            [
                pipeline.ChunkRecord(
                    chunk_id="document-1:0",
                    text="demo chunk",
                    metadata={},
                )
            ],
            [[0.1]],
        )


class DeleteChunksTest(unittest.TestCase):
    def test_delete_document_vectors_uses_document_selector(self):
        client = Mock()

        with patch.object(pipeline, "get_chroma_client", return_value=client):
            request = DeleteChunksRequestPayload(collection_name="global_docs").to_domain_request()
            response = pipeline.delete_document_vectors(
                "document-1",
                request,
            )

        client.delete_chunks_by_where.assert_called_once_with(
            "global_docs",
            {"documentId": "document-1"},
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
        client = Mock()

        with patch.object(pipeline, "get_chroma_client", return_value=client):
            request = DeleteChunksRequestPayload(collection_name="global_docs").to_domain_request()
            response = pipeline.delete_knowledge_vectors(
                "knowledge-1",
                request,
            )

        client.delete_chunks_by_where.assert_called_once_with(
            "global_docs",
            {"knowledgeId": "knowledge-1"},
            error_prefix="Chroma 知识库向量删除失败",
        )
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
