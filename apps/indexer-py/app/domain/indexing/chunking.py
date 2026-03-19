from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Protocol


ErrorFactory = Callable[[str], Exception]


@dataclass(frozen=True)
class ChunkBlock:
    text: str
    carries_overlap: bool = False


@dataclass(frozen=True)
class ChunkRecord:
    chunk_id: str
    text: str
    metadata: dict[str, Any]


class ChunkRequestLike(Protocol):
    knowledge_id: str
    document_id: str
    source_type: str
    file_name: str
    document_version_hash: str
    collection_name: str


@dataclass
class ChunkBuilder:
    error_factory: ErrorFactory

    def build_chunks(self, text: str, chunk_size: int, overlap: int) -> list[str]:
        if chunk_size <= 0:
            raise self.error_factory("chunk_size 必须大于 0")

        if overlap < 0 or overlap >= chunk_size:
            raise self.error_factory("chunk_overlap 必须满足 0 <= overlap < chunk_size")

        blocks = self.split_blocks(text, chunk_size, overlap)
        if not blocks:
            return []

        chunks: list[str] = []
        prefix = ""
        current_blocks: list[str] = []

        for block in blocks:
            candidate = self.join_chunk(prefix, current_blocks + [block.text])
            if current_blocks and len(candidate) > chunk_size:
                chunk = self.join_chunk(prefix, current_blocks)
                chunks.append(chunk)
                prefix = chunk[-overlap:].strip() if overlap > 0 else ""
                current_blocks = [block.text]

                if block.carries_overlap:
                    prefix = ""

                if len(self.join_chunk(prefix, current_blocks)) > chunk_size:
                    allowed_prefix_length = max(chunk_size - len(block.text) - 2, 0)
                    prefix = prefix[-allowed_prefix_length:].strip() if allowed_prefix_length else ""
                continue

            current_blocks.append(block.text)

        if current_blocks:
            chunks.append(self.join_chunk(prefix, current_blocks))

        return [chunk for chunk in chunks if chunk.strip()]

    def split_blocks(self, text: str, chunk_size: int, overlap: int) -> list[ChunkBlock]:
        base_blocks: list[str] = []
        current_lines: list[str] = []

        for line in text.split("\n"):
            if line.strip():
                current_lines.append(line)
                continue

            if current_lines:
                base_blocks.append("\n".join(current_lines).strip())
                current_lines = []

        if current_lines:
            base_blocks.append("\n".join(current_lines).strip())

        expanded_blocks: list[ChunkBlock] = []
        for block in base_blocks:
            if len(block) <= chunk_size:
                expanded_blocks.append(ChunkBlock(text=block))
                continue

            expanded_blocks.extend(self.split_large_block(block, chunk_size, overlap))

        return expanded_blocks

    def split_large_block(self, block: str, chunk_size: int, overlap: int) -> list[ChunkBlock]:
        pieces: list[ChunkBlock] = []
        start = 0

        while start < len(block):
            end = min(start + chunk_size, len(block))
            piece = block[start:end].strip()
            if piece:
                pieces.append(ChunkBlock(text=piece, carries_overlap=start > 0))

            if end >= len(block):
                break

            start = end - overlap

        return pieces

    def join_chunk(self, prefix: str, blocks: list[str]) -> str:
        parts = [part for part in [prefix.strip(), "\n\n".join(blocks).strip()] if part]
        return "\n\n".join(parts).strip()

    def build_chunk_records(
        self,
        request: ChunkRequestLike,
        chunk_texts: list[str],
    ) -> list[ChunkRecord]:
        records: list[ChunkRecord] = []

        for index, chunk_text in enumerate(chunk_texts):
            chunk_id = f"{request.document_id}:{index}"
            records.append(
                ChunkRecord(
                    chunk_id=chunk_id,
                    text=chunk_text,
                    metadata={
                        "knowledgeId": request.knowledge_id,
                        "documentId": request.document_id,
                        "type": request.source_type,
                        "source": request.file_name,
                        "chunkIndex": index,
                        "chunkId": chunk_id,
                        "documentVersionHash": request.document_version_hash,
                        "collectionName": request.collection_name,
                    },
                )
            )

        return records
