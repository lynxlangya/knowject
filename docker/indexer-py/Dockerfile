FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_LINK_MODE=copy
ENV UV_PROJECT_ENVIRONMENT=/app/.venv
ENV PATH="/app/.venv/bin:${PATH}"

WORKDIR /app

RUN python3 -m pip install --no-cache-dir uv==0.10.0

COPY apps/indexer-py/pyproject.toml /app/pyproject.toml
COPY apps/indexer-py/uv.lock /app/uv.lock

RUN uv sync --frozen --no-dev

COPY apps/indexer-py/ /app/

EXPOSE 8001

CMD ["uv", "run", "--no-dev", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
