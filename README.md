# Feedback Inbox

Feedback Inbox is a multi-tenant MVP for collecting and triaging customer feedback. Each signed-in user belongs to one workspace and only ever sees that workspace's items. This repository is a runnable demo: SQLite in-process, log-only mailer, no Docker or external services.

## Stack

- Next.js (App Router) with React and TypeScript in strict mode
- SQLite via `better-sqlite3` and Drizzle ORM with versioned migrations
- Session authentication with bcrypt password hashing and a signed `httpOnly` cookie
- Zod schemas shared between client and server
- Tailwind CSS plus CSS Modules; Zustand for transient UI state only
- Vitest + React Testing Library; Playwright for end-to-end tests
- OpenTelemetry spans and structured JSON logs (console exporter only)

The app has **zero infrastructure dependencies**: no Docker, no external database, no SMTP server. Outgoing email is simulated by a `MailerRepository` implementation that only logs — no network I/O ever happens in the mailer.

## Prerequisites

- Node.js 22 LTS or newer

## Setup

```bash
npm run setup
```

This installs dependencies, applies migrations to `data/app.db` and seeds deterministic development data.

## Development

```bash
npm run dev
```

Then open http://localhost:3000.

## Seeded accounts

| Workspace   | Email               | Password         |
| ----------- | ------------------- | ---------------- |
| Acme Ltd    | `owner@acme.test`   | `pass123` |
| Globex Corp | `owner@globex.test` | `pass123` |

Each account belongs to a different workspace. Workspaces are fully isolated: users only ever see their own feedback.

## Commands

| Command                    | Description                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| `npm run setup`            | Install, migrate and seed                                               |
| `npm run dev`              | Start the development server                                            |
| `npm run build`            | Production build                                                        |
| `npm run start`            | Start the production server (requires a build)                          |
| `npm run lint`             | ESLint                                                                  |
| `npm run typecheck`        | TypeScript strict check                                                 |
| `npm test`                 | Unit and component tests                                                |
| `npm run test:integration` | API integration tests against a temporary SQLite database               |
| `npm run test:e2e`         | Build and run the Playwright end-to-end suite                           |
| `npm run db:migrate`       | Apply Drizzle migrations from `drizzle/`                                |
| `npm run db:seed`          | Seed deterministic development data (idempotent)                        |

## Environment

Copy `.env.example` to `.env` to override defaults. `SESSION_SECRET` signs session cookies and signed attachment references; a development fallback exists, but set a real value in any shared environment.

## Documentation

- [Architecture](docs/architecture.md) — layers, request flow, folder layout
- [Domain](docs/domain.md) — statuses, events and close semantics
- [API](docs/api.md) — endpoints, payloads and error envelope
- [Testing](docs/testing.md) — test matrix and the E2E mailbox mechanism
- [Security](docs/security.md) — tenant isolation, sessions, upload safety
- [Observability](docs/observability.md) — spans, logs and redaction rules
