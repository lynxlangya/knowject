from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


PIPELINE_PATH = Path(__file__).resolve().parents[1] / "pipeline.py"


def load_pipeline_module():
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


if __name__ == "__main__":
    unittest.main()
