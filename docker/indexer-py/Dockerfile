FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY apps/indexer-py/ /app/

EXPOSE 8001

CMD ["python3", "server.py"]
