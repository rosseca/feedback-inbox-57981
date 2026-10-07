# Security

## Tenant isolation

Every feedback query and mutation is scoped by the session's `workspaceId`:

- Repository functions take an explicit `workspaceId` and include it in every `WHERE` clause (`list`, `count`, `find by id`, `close`, history, attachment lookup).
- Accessing a resource owned by another workspace returns `404` — the same response as a missing resource — so existence is never leaked.
- The seeded integration and E2E suites assert cross-workspace reads (detail, list, attachment) return `404`.

## Sessions

- Passwords are hashed with bcrypt (cost 10) and compared with a generic error message so unknown emails and wrong passwords are indistinguishable.
- Session ids are random UUIDs stored server-side with an expiry; the cookie value is `sessionId.HMAC-SHA256(sessionId)` signed with `SESSION_SECRET` and verified with a timing-safe comparison.
- Cookies are `httpOnly`, `SameSite=Lax`, `Path=/` and `Secure` in production. Logout revokes the server-side session row, not just the cookie.
- Identity always comes from the server-side session lookup; no user or workspace id is ever read from request bodies.

## Cross-site request protection

Mutating route handlers reject requests whose `Origin` header does not match the request host (`403`), in addition to `SameSite=Lax` cookies.

## Uploads

- Only PDF, PNG and JPEG up to 5 MB are accepted; a content-length pre-check rejects oversized bodies early.
- The declared MIME type must be allow-listed, match the file extension, **and** match the file's magic bytes — clients cannot smuggle content by lying about type.
- Filenames containing `..`, path separators, absolute paths or control characters are rejected (`400`), then sanitised to a small allowlist before storage.
- Files are stored under `data/uploads/<workspaceId>/` with server-generated UUID prefixes; the stored database value is the workspace-relative path.
- `attachmentId` references are HMAC-signed and bound to the uploading workspace; a reference from another workspace fails verification.
- Downloads re-derive the absolute path from the database row and confine it to the uploads root (resolve + prefix check), so a tampered `attachment_path` cannot escape the directory.

## Data exposure

- API error responses use a generic envelope and never include stack traces or internal messages.
- Telemetry never logs passwords, password hashes, session values, cookie contents or full feedback descriptions (see `docs/observability.md`).
