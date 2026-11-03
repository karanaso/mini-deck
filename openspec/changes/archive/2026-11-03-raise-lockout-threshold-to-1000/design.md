# Design

## Context

See `proposal.md` for motivation. Rate limiting lives in `apps/web/src/server/rate-limit.ts`, which builds four `RateLimiter` instances for join-code and PIN traffic. Each instance is a per-key token bucket from `packages/deck/src/rate-limit.ts`: `capacity` tokens start available, each attempt costs one token, and tokens refill at `capacity / 60` per second (a full bucket per minute).

The four relevant instances and their consumers are:

- `PIN_ATTEMPT_RATE_LIMIT` (per client IP) — `POST /api/decks/[deckId]/unlock` and `POST /api/join/unlock`.
- `PIN_DECK_ATTEMPT_RATE_LIMIT` (per deck id) — the same two routes.
- `JOIN_LOOKUP_RATE_LIMIT` (per client IP) — `POST /api/join/lookup` and `POST /api/join/unlock`.
- `JOIN_CODE_ATTEMPT_RATE_LIMIT` (per submitted join code) — `POST /api/join/lookup` and `POST /api/join/unlock`.

Buckets are in-memory and per process; there is no shared store or persistent lockout record. Routes return `429 rate_limited` with `Retry-After` when any bucket is exhausted. The UI surfaces the existing localized rate-limit error.

## Goals / Non-Goals

**Goals:**

- A fresh bucket for every join/PIN limiter accepts at least 1000 attempts before refusing.
- Operators can still override each threshold through the existing environment variables.
- `429` status, error code, `Retry-After`, and localized copy stay unchanged.
- Documentation and tests describe the new defaults.

**Non-Goals:**

- Adding accounts, a persistent "locked out" flag, or a new UI lockout screen.
- Changing deck-creation, auth-failure, image-search, or image-import limits.
- Moving rate-limit state to a shared store (Redis, database) or making it multi-instance-consistent.
- Adding an administrative unlock/reset flow.

## Decisions

### Raise the four environment defaults to 1000

Change the defaults in `apps/web/src/server/env.ts` to 1000 for `PIN_ATTEMPT_RATE_LIMIT`, `PIN_DECK_ATTEMPT_RATE_LIMIT`, `JOIN_LOOKUP_RATE_LIMIT`, and `JOIN_CODE_ATTEMPT_RATE_LIMIT`. The schema keeps `.min(1)`, so operators can still set a lower value.

Alternative considered: hard-code 1000 in `rate-limit.ts`. Rejected because the existing deployment contract exposes these as environment variables, and operators may need different values per environment.

### Keep refill proportional to capacity

`rate-limit.ts` derives `refillPerSecond` as `capacity / 60`. Keeping that formula means the documented "per minute" semantics stay intact: a full bucket still refills in one minute. The consequence is that sustained throughput rises with the larger capacity (about 16.7 attempts/second per key instead of about 0.011/second at the old 10-attempt default).

Alternative considered: keep an absolute refill rate so a 1000-token bucket takes much longer to refill. Rejected because it would make the environment variable mean different things at different capacities and contradict the existing documentation.

### Count only rate-limiter tokens, not successful unlocks

The threshold counts attempts that consume tokens, including invalid codes/PINs and requests that later fail validation. The design does not add separate failure-only counters. This matches how the existing limiters behave and keeps the change small.

Alternative considered: reset the bucket after a successful unlock. Rejected because it would let an attacker with one valid credential clear the counter for a deck, and it adds state transitions without a requirement.

### Reuse the existing rate-limit response

No new "user is locked out" message or UI state is added. The product has no user accounts, and the existing `429` response plus retry delay is the observable lockout behavior. Adding a distinct screen would duplicate the error path and require new localization in both English and Greek.

### Verify with unit and schema tests rather than 1000 HTTP calls

Proving "at least 1000" by sending 1000 HTTP requests would be slow and would exercise unrelated routing. Instead:

- A `RateLimiter` unit test uses a fixed clock and capacity 1000 to assert the first 1000 `take` calls are allowed and the 1001st is rejected.
- An environment-schema test clears the four variables and asserts the parsed defaults are 1000.
- Existing integration tests keep setting low overrides (for example `PIN_ATTEMPT_RATE_LIMIT=1`) to test the `429` path quickly; those overrides prove the limiter still refuses when configured low.

## Risks / Trade-offs

- **Brute-force resistance drops sharply** → A 6-digit PIN has 1,000,000 values. At 1000 attempts per minute per deck, an attacker can exhaust the space in roughly 17 hours of sustained traffic against one deck. At the previous per-deck default of 50 attempts per 15 minutes, the same sweep takes roughly 208 days (about 7 months). Mitigation: document the trade-off and keep every variable overridable so deployments can lower the thresholds; do not treat this setting as a security boundary for high-value decks.
- **Per-IP limits are easy to spread across addresses** → With 1000 attempts per IP and per deck, rotating clients can reach the per-deck ceiling faster. Mitigation: the per-deck bucket remains the backstop; deployments that need stronger protection should override the per-deck and per-IP values.
- **Refill rate rises with capacity** → Sustained attempts per key increase from roughly 0.7/minute to roughly 1000/minute (about 16.7/second). Mitigation: documented explicitly; operators can lower capacity or introduce a different refill ratio in a follow-up.
- **In-memory buckets are per process** → Multiple web instances each have their own 1000-attempt budget. This is pre-existing behavior, not introduced here; a shared limiter is out of scope.
- **Tests that assume small thresholds break** → Update the access tests that set low overrides explicitly and any test that reads default values; keep the low-value tests as the fast refusal-path coverage.

## Migration Plan

1. Deploy with the new defaults; no schema, data, or API migration is required.
2. Deployments that already set any of the four variables in their environment keep their explicit values; only unset variables pick up 1000.
3. Rollback is a configuration change: restore the previous defaults or set the variables to their old values and restart the web process.

## Open Questions

None.
