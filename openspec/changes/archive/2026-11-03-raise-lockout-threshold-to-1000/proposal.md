# Proposal

## Why

The requirement is that participants must be able to make at least 1000 PIN or join-code attempts before the server refuses further attempts with a lockout/rate-limit message. Today the defaults refuse after 10 PIN attempts per IP, 50 PIN attempts per deck, 20 join-code lookups per IP, and 50 join-code attempts per code, so users reach the "Too many attempts" message far too early.

## What Changes

- Raise the default thresholds for all join-code and PIN attempt limiters to 1000 attempts per 1-minute refill window:
  - `PIN_ATTEMPT_RATE_LIMIT`: 10 → 1000 (per client IP)
  - `PIN_DECK_ATTEMPT_RATE_LIMIT`: 50 → 1000 (per deck)
  - `JOIN_LOOKUP_RATE_LIMIT`: 20 → 1000 (per client IP)
  - `JOIN_CODE_ATTEMPT_RATE_LIMIT`: 50 → 1000 (per join code)
- Keep every limiter operator-configurable through the existing environment variables; only the defaults change.
- Keep the refusal behavior unchanged: after the threshold is exceeded, requests still return HTTP 429 with a `Retry-After` header and the existing localized "Too many attempts" message. No new persistent account-lockout state is introduced.
- Update `.env.example`, the README, and the deployment/single-container documentation so the documented defaults match.
- Update integration tests that assume the old low thresholds and add coverage proving that at least 1000 attempts are accepted before refusal.

Assumptions recorded for this change:

- "Retries" means failed or repeated join-code and PIN submissions handled by the existing in-memory `RateLimiter` buckets. A single join-code unlock request can consume a join-lookup token, a join-code token, a PIN-per-IP token, and a PIN-per-deck token.
- "At least 1000" means the first 1000 attempts within a fresh bucket are accepted; refusal begins on the next attempt. Bucket refill can only increase the number of attempts accepted before refusal.
- The lockout message is the existing rate-limit response (`429 rate_limited`, "Too many PIN attempts" / "Too many code attempts"). The product has no accounts, so there is no separate "user is locked out" account state to add.
- Separately configured limits for deck creation, auth failures, image search, and image import are out of scope.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `link-sharing`: The "Limit join and PIN attempts" requirement gains an explicit minimum threshold of 1000 attempts across join-code and PIN limiters before refusal.

## Impact

- `apps/web/src/server/env.ts`: new default values for the four limiter variables.
- `apps/web/src/server/rate-limit.ts`: refill rates derive from the new capacities, so no structural change is expected, but bucket behavior must be verified.
- `.env.example`, `README.md`, `docs/deployment.md`, `docs/single-container.md`: documented defaults.
- Tests: `apps/web/test/api.integration.test.ts`, `apps/web/test/image-search.integration.test.ts` (where they assert 429 behavior), and rate-limit unit/integration coverage.
- Security trade-off: with a 6-digit PIN, 1000 attempts per minute per deck reduces the time to exhaust the 1,000,000-value space to roughly 17 hours per deck for a determined attacker, versus roughly 7 months at the previous per-deck default of 50 attempts per 15 minutes. This is an accepted trade-off for this change and is recorded in the design.
