# CLAUDE.md — orientation for working in Spare Hub

This file is for understanding the codebase quickly — architecture, domain
model, and day-to-day workflow. For frontend brand/design rules (colors,
fonts, copy voice, naming), **`AGENTS.md` is the single source of truth** —
read it before touching anything user-facing; don't duplicate its rules here.

## What this project is

Spare Hub is a marketplace for agronomy parts (tractor parts, irrigation,
sprayers, harvest gear, seeds, workshop tools) — sellers list parts, buyers
browse/search/order them, and buyers leave reviews on products they bought.

## Stack

- **Backend**: Django 5.2 + Django REST Framework, PostgreSQL, JWT auth
  (`djangorestframework-simplejwt`). API docs via `drf-spectacular`
  (`/api/schema/`, `/api/docs/`).
- **Frontend**: React 19 + TanStack Start (SSR) + TanStack Router/Query,
  Tailwind, shadcn/radix components. File-based routing under `src/routes/`.
- Frontend talks to the backend over `/api/...`; base URL resolves from the
  page's own hostname by default (`src/features/auth/client.ts`), so it
  works whether you're on `localhost` or a LAN IP.

## Repository layout

Backend — one Django app per domain, all under the project root (not
namespaced in a `backend/` folder):

| App | Owns |
|---|---|
| `accounts` | `User` (custom, email-based), `UserProfile`, `Seller` |
| `products` | `Product`, `Category`, `ProductImage`, `ProductHistory` |
| `orders` | `Order`, `OrderDetail` (buyer's purchases) |
| `feedback` | `Review`, `ReviewReply` (threaded), `ReviewImage` |
| `core` | Shared `Audit` abstract base model (`created_at`/`updated_at`/`deleted_at`), shared constants (`core/constants.py`) |
| `sparehub` | Django project settings/urls/wsgi/asgi |

Frontend — `src/`:
- `src/routes/` — file-based pages (TanStack Router file-route convention).
- `src/features/<domain>/` — `client.ts` (API calls), `types.ts`, `queries.ts`
  (TanStack Query hooks) per domain. Currently `auth` and `products` have
  their own feature folders; `orders`/`feedback` API calls don't have
  frontend wiring yet (backend-only so far — see "Known gaps" below).
  When adding one, follow the same `client.ts`/`types.ts`/`queries.ts` split.
- `src/lib/i18n.tsx` — all user-facing copy, `en`/`uk`. Never hardcode
  strings in JSX (see `AGENTS.md` §5).
- `src/lib/theme.tsx` — light/dark theme.
- `src/components/site-layout.tsx` — header/footer chrome, don't duplicate.

## Domain model — how the pieces connect

```
User (email login) ──┬── UserProfile (role: buyer/seller/admin)
                      └── Seller (company info) ──── Product ──┬── ProductImage (many)
                                                                ├── ProductHistory (snapshot per create/update)
                                                                └── Category (M2M)

Order (belongs to buyer User) ── OrderDetail ── ProductHistory
    (order lines point at a *snapshot*, not live Product — so a later price/name
     change on the product doesn't change what a past order shows)

Review (buyer's review of a Product) ──┬── ReviewReply (self-referential parent_reply
                                        │    → threaded: a reply can reply to a reply)
                                        └── ReviewImage (many)

Product.average_rating / review_count are *computed*, kept in sync by
post_save/post_delete signals on Review (feedback/models.py) — never set
them directly.
```

Two things that surprise people new to this codebase:
1. **Orders reference `ProductHistory`, not `Product`.** This is deliberate —
   it's how order line items stay accurate after a seller edits their listing.
2. **Product images live on `Product`, not `Order`.** An earlier iteration
   had this backwards (`OrderImage`); it was fixed by moving image upload/
   delete to `products/views.py` (`POST/DELETE /api/products/{id}/images/`).
   `ReviewImage` follows the same pattern for review photos.

## Auth

JWT via Simple JWT:
- `POST /api/auth/token/` — obtain access + refresh
- `POST /api/auth/token/refresh/` — refresh access
- `POST /api/auth/register/`, `POST /api/auth/logout/`, `GET /api/auth/me/`

The frontend's `apiRequest()` (`src/features/auth/client.ts`) attaches the
access token automatically and retries once through the refresh flow on 401.

## Permissions pattern (backend)

Every `ModelViewSet` overrides `get_permissions()` and branches on
`self.action` — reads are `AllowAny`, owner-only writes require
`IsAuthenticated` + an object-level `Is<Model>Owner` permission, gated
creation (e.g. only sellers can create products) uses a precondition
permission like `IsSeller`. **Full conventions — including queryset tuning,
serializer field-listing, the `services.py` pattern, and the shared
nested-image-URL constant — are documented in the
`drf-endpoint-patterns` Claude Code skill; consult it before adding a new
resource rather than improvising a new shape.**

## Running it locally

```bash
npm run dev:full     # frontend (Vite) + backend (Django) together
npm run dev           # frontend only
npm run dev:be        # backend only, binds 0.0.0.0:8000 (reachable from LAN, e.g. a phone)
```

Backend needs a local Postgres matching `.env` (`DB_NAME`/`DB_USER`/
`DB_PASSWORD`/`DB_HOST`/`DB_PORT`), a `SECRET_KEY`, and `DEBUG=True` for dev.
`.env` is gitignored — copy the pattern from `sparehub/settings.py`'s
`config(...)` calls if it doesn't exist yet.

## Tests

```bash
python manage.py test               # whole backend suite
python manage.py test products      # one app
```

Each app's `tests.py` uses `APITestCase` with a `Base*TestCase.setUp()` +
`login()` helper, one test class per concern (list/create/update/delete/
permissions/images), and `subTest` for boundary-value cases. Match this
shape for new tests — see the `drf-endpoint-patterns` skill for the pattern
in full, with code examples.

There's no frontend test runner configured yet (`npm run lint` and
`eslint .` are the only frontend checks). Verify frontend changes by running
`npm run dev` and exercising the UI, per the harness's usual verification
guidance for UI work.

## Migrations

This project's local Postgres dev database is **shared across feature
branches** worked on over time — a column or table missing a matching
migration file on your current branch is not proof it's dead; it may belong
to a sibling branch that already applied its own migration to the same
database. **Always follow the `safe-django-migrations` Claude Code skill**
when touching models: `makemigrations` → read the generated file → explain
it → get explicit confirmation before `migrate` or any raw schema SQL.

## Commit workflow

Don't run `git commit` unprompted — see the `no-auto-commit` skill. Make and
verify changes, summarize the diff, and let the user decide when to commit.

## Known gaps (as of writing)

- `orders` and `feedback` have no frontend integration yet — `src/features/`
  only has `auth` and `products`. The sell/edit-listing forms
  (`src/routes/sell.new.tsx`, `sell.$id.edit.tsx`) still have a couple of
  disabled "mock" fields (category picker, location) pending real API
  wiring — see `MockFieldShell` usage in those routes.
- Code style is enforced by `black` + `ruff` via pre-commit
  (`.pre-commit-config.yaml`) on the Python side, `eslint`/`prettier` on the
  frontend — both run automatically on commit, but you can run them by hand
  with `pre-commit run --all-files` / `npm run lint`.
