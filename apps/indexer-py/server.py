from __future__ import annotations

import json
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from pipeline import (
    DEFAULT_CHUNK_OVERLAP,
    DEFAULT_CHUNK_SIZE,
    IndexerError,
    process_document,
)


HOST = os.getenv("KNOWLEDGE_INDEXER_HOST", "127.0.0.1")
PORT = int(os.getenv("KNOWLEDGE_INDEXER_PORT", "8001"))


class IndexerRequestHandler(BaseHTTPRequestHandler):
    server_version = "KnowjectIndexer/0.1"

    def do_GET(self) -> None:
        if self.path != "/health":
            self.respond(
                HTTPStatus.NOT_FOUND,
                {
                    "status": "not_found",
                    "message": "Unknown route",
                },
            )
            return

        self.respond(
            HTTPStatus.OK,
            {
                "status": "ok",
                "service": "knowject-indexer-py",
                "chunkSize": DEFAULT_CHUNK_SIZE,
                "chunkOverlap": DEFAULT_CHUNK_OVERLAP,
                "supportedFormats": ["md", "txt"],
            },
        )

    def do_POST(self) -> None:
        if self.path != "/internal/index-documents":
            self.respond(
                HTTPStatus.NOT_FOUND,
                {
                    "status": "not_found",
                    "message": "Unknown route",
                },
            )
            return

        try:
            payload = self.read_json_body()
            result = process_document(payload)
            self.respond(HTTPStatus.OK, result)
        except IndexerError as error:
            self.respond(
                HTTPStatus.UNPROCESSABLE_ENTITY,
                {
                    "status": "failed",
                    "errorMessage": str(error),
                },
            )
        except json.JSONDecodeError:
            self.respond(
                HTTPStatus.BAD_REQUEST,
                {
                    "status": "failed",
                    "errorMessage": "请求体必须是合法 JSON",
                },
            )
        except Exception as error:  # noqa: BLE001
            self.respond(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {
                    "status": "failed",
                    "errorMessage": f"Python indexer 内部错误: {error}",
                },
            )

    def read_json_body(self) -> dict[str, Any]:
        content_length = int(self.headers.get("content-length", "0"))
        if content_length <= 0:
            raise IndexerError("请求体不能为空")

        raw_body = self.rfile.read(content_length)
        payload = json.loads(raw_body.decode("utf-8"))

        if not isinstance(payload, dict):
            raise IndexerError("请求体必须是 JSON object")

        return payload

    def respond(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format: str, *args: Any) -> None:
        return


def serve() -> None:
    server = ThreadingHTTPServer((HOST, PORT), IndexerRequestHandler)
    print(
        f"[knowject-indexer-py] listening on http://{HOST}:{PORT}",
        flush=True,
    )
    server.serve_forever()


if __name__ == "__main__":
    serve()
