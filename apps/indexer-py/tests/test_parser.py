from __future__ import annotations

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from app.domain.indexing.parser import DocumentParser
from app.domain.indexing.pipeline import IndexDocumentRequest, IndexerError
from app.domain.indexing.runtime_config import IndexingRuntimeConfigResolver
from app.domain.indexing.embedding_client import EmbeddingRuntimeConfig


class ParserTest(unittest.TestCase):
    def setUp(self) -> None:
        resolver = IndexingRuntimeConfigResolver(error_factory=IndexerError)
        self.parser = DocumentParser(
            resolve_supported_extensions=resolver.resolve_supported_extensions,
            error_factory=IndexerError,
        )
        self.indexing_config = resolver.build_runtime_config()
        self.embedding_config = EmbeddingRuntimeConfig(
            provider="local_dev",
            api_key=None,
            base_url="https://api.openai.com/v1",
            model="text-embedding-3-small",
        )

    def test_parse_document_text_reads_utf8_markdown(self):
        with TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "demo.md"
            path.write_text("hello\n\nworld", encoding="utf-8")
            request = IndexDocumentRequest(
                knowledge_id="knowledge-1",
                document_id="document-1",
                source_type="global_docs",
                collection_name="global_docs",
                file_name="demo.md",
                mime_type="text/markdown",
                storage_path=str(path),
                document_version_hash="hash-1",
                embedding_config=self.embedding_config,
                indexing_config=self.indexing_config,
            )

            text = self.parser.parse_document_text(request)

        self.assertEqual(text, "hello\n\nworld")

    def test_clean_text_collapses_extra_blank_runs(self):
        cleaned = self.parser.clean_text("a\r\n\r\n\r\nb\r\n\r\n\r\n\r\nc")

        self.assertEqual(cleaned, "a\n\n\nb\n\n\nc")


if __name__ == "__main__":
    unittest.main()
