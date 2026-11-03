# Tasks

## 1. Raise the four defaults

- [x] 1.1 In `apps/web/src/server/env.ts`, set the defaults for `PIN_ATTEMPT_RATE_LIMIT`, `PIN_DECK_ATTEMPT_RATE_LIMIT`, `JOIN_LOOKUP_RATE_LIMIT`, and `JOIN_CODE_ATTEMPT_RATE_LIMIT` to `1000`, leaving `.min(1)` and every other variable unchanged. Verify with `rg "PIN_ATTEMPT_RATE_LIMIT|PIN_DECK_ATTEMPT_RATE_LIMIT|JOIN_LOOKUP_RATE_LIMIT|JOIN_CODE_ATTEMPT_RATE_LIMIT" apps/web/src/server/env.ts` that all four read `1000`.
- [x] 1.2 Add `apps/web/test/env.test.ts` that deletes the four variables from `process.env`, calls `resetServerEnvForTests()`, and asserts each parsed default is `1000`; also assert an explicit override (for example `PIN_ATTEMPT_RATE_LIMIT=25`) still wins. Verify with `pnpm vitest run apps/web/test/env.test.ts`.
- [x] 1.3 In `apps/web/src/server/rate-limit.ts`, change the four join/PIN `refillPerSecond` denominators from `15 * 60` to `60`, so each bucket refills fully in one minute. Verify with `rg "15 \\* 60" apps/web/src/server/rate-limit.ts` that no 15-minute denominator remains and that each of the four join/PIN entries divides by `60`.

## 2. Prove the limiter threshold

- [x] 2.1 Extend `packages/deck/test/rate-limit.test.ts` with a fixed-clock case using `capacity: 1000` and `refillPerSecond: 1000 / 60`, asserting the first 1000 `take` calls return `allowed: true`, the 1001st returns `allowed: false` with a positive `retryAfterMs`, and advancing the clock by 60 seconds restores the full 1000-token bucket. Verify with `pnpm vitest run packages/deck/test/rate-limit.test.ts`.
- [x] 2.2 Review `apps/web/test/access.integration.test.ts` for assertions that depend on the old defaults; keep the deliberate low overrides (such as `PIN_ATTEMPT_RATE_LIMIT=1`) used to exercise the fast `429` path, and make any remaining default assumptions explicit. Verify with `pnpm test:integration` (requires the project database helper).
- [x] 2.3 Confirm the refusal path still returns `429 rate_limited` with a `Retry-After` header after a configured threshold is exceeded, using the existing wrong-PIN integration test. Verify that test passes and asserts both the status and header.

## 3. Update operator documentation

- [x] 3.1 Update the four documented defaults to `1000` and their window wording from "per 15 minutes" to "per minute" in `.env.example`, `README.md`, and `docs/deployment.md`. Verify with `rg "per 15 minutes" .env.example README.md docs` returning no matches and with `rg "1000" .env.example README.md docs/deployment.md` confirming the new defaults.
- [x] 3.2 Add a short note to `docs/deployment.md` warning that 1000 join/PIN attempts per minute weakens brute-force protection for 6-digit PINs and that deployments with high-value decks should override the variables. Verify by reading the rendered table and note for consistency with the environment variable names.

## 4. Integration verification

- [x] 4.1 Run `pnpm lint` and `pnpm typecheck`; both complete without new errors.
- [x] 4.2 Run `pnpm test` and `pnpm test:integration`; all unit and integration suites pass.
- [x] 4.3 Re-run `openspec validate raise-lockout-threshold-to-1000 --strict`; the change validates.

## Workflow follow-up

- Archive the change after review and a green CI run.
- Verify the archived spec keeps the `link-sharing` requirement text and scenarios.
