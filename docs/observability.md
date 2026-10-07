# Observability

## Tracing

`src/instrumentation.ts` runs once per server process (Next.js `register()` hook) and registers an OpenTelemetry tracer provider with a **console span exporter** — there is no collector and no network export. Set `OTEL_DISABLED=1` to turn it off.

Spans are created around the interesting flows:

| Span                     | Where                                  |
| ------------------------ | -------------------------------------- |
| `feedback.list`          | `listFeedback` service                 |
| `feedback.detail`        | `getFeedbackDetail` service            |
| `feedback.create`        | `createFeedback` service              |
| `feedback.close`         | `closeFeedback` service               |
| `mailer.feedback_closed` | mailer call inside the close service   |

Span attributes include `workspace.id` and `feedback.id` where applicable, plus the close `outcome`.

## Logging

The logger emits single-line JSON to stdout/stderr with `level`, `event`, `timestamp` and structured fields.

Close flows log `workspaceId`, `feedbackId`, `actorUserId`, `previousStatus`, `resultingStatus` and `outcome` (`closed`, `already_closed`, or `failed` for not-found/failed attempts). Create flows log the same identifiers plus priority, status and whether an attachment was stored. The mailer logs recipient, subject and feedback title.

## Redaction rules

Telemetry must never contain:

- passwords or password hashes
- session ids, cookie values or signature material
- full feedback descriptions
- absolute filesystem paths

This is enforced by construction: call sites pass an explicit allowlist of fields, and shared payload builders (`buildFeedbackClosedEmail`) only include the creator email, subject, title and closer display name.
