# Domain

## Workspaces and users

Every user belongs to exactly one workspace. A session always resolves to `{ userId, workspaceId }` on the server; identity is never taken from client input.

## Feedback

A feedback item has:

- `title` (3–120 chars) and `description` (10–4000 chars)
- `priority`: `low | medium | high`
- `status`: `new | triaged | planned | closed`
- an optional attachment (one file, PDF/PNG/JPEG, ≤ 5 MB)

**Active statuses** are `new`, `triaged` and `planned`. The active inbox only ever shows active items, and the active count is the total number of active items in the workspace — independent of any search or filter applied to the list.

## Events

`feedback_events` is an append-only audit log:

- `feedback_created` — written in the same transaction that inserts the feedback row. Its `actor_user_id` is the feedback creator; the creator is always derived from this event (there is no creator column on `feedback`).
- `feedback_closed` — written exactly once per close transition.

Events are never updated or deleted.

## Closing feedback

Closing is a single conditional transaction (`BEGIN IMMEDIATE`):

1. Load the feedback by `id` **and** `workspaceId`. Missing or foreign items produce the same `404`.
2. If the item is already `closed`, return outcome `already_closed` with no side effects.
3. Otherwise flip the status with a guarded `UPDATE` (`WHERE status = <previous active status>`), set `closed_at`/`closed_by_user_id`, and insert exactly one `feedback_closed` event — all inside the transaction.
4. Only the request that wins the transition notifies the creator: after the transaction commits, the mailer sends one `Your feedback has been closed` message to the creator's email address.

Properties that follow from this design:

- **Exactly once per transition:** one `feedback_closed` event and one mailer call, never more.
- **Idempotent retries:** retrying close (sequentially or concurrently) returns `already_closed` and performs no writes and no notification.
- **Race safe:** two near-simultaneous close attempts on the same item produce exactly one transition; the loser observes `already_closed`.
- The mailer is called only after a successful commit, so a failed transaction never sends email.

Known, accepted limitation: the mailer is local and there is no durable outbox, so a process crash between commit and mailer call could skip the notification. This is documented rather than solved because email in this application is log-only.
