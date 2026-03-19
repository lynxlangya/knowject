from __future__ import annotations

import unittest

from app.domain.indexing.pipeline import IndexerError
from app.domain.indexing.runtime_config import IndexingRuntimeConfigResolver


class RuntimeConfigTest(unittest.TestCase):
    def test_build_runtime_config_accepts_request_level_overrides(self):
        resolver = IndexingRuntimeConfigResolver(error_factory=IndexerError)

        config = resolver.build_runtime_config(
            chunk_size=860,
            chunk_overlap=120,
            supported_types=["markdown", "txt"],
            indexer_timeout_ms=45000,
        )

        self.assertEqual(config.chunk_size, 860)
        self.assertEqual(config.chunk_overlap, 120)
        self.assertEqual(config.supported_types, ("md", "txt"))
        self.assertEqual(config.indexer_timeout_ms, 45000)

    def test_build_runtime_config_rejects_overlap_ge_chunk_size(self):
        resolver = IndexingRuntimeConfigResolver(error_factory=IndexerError)

        with self.assertRaisesRegex(IndexerError, "indexingConfig.chunkOverlap 必须小于 chunkSize"):
            resolver.build_runtime_config(chunk_size=100, chunk_overlap=100)

    def test_build_runtime_config_preserves_zero_chunk_overlap(self):
        resolver = IndexingRuntimeConfigResolver(error_factory=IndexerError)

        config = resolver.build_runtime_config(chunk_size=860, chunk_overlap=0)

        self.assertEqual(config.chunk_size, 860)
        self.assertEqual(config.chunk_overlap, 0)


if __name__ == "__main__":
    unittest.main()
