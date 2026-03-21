from __future__ import annotations

import unittest

from app.domain.indexing.chunking import ChunkBuilder
from app.domain.indexing.pipeline import IndexerError
from app.domain.indexing.segments import ParsedSegment


class ChunkingTest(unittest.TestCase):
    def setUp(self) -> None:
        self.builder = ChunkBuilder(error_factory=IndexerError)

    def test_large_block_does_not_duplicate_overlap_before_next_block(self):
        text = ("a" * 1500) + "\n\n" + ("b" * 150)

        chunks = self.builder.build_chunks(text, chunk_size=1000, overlap=200)

        self.assertEqual(len(chunks), 2)
        self.assertEqual(len(chunks[0]), 1000)
        self.assertEqual(len(chunks[1]), 852)
        self.assertTrue(chunks[1].endswith("b" * 150))

    def test_regular_blocks_still_reuse_previous_chunk_tail(self):
        text = ("a" * 450) + "\n\n" + ("b" * 450) + "\n\n" + ("c" * 300)

        chunks = self.builder.build_chunks(text, chunk_size=1000, overlap=200)

        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[1].split("\n\n", 1)[0], chunks[0][-200:])

    def test_build_segment_chunks_preserves_single_segment_chunking_result(self):
        segments = [
            ParsedSegment(
                text=("a" * 450) + "\n\n" + ("b" * 450) + "\n\n" + ("c" * 300),
                source_kind="md",
                order=0,
            )
        ]

        chunk_texts = self.builder.build_chunks(segments[0].text, chunk_size=1000, overlap=200)
        segment_chunks = self.builder.build_segment_chunks(
            segments,
            chunk_size=1000,
            overlap=200,
        )

        self.assertEqual([item.text for item in segment_chunks], chunk_texts)

    def test_build_chunk_records_from_segment_chunks_adds_foundation_metadata(self):
        request = type(
            "ChunkRequest",
            (),
            {
                "knowledge_id": "knowledge-1",
                "document_id": "document-1",
                "source_type": "global_docs",
                "file_name": "demo.md",
                "document_version_hash": "hash-1",
                "collection_name": "global_docs",
            },
        )()
        segment_chunks = [
            self.builder.build_segment_chunks(
                [
                    ParsedSegment(
                        text="hello world",
                        source_kind="md",
                        order=0,
                    )
                ],
                chunk_size=1000,
                overlap=200,
            )[0]
        ]

        records = self.builder.build_chunk_records_from_segment_chunks(request, segment_chunks)

        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].metadata["knowledgeId"], "knowledge-1")
        self.assertEqual(records[0].metadata["sourceKind"], "md")
        self.assertEqual(records[0].metadata["fileName"], "demo.md")
        self.assertEqual(records[0].metadata["chunkAnchorLabel"], "段落 1")
        self.assertEqual(records[0].metadata["order"], 0)

    def test_build_segment_chunks_keeps_pdf_chunks_within_single_page(self):
        segments = [
            ParsedSegment(
                text=("A" * 640) + "\n\n" + ("B" * 640),
                source_kind="pdf",
                order=0,
                page_number=1,
            ),
            ParsedSegment(
                text=("C" * 640) + "\n\n" + ("D" * 640),
                source_kind="pdf",
                order=1,
                page_number=2,
            ),
        ]

        segment_chunks = self.builder.build_segment_chunks(
            segments,
            chunk_size=1000,
            overlap=200,
        )

        self.assertEqual([item.segment.page_number for item in segment_chunks], [1, 1, 2, 2])
        self.assertIn("A" * 640, segment_chunks[0].text)
        self.assertNotIn("C" * 100, segment_chunks[1].text)
        self.assertIn("C" * 640, segment_chunks[2].text)

    def test_build_chunk_records_from_segment_chunks_adds_pdf_page_metadata(self):
        request = type(
            "ChunkRequest",
            (),
            {
                "knowledge_id": "knowledge-1",
                "document_id": "document-1",
                "source_type": "global_docs",
                "file_name": "demo.pdf",
                "document_version_hash": "hash-1",
                "collection_name": "global_docs",
            },
        )()
        segment_chunks = [
            self.builder.build_segment_chunks(
                [
                    ParsedSegment(
                        text="pdf page 1",
                        source_kind="pdf",
                        order=0,
                        page_number=1,
                    )
                ],
                chunk_size=1000,
                overlap=200,
            )[0]
        ]

        records = self.builder.build_chunk_records_from_segment_chunks(request, segment_chunks)

        self.assertEqual(records[0].metadata["chunkAnchorLabel"], "第 1 页")
        self.assertEqual(records[0].metadata["pageNumber"], 1)

    def test_build_segment_chunks_keeps_docx_chunks_within_single_section(self):
        segments = [
            ParsedSegment(
                text=("A" * 640) + "\n\n" + ("B" * 640),
                source_kind="docx",
                order=0,
                section_title="Overview",
                heading_level=1,
            ),
            ParsedSegment(
                text=("C" * 640) + "\n\n" + ("D" * 640),
                source_kind="docx",
                order=1,
                section_title="Details",
                heading_level=2,
            ),
        ]

        segment_chunks = self.builder.build_segment_chunks(
            segments,
            chunk_size=1000,
            overlap=200,
        )

        self.assertEqual(
            [item.segment.section_title for item in segment_chunks],
            ["Overview", "Overview", "Details", "Details"],
        )
        self.assertNotIn("C" * 100, segment_chunks[1].text)
        self.assertIn("C" * 640, segment_chunks[2].text)

    def test_build_segment_chunks_keeps_xlsx_chunks_within_single_sheet(self):
        segments = [
            ParsedSegment(
                text=("Roadmap: " + ("A" * 980)),
                source_kind="xlsx",
                order=0,
                sheet_name="Roadmap",
                row_index=2,
                header_path=("Feature",),
            ),
            ParsedSegment(
                text=("Metrics: " + ("B" * 980)),
                source_kind="xlsx",
                order=1,
                sheet_name="Metrics",
                row_index=2,
                header_path=("Name",),
            ),
        ]

        segment_chunks = self.builder.build_segment_chunks(
            segments,
            chunk_size=600,
            overlap=100,
        )

        self.assertTrue(all(item.segment.sheet_name == "Roadmap" for item in segment_chunks[:2]))
        self.assertTrue(all(item.segment.sheet_name == "Metrics" for item in segment_chunks[2:]))

    def test_build_chunk_records_from_segment_chunks_adds_docx_metadata(self):
        request = type(
            "ChunkRequest",
            (),
            {
                "knowledge_id": "knowledge-1",
                "document_id": "document-1",
                "source_type": "global_docs",
                "file_name": "demo.docx",
                "document_version_hash": "hash-1",
                "collection_name": "global_docs",
            },
        )()
        segment_chunks = self.builder.build_segment_chunks(
            [
                ParsedSegment(
                    text="Overview\n\nIntro paragraph",
                    source_kind="docx",
                    order=0,
                    section_title="Overview",
                    heading_level=1,
                )
            ],
            chunk_size=1000,
            overlap=200,
        )

        records = self.builder.build_chunk_records_from_segment_chunks(request, segment_chunks)

        self.assertEqual(records[0].metadata["sourceKind"], "docx")
        self.assertEqual(records[0].metadata["sectionTitle"], "Overview")
        self.assertEqual(records[0].metadata["headingLevel"], 1)
        self.assertEqual(records[0].metadata["chunkAnchorLabel"], "Overview")

    def test_build_chunk_records_from_segment_chunks_adds_xlsx_metadata(self):
        request = type(
            "ChunkRequest",
            (),
            {
                "knowledge_id": "knowledge-1",
                "document_id": "document-1",
                "source_type": "global_docs",
                "file_name": "demo.xlsx",
                "document_version_hash": "hash-1",
                "collection_name": "global_docs",
            },
        )()
        segment_chunks = self.builder.build_segment_chunks(
            [
                ParsedSegment(
                    text="Roadmap | 第 2 行\nFeature: Upload\nStatus: Done",
                    source_kind="xlsx",
                    order=0,
                    sheet_name="Roadmap",
                    row_index=2,
                    header_path=("Feature", "Status"),
                )
            ],
            chunk_size=1000,
            overlap=200,
        )

        records = self.builder.build_chunk_records_from_segment_chunks(request, segment_chunks)

        self.assertEqual(records[0].metadata["sourceKind"], "xlsx")
        self.assertEqual(records[0].metadata["sheetName"], "Roadmap")
        self.assertEqual(records[0].metadata["rowIndex"], 2)
        self.assertEqual(records[0].metadata["headerPath"], ["Feature", "Status"])
        self.assertEqual(records[0].metadata["chunkAnchorLabel"], "Roadmap 第 2 行")


if __name__ == "__main__":
    unittest.main()
