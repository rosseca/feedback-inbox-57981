# API

All endpoints are JSON route handlers under `/api` and require a session cookie unless stated otherwise. Mutating endpoints additionally reject cross-origin requests (same-origin check on the `Origin` header, on top of `SameSite=Lax` cookies).

## Error envelope

Every error response uses the same shape:

```json
{ "error": { "code": "bad_request", "message": "Invalid feedback payload" } }
```

Status codes: `400` invalid input, `401` missing/invalid/expired session or bad credentials, `403` cross-origin mutation, `404` resource not found or owned by another workspace, `413` upload too large, `500` unexpected error (no internal details leaked).

## Endpoints

| Method | Path                            | Behaviour                                                                                                                                                     |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/login`               | Validates `{ email, password }` (Zod). Generic `401 invalid_credentials` for unknown email or wrong password. Sets the signed `httpOnly` session cookie.      |
| POST   | `/api/auth/logout`              | Deletes the session row and clears the cookie. Always `204`.                                                                                                   |
| GET    | `/api/feedback`                 | Active inbox for the session workspace. Query: `query` (title substring, case-insensitive), `status` (`new|triaged|planned`), `priority` (`low|medium|high`). Returns `{ items, activeCount }`. `activeCount` ignores filters. Invalid filters → `400`. |
| POST   | `/api/feedback`                 | Creates feedback. Body: `{ title, description, priority, attachmentId? }`. `attachmentId` must be a signed reference created by `/api/uploads` in the same workspace. `201` with `{ feedback }`. |
| GET    | `/api/feedback/:id`             | Feedback plus history for the same workspace. `404` if missing or cross-workspace.                                                                                |
| GET    | `/api/feedback/:id/attachment`  | Streams the attachment with its original (sanitised) filename. `404` if the item has no attachment or is cross-workspace.                                        |
| PATCH  | `/api/feedback/:id/close`       | Closes the feedback transactionally. Returns `{ feedback, outcome }` where `outcome` is `closed` or `already_closed`. `404` if missing or cross-workspace.        |
| POST   | `/api/uploads`                   | Multipart `file` field. Accepts PDF/PNG/JPEG ≤ 5 MB with magic-byte verification; rejects traversal/control-character filenames. Returns `201 { attachmentId, filename }`. |

## Example: close

```bash
curl -X PATCH http://localhost:3000/api/feedback/fb_acme_1/close \
  --cookie "feedback_session=<signed-value>"
```

```json
{
  "feedback": { "id": "fb_acme_1", "status": "closed", "closedAt": "2026-01-06T09:00:00.000Z", "...": "..." },
  "outcome": "closed"
}
```

Retrying the same request returns `"outcome": "already_closed"` and performs no writes and no notification.
