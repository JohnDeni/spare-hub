FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app

# psycopg2-binary bundles its own libpq, but the runtime lib is kept as a
# defensive dependency in case pip ever falls back to a source build.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir poetry==2.4.3

# Installed as a separate layer, keyed only on the lock file, so this step
# is cached and skipped unless dependencies actually change.
COPY pyproject.toml poetry.lock ./
# --only main: skip the dev group (ruff/black/pre-commit) — not needed to
# run the app, and keeps the image smaller.
RUN poetry install --only main --no-root

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
