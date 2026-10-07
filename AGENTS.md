# AGENTS.md

Guidance for AI coding agents working in this repository.

## Product context

Feedback Inbox is a multi-tenant MVP/demo. Every signed-in user belongs to exactly one workspace and only ever sees that workspace's feedback. Users create feedback, browse the active inbox with search and filters, and close feedback. Closing records an audit event and notifies the feedback creator (email is simulated by a log-only mailer).

## Commands

- `npm run setup` — install, migrate, seed
- `npm run dev` — development server
- `npm run lint` / `npm run typecheck` — static checks
- `npm test` — unit and component tests
- `npm run test:integration` — API integration tests (temporary SQLite database)
- `npm run test:e2e` — build + Playwright end-to-end suite
- `npm run db:migrate` / `npm run db:seed` — database utilities

## Architecture boundaries

- `src/contracts` — Zod schemas and DTO types shared by client and server. Client components may import from here.
- `src/server` — server-only code: `db`, `auth`, `repositories`, `services`, `mail`, `telemetry`. Never import from a client component.
- Route handlers authenticate and validate input, then delegate to services.
- Repositories are the only layer that touches Drizzle/SQLite.
- Services own domain rules, transactions, audit events and mailer calls.
- Zustand stores transient UI state only (toast queue). Server-owned data — the feedback list, active counts, history — is never duplicated into client stores.

## Invariants

- Every feedback query and mutation is scoped by the session's `workspaceId`. Cross-workspace access must return 404, never 403.
- Closing feedback is transactional: exactly one `feedback_closed` event and one creator notification per transition. Retrying close is idempotent and returns outcome `already_closed` without side effects.
- `feedback_events` is append-only.
- Uploads accept PDF, PNG and JPEG up to 5 MB, are magic-byte checked, and are stored under `data/uploads/<workspaceId>/`. Attachment references are HMAC-signed and workspace-bound; storage paths are always derived server-side and never accepted from the client.
- Logs and spans for close flows must include `workspaceId`, `feedbackId`, `actorUserId` and the outcome, and must never contain passwords, session values or full feedback descriptions.

## Testing conventions

- Unit/component tests live in `tests/unit` (jsdom for React components).
- Integration tests in `tests/integration` invoke route handlers against a temporary, freshly seeded SQLite file.
- E2E tests in `e2e` run against `next start` with a fresh database and assert mailer behaviour through a JSONL mailbox file — there is no test HTTP endpoint. See `docs/testing.md`.

## Working rules

- Run `npm run lint`, `npm run typecheck` and the relevant test suites before considering work done.
- Do not weaken or delete existing tests to make a change pass.
- Follow existing patterns and avoid new dependencies unless strictly necessary.
