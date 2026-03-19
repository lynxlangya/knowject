from __future__ import annotations

import unittest

from app.domain.indexing.diagnostics import DiagnosticsCollector
from app.domain.indexing.pipeline import IndexerError


class DiagnosticsTest(unittest.TestCase):
    def test_collect_diagnostics_reports_runtime_embedding_provider_without_rewriting_it(self):
        collector = DiagnosticsCollector(
            request_json=lambda *_args, **_kwargs: {"collections": []},
            build_chroma_database_url=lambda path: f"https://chroma.example{path}",
            resolve_embedding_provider=lambda: ("voyage", None),
            handled_error_type=IndexerError,
            chunk_size=860,
            chunk_overlap=120,
            supported_formats=["md"],
        )

        diagnostics = collector.collect_diagnostics()

        self.assertEqual(diagnostics["status"], "ok")
        self.assertEqual(diagnostics["embeddingProvider"], "voyage")
        self.assertEqual(diagnostics["chunkSize"], 860)
        self.assertEqual(diagnostics["chunkOverlap"], 120)
        self.assertEqual(diagnostics["supportedFormats"], ["md"])

    def test_collect_diagnostics_merges_embedding_and_chroma_errors(self):
        collector = DiagnosticsCollector(
            request_json=lambda *_args, **_kwargs: (_ for _ in ()).throw(IndexerError("Chroma down")),
            build_chroma_database_url=lambda path: f"https://chroma.example{path}",
            resolve_embedding_provider=lambda: ("unconfigured", "OPENAI_API_KEY 未配置，无法生成 embedding"),
            handled_error_type=IndexerError,
            chunk_size=1000,
            chunk_overlap=200,
            supported_formats=["md", "txt"],
        )

        diagnostics = collector.collect_diagnostics()

        self.assertEqual(diagnostics["status"], "degraded")
        self.assertEqual(diagnostics["embeddingProvider"], "unconfigured")
        self.assertEqual(diagnostics["chromaReachable"], False)
        self.assertEqual(
            diagnostics["errorMessage"],
            "OPENAI_API_KEY 未配置，无法生成 embedding; Chroma down",
        )


if __name__ == "__main__":
    unittest.main()
