from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch


PIPELINE_PATH = Path(__file__).resolve().parents[1] / "pipeline.py"
PIPELINE_DIR = PIPELINE_PATH.parent


def load_pipeline_module():
    if str(PIPELINE_DIR) not in sys.path:
        sys.path.insert(0, str(PIPELINE_DIR))

    spec = importlib.util.spec_from_file_location(
        "knowject_indexer_pipeline_test",
        PIPELINE_PATH,
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


pipeline = load_pipeline_module()


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


class ProcessDocumentTest(unittest.TestCase):
    def test_process_document_checks_collection_before_embedding(self):
        request = pipeline.IndexDocumentRequest(
            knowledge_id="knowledge-1",
            document_id="document-1",
            source_type="global_docs",
            file_name="demo.md",
            mime_type="text/markdown",
            storage_path="/tmp/demo.md",
            document_version_hash="hash-1",
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


if __name__ == "__main__":
    unittest.main()
