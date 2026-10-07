# Testing

## Matrix

| Suite         | Location           | Environment | What it covers                                                                                     |
| ------------- | ------------------ | ----------- | -------------------------------------------------------------------------------------------------- |
| Unit          | `tests/unit`       | jsdom/node  | Zod contracts, close transition rules, session cookie signing, filename sanitisation, mailer payload, create-form validation (RTL) |
| Integration   | `tests/integration` | node        | Route handlers invoked directly against a temporary, freshly migrated and seeded SQLite file      |
| E2E           | `e2e`              | Chromium    | Real browser against `next start` with a fresh database and the JSONL mailbox                     |

Run them with `npm test`, `npm run test:integration` and `npm run test:e2e` (the last one builds first).

## Integration tests

Each test file gets its own temporary database: the helper in `tests/helpers/db.ts` creates a temp file, applies migrations, seeds the two workspaces and points `DATABASE_PATH` at it. Route handlers are plain functions, so tests construct `Request` objects with session cookies and assert real status codes and bodies.

## E2E tests and the mailbox

Playwright's global setup deletes `data/app.db`, the uploads directory and the mailbox file, then migrates and seeds a fresh database. The web server is started by Playwright (`next start`) with `E2E_MAILBOX_PATH` pointing at `data/e2e/mailbox.jsonl`.

When that variable is set, the E2E mailer adapter appends one JSON line per sent email to the mailbox file. Tests read that file through `e2e/helpers/mailbox.ts` — there is **no test HTTP endpoint** exposing the mailer, fixtures or application internals.

The suite runs with a single worker because tests share one database.

## Determinism

- Seed data uses fixed ids and timestamps; running `npm run db:seed` twice produces the same state without duplicates.
- E2E always starts from a reseeded database; count assertions are made relative to a before-value read within the same test, so test order does not matter.
- No test sleeps on wall-clock timing to pass (the only polling helper waits for a mailer entry to appear, with a timeout).
