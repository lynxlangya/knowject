from __future__ import annotations

from pathlib import Path

from app.core import runtime_env


def test_runtime_env_looks_up_env_files_from_repository_root():
    repository_root = Path(__file__).resolve().parents[3]

    assert runtime_env.WORKSPACE_ROOT == repository_root


def test_runtime_env_prefers_process_env_over_file(monkeypatch, tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("SAMPLE_FLAG=file-value\n")

    monkeypatch.setenv("SAMPLE_FLAG", "process-value")

    runtime_env.load_environment_files(candidates=(env_file,), force=True)

    assert runtime_env.read_optional_string("SAMPLE_FLAG") == "process-value"
