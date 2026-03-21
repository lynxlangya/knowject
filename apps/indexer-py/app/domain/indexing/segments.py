from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


SourceKind = Literal["pdf", "docx", "xlsx", "md", "txt"]


@dataclass(frozen=True)
class ParsedSegment:
    text: str
    source_kind: SourceKind
    order: int
    page_number: int | None = None
    section_title: str | None = None
    heading_level: int | None = None
    sheet_name: str | None = None
    row_index: int | None = None
    header_path: tuple[str, ...] | None = None


def build_chunk_anchor_label(segment: ParsedSegment) -> str:
    if segment.page_number is not None:
        return f"第 {segment.page_number} 页"

    if segment.sheet_name is not None:
        if segment.row_index is not None:
            return f"{segment.sheet_name} 第 {segment.row_index} 行"
        return segment.sheet_name

    if segment.section_title:
        return segment.section_title

    return f"段落 {segment.order + 1}"
