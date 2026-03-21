from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

from pypdf import PdfReader

from app.domain.indexing.segments import ParsedSegment


ErrorFactory = Callable[[str], Exception]
CleanTextCallable = Callable[[str], str]


def parse_pdf_segments(
    *,
    path: Path,
    error_factory: ErrorFactory,
    clean_text: CleanTextCallable,
) -> list[ParsedSegment]:
    try:
        reader = PdfReader(str(path))
    except Exception as error:
        raise error_factory("PDF 解析失败，请确认文件未损坏") from error

    segments: list[ParsedSegment] = []
    for page_index, page in enumerate(reader.pages):
        raw_text = page.extract_text() or ""
        page_text = clean_text(raw_text)
        if not page_text:
            continue

        segments.append(
            ParsedSegment(
                text=page_text,
                source_kind="pdf",
                order=len(segments),
                page_number=page_index + 1,
            )
        )

    if not segments:
        raise error_factory("PDF 未提取到可用文本，当前暂不支持 OCR 扫描件")

    return segments
