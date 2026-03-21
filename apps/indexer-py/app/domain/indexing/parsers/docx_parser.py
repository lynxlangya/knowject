from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from docx import Document
from docx.document import Document as DocxDocument
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph

from app.domain.indexing.segments import ParsedSegment


ErrorFactory = Callable[[str], Exception]

HEADING_STYLE_PATTERN = re.compile(r"^heading\s+(\d+)$", re.IGNORECASE)


@dataclass
class _DocxSectionBuilder:
    heading: str | None = None
    heading_level: int | None = None
    lines: list[str] | None = None

    def append(self, line: str) -> None:
        if self.lines is None:
            self.lines = []
        self.lines.append(line)

    def render_text(self) -> str:
        body = "\n\n".join(line.strip() for line in (self.lines or []) if line.strip())
        if self.heading and body:
            return f"{self.heading}\n\n{body}"
        if self.heading:
            return self.heading
        return body


def parse_docx_segments(
    *,
    path: Path,
    error_factory: ErrorFactory,
    clean_text: Callable[[str], str],
) -> list[ParsedSegment]:
    try:
        document = Document(path)
    except Exception as error:  # pragma: no cover - library specific errors
        raise error_factory(f"DOCX 解析失败：{error}") from error

    raw_sections: list[tuple[str, str | None, int | None]] = []
    section_builder = _DocxSectionBuilder()

    def flush_section() -> None:
        text = clean_text(section_builder.render_text())
        if not text:
            return
        raw_sections.append((text, section_builder.heading, section_builder.heading_level))

    for block in _iter_block_items(document):
        if isinstance(block, Paragraph):
            content = clean_text(block.text)
            if not content:
                continue

            heading_level = _extract_heading_level(block)
            if heading_level is not None:
                flush_section()
                section_builder = _DocxSectionBuilder(
                    heading=content,
                    heading_level=heading_level,
                )
                continue

            section_builder.append(content)
            continue

        if isinstance(block, Table):
            for row_text in _table_row_texts(block, clean_text):
                section_builder.append(row_text)

    flush_section()
    return [
        ParsedSegment(
            text=text,
            source_kind="docx",
            order=index,
            section_title=section_title,
            heading_level=heading_level,
        )
        for index, (text, section_title, heading_level) in enumerate(raw_sections)
    ]


def _iter_block_items(document: DocxDocument):
    for child in document.element.body.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, document)
        elif isinstance(child, CT_Tbl):
            yield Table(child, document)


def _extract_heading_level(paragraph: Paragraph) -> int | None:
    style_name = paragraph.style.name if paragraph.style is not None else ""
    match = HEADING_STYLE_PATTERN.match(style_name.strip())
    if not match:
        return None

    return int(match.group(1))


def _table_row_texts(table: Table, clean_text: Callable[[str], str]) -> list[str]:
    rows: list[str] = []
    for row in table.rows:
        cells = [clean_text(cell.text) for cell in row.cells]
        values = [value for value in cells if value]
        if not values:
            continue
        if len(values) == 2:
            rows.append(f"{values[0]}: {values[1]}")
            continue
        rows.append(" | ".join(values))
    return rows
