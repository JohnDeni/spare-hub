# Spare Hub
Spare Hub is an online marketplace for tractor parts and agronomy supplies. It helps farmers and agribusiness teams browse listings, compare options, and order trusted parts with clear categories and fast search.


## Installation

Install project dependencies from `requirements.txt`:

```bash
# (Optional) create and activate a virtual environment
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows (PowerShell)
# .venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

Install frontend dependencies:

```bash
npm install
```

## Run frontend + backend for development

From the repository root, run:

```bash
npm run dev:full
```

This starts:
- frontend (Vite) on your local dev port (shown in terminal)
- backend (Django) on `http://localhost:8000`

If you want to run only one side:

```bash
npm run dev      # frontend only
npm run dev:be   # backend only
```

## Run with Docker

The Django app, PostgreSQL, and the frontend dev server can all run in
containers instead of a local virtualenv/Postgres/Node install.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose (bundled
  with Docker Desktop).

### First-time setup

```bash
cp .env.example .env
# edit .env if you want different credentials — the defaults work as-is
```

If you already have a `.env` from the non-Docker setup, you can keep using
it: `docker-compose.yml` reads `DB_NAME`/`DB_USER`/`DB_PASSWORD` from it for
the Postgres container, and overrides `DB_HOST`/`DB_PORT` automatically so
Django reaches the containerized database instead of `localhost`.

### Common commands

```bash
# Build images and start the app + database (foreground, logs streaming)
docker compose up --build

# Same, but detached
docker compose up -d

# Follow logs for one service
docker compose logs -f web
docker compose logs -f frontend

# Run management commands inside the running container
docker compose exec web python manage.py createsuperuser
docker compose exec web python manage.py test

# Run only the backend + database (skip the frontend container — e.g. if
# you'd rather run `npm run dev` on the host)
docker compose up db web

# Stop containers (keeps the database volume)
docker compose down

# Stop and wipe the database volume too (fresh Postgres next time)
docker compose down -v
```

On startup, the `web` container automatically runs `python manage.py
migrate` before starting the dev server (`0.0.0.0:8000`), so the database
schema is always up to date. Project files are bind-mounted into both the
`web` and `frontend` containers, so code edits on the host are picked up
immediately — no rebuild needed (only `docker compose up --build` if
`requirements.txt` or `package.json`/`package-lock.json` change).

**Ports**: the frontend is at `http://localhost:8080`, the API at
`http://localhost:8000`, same as running everything on the host directly.
Postgres is exposed on host port `5433` (not `5432`), so it won't clash with
a Postgres you might already have running locally — connect a GUI client
(TablePlus, pgAdmin, etc.) to `localhost:5433` if you want to inspect data
directly. Database data persists in a named Docker volume
(`postgres_data`) across restarts; `docker compose down -v` is the only
thing that clears it.

**Frontend server-side rendering**: TanStack Start renders the first page
load on the server. Inside the `frontend` container that server-side code
can't infer the API host from the browser's address bar (there is no
browser yet), so it uses `SSR_API_BASE_URL` (set to `http://web:8000` in
`docker-compose.yml`, the backend's service name on the Docker network)
instead. This only affects that one server-side fetch — everything the
browser itself calls still goes to `http://localhost:8000` as usual.

## Code style and pre-commit

This repository enforces consistent code style and best practices using Black (formatter), Ruff (linter and import sorter), and pre-commit hooks.

### One-time setup
```bash
pip install pre-commit
pre-commit install
```

### Run checks and auto-fixes locally
```bash
# Run all hooks on all files
pre-commit run --all-files

# Or run specific tools directly
black .
ruff check --fix .
```

Conventions enforced:
- Double quotes for strings where possible (Ruff Q rules)
- Imports sorted consistently (Ruff isort)
- Trailing whitespace trimmed and a newline at end of file
- Line length formatted by Black at 88; Ruff E501 (line-too-long) is ignored to allow long constants/URLs
- Black-compatible formatting and various lint checks
