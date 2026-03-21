from __future__ import annotations

from app.domain.indexing.segments import ParsedSegment


def parse_text_segments(*, text: str, source_kind: str) -> list[ParsedSegment]:
    normalized_kind = "md" if source_kind == "md" else "txt"
    if not text.strip():
        return []

    return [
        ParsedSegment(
            text=text,
            source_kind=normalized_kind,
            order=0,
        )
    ]
