from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


PROJECT_ROOT = Path(__file__).resolve().parents[1]
INDEXER_INTERNAL_ENV_KEYS = (
    "NODE_ENV",
    "KNOWLEDGE_INDEXER_INTERNAL_TOKEN",
    "KNOWLEDGE_INDEXER_INTERNAL_TOKEN_FILE",
)

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


@pytest.fixture
def indexer_test_client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    for name in INDEXER_INTERNAL_ENV_KEYS:
        monkeypatch.delenv(name, raising=False)

    monkeypatch.setenv("NODE_ENV", "development")

    from app.app_factory import create_app

    return TestClient(
        create_app(load_env_files=False),
        raise_server_exceptions=False,
    )


@pytest.fixture
def create_indexer_test_client(monkeypatch: pytest.MonkeyPatch):
    def factory(
        *,
        node_env: str = "development",
        internal_token: str | None = None,
        load_env_files: bool = False,
    ) -> TestClient:
        for name in INDEXER_INTERNAL_ENV_KEYS:
            monkeypatch.delenv(name, raising=False)

        monkeypatch.setenv("NODE_ENV", node_env)
        if internal_token is not None:
            monkeypatch.setenv("KNOWLEDGE_INDEXER_INTERNAL_TOKEN", internal_token)

        from app.app_factory import create_app

        return TestClient(
            create_app(load_env_files=load_env_files),
            raise_server_exceptions=False,
        )

    return factory
