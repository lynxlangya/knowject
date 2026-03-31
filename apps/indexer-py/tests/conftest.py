from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


INDEXER_INTERNAL_ENV_KEYS = (
    "NODE_ENV",
    "KNOWLEDGE_INDEXER_INTERNAL_TOKEN",
    "KNOWLEDGE_INDEXER_INTERNAL_TOKEN_FILE",
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

        from app.core import runtime_env

        monkeypatch.setattr(runtime_env, "DEFAULT_ENV_CANDIDATES", ())
        monkeypatch.setattr(runtime_env, "_ENV_FILES_LOADED", False)

        main_module = importlib.import_module("app.main")
        main_module = importlib.reload(main_module)

        return TestClient(
            main_module.create_app(load_env_files=load_env_files),
            raise_server_exceptions=False,
        )

    return factory
