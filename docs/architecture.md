# Architecture

Feedback Inbox is a single Next.js application with server-rendered pages, JSON route handlers and an embedded SQLite database. It runs as one Node.js process with no external services.

## Layers

```
src/app            Next.js App Router: pages (server components) and route handlers
src/contracts      Zod schemas and DTO types shared by client and server
src/components/ui  Small design-system components (Button, Input, Badge, Toast, ...)
src/features       Feature-level client components (forms, filters, close button)
src/server
  auth             Password hashing, session cookies, session resolution
  db               Drizzle schema, connection factory, deterministic seed
  repositories     The only layer that queries Drizzle/SQLite
  services         Domain rules, transactions, audit events, mailer calls
  mail             MailerRepository abstraction (log-only implementations)
  telemetry         Structured JSON logger and OpenTelemetry tracing helpers
```

Dependency rules:

- Client components may import from `src/contracts` and `src/components`, never from `src/server`.
- Route handlers resolve the session from the request cookie, validate input with Zod and delegate to services.
- Services orchestrate repositories inside transactions and own side effects (audit events, mailer, logging).
- Repositories never import services.

## Request flow

1. A browser request hits a server component page (e.g. `/feedback`). The page resolves the session from cookies via `getSessionFromCookies()`, redirecting to `/login` when absent.
2. The page calls a service (e.g. `listFeedback`) which calls repositories. Server components render the inbox directly from the service response — the feedback list, counts and history are never cached in client stores.
3. Mutations go through route handlers (`/api/...`), which validate payloads with the shared Zod schemas and return a JSON error envelope on failure.
4. After a successful close, the client calls `router.refresh()` so the server re-renders with fresh, server-owned data.

## Database

SQLite file at `data/app.db` (override with `DATABASE_PATH`). Drizzle migrations live in `drizzle/` and are applied by `npm run db:migrate`. The connection factory enables foreign keys, WAL journaling and a busy timeout; `feedback_events` is append-only and every table that stores workspace-owned rows carries a `workspace_id` column used by every repository query.

## Uploads

Uploads are validated (declared type + extension + magic bytes, 5 MB limit, filename sanitisation with explicit rejection of traversal and control characters), written under `data/uploads/<workspaceId>/<uuid>-<safeName>` and referenced by an HMAC-signed `attachmentId` that is bound to the uploading workspace. `POST /api/feedback` resolves the attachment id server-side and stores only the workspace-relative path; downloads always re-derive the path from the database row and confine it to the uploads root.

## Mailer

`MailerRepository` is a narrow interface with a single method, `sendFeedbackClosedEmail`. Two implementations exist:

- `InMemoryMailerRepository` — records the message in an in-process list and logs it (the default).
- `E2eMailerRepository` — additionally appends each message to a JSONL mailbox file when `E2E_MAILBOX_PATH` is set, so Playwright can assert mailer behaviour without any test endpoint.

No implementation performs network I/O.

## Telemetry

`src/instrumentation.ts` registers an OpenTelemetry tracer provider with a console span exporter once per server process. Services create spans (`feedback.list`, `feedback.create`, `feedback.close`, `mailer.feedback_closed`) and emit structured JSON logs with the fields listed in `docs/observability.md`.
