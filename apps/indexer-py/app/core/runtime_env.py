from __future__ import annotations

"""Environment loading helpers shared by the FastAPI indexer runtime."""

import os
from pathlib import Path


ENV_FILE_SUFFIX = "_FILE"
WORKSPACE_ROOT = Path(__file__).resolve().parents[4]
BASE_ENV_KEYS = set(os.environ.keys())


def load_environment_files() -> None:
    for candidate in (WORKSPACE_ROOT / ".env", WORKSPACE_ROOT / ".env.local"):
        if not candidate.exists():
            continue

        parsed = parse_env_file(candidate)
        validate_parsed_environment(candidate, parsed)

        for name, value in parsed.items():
            if name in BASE_ENV_KEYS:
                continue
            os.environ[name] = value


def parse_env_file(path: Path) -> dict[str, str]:
    parsed: dict[str, str] = {}

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        normalized = raw_line[7:] if raw_line.startswith("export ") else raw_line
        name, separator, value = normalized.partition("=")

        if not separator:
            continue

        parsed[name.strip()] = value.strip()

    return parsed


def validate_parsed_environment(path: Path, parsed: dict[str, str]) -> None:
    for name in parsed:
        sibling_name = get_sibling_env_name(name)
        if sibling_name in parsed:
            raise RuntimeError(
                f"Environment file {path} cannot define both {name} and {sibling_name}"
            )


def get_sibling_env_name(name: str) -> str:
    if name.endswith(ENV_FILE_SUFFIX):
        return name[: -len(ENV_FILE_SUFFIX)]

    return f"{name}{ENV_FILE_SUFFIX}"


def read_configured_string(name: str) -> str | None:
    direct_value = os.getenv(name, "").strip()
    file_path = os.getenv(f"{name}_FILE", "").strip()

    if direct_value and file_path:
        raise RuntimeError(
            f"Environment variables {name} and {name}_FILE cannot be set together"
        )

    if direct_value:
        return direct_value

    if not file_path:
        return None

    content = Path(file_path).read_text(encoding="utf-8").strip()
    if not content:
        raise RuntimeError(f"Environment variable {name}_FILE points to an empty file")

    return content


def read_optional_string(name: str) -> str | None:
    return read_configured_string(name)


def read_required_string(name: str) -> str:
    value = read_configured_string(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def read_optional_positive_integer(name: str, fallback: int) -> int:
    value = read_optional_string(name)
    if not value:
        return fallback

    parsed = int(value)
    if parsed <= 0:
        raise RuntimeError(f"Environment variable {name} must be a positive integer")

    return parsed


load_environment_files()
