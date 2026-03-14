from __future__ import annotations

from pathlib import Path

from app.core import runtime_env


def test_runtime_env_looks_up_env_files_from_repository_root():
    repository_root = Path(__file__).resolve().parents[3]

    assert runtime_env.WORKSPACE_ROOT == repository_root
