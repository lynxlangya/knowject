from __future__ import annotations

import importlib
import os
from pathlib import Path

def load_runtime_env_module():
    from app.core import runtime_env as runtime_env_module

    return importlib.reload(runtime_env_module)


def test_runtime_env_looks_up_env_files_from_repository_root():
    runtime_env = load_runtime_env_module()
    repository_root = Path(__file__).resolve().parents[3]

    assert runtime_env.WORKSPACE_ROOT == repository_root


def test_load_environment_files_prefers_process_env_over_env_file(
    monkeypatch,
    tmp_path: Path,
):
    runtime_env = load_runtime_env_module()
    env_file = tmp_path / ".env"
    env_file.write_text("KNOWLEDGE_INDEXER_INTERNAL_TOKEN=from-file\n", encoding="utf-8")

    monkeypatch.setenv("KNOWLEDGE_INDEXER_INTERNAL_TOKEN", "from-process")

    runtime_env.load_environment_files(candidates=(env_file,), force=True)

    assert os.environ["KNOWLEDGE_INDEXER_INTERNAL_TOKEN"] == "from-process"
