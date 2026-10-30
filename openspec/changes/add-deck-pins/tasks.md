# Tasks

## 1. Access-value and session foundations

- [x] 1.1 Add server-side PIN helpers that generate two distinct six-digit PINs (preserving leading zeros), scrypt-hash them with a random salt, and verify with a timing-safe comparison. Verify with unit tests for format, collision handling, hash round-trip, wrong PIN, and malformed hash.
- [x] 1.2 Add join-code generation with seven digits, leading-zero support, uniform randomness, and a uniqueness check/retry loop. Verify with unit tests for format, leading zeros, and collision retry.
- [x] 1.3 Add shared unlock-session helpers in `packages/deck` to sign and verify `{ deckId, role, pinVersion, exp }` tokens with HMAC-SHA256. Verify with unit tests for round-trip, expiry, tampering, another deck, another role, and an old `pinVersion`.
- [x] 1.4 Add nullable `join_code` (unique), `edit_pin_hash`, `view_pin_hash`, and `pin_version` columns to `decks`, generate the migration, and expose the fields through the database types. Verify the migration applies to an existing database and legacy rows remain null.
- [x] 1.5 Add `DECK_SESSION_SECRET`, `PIN_ATTEMPT_RATE_LIMIT`, `PIN_DECK_ATTEMPT_RATE_LIMIT`, `JOIN_LOOKUP_RATE_LIMIT`, and `JOIN_CODE_ATTEMPT_RATE_LIMIT` to the web and collaboration environment schemas, with production validation and a documented dev-only fallback. Verify with unit tests for the fallback and for production rejection when the secret is missing or too short.

## 2. Creation, join, session, and reset APIs

- [x] 2.1 Update deck creation to generate a unique join code and both PINs, store only PIN hashes with `pinVersion = 1`, and return all three plaintext values once. Verify with an integration test that the join code is stored, PIN plaintext is absent from the database, and both hashes verify.
- [x] 2.2 Update the authorization helper and session route so protected decks without a session return `{ requiresPin: true, role }`, valid unlock sessions return the normal session, legacy link tokens still work for link-only decks, and raw link tokens are rejected for protected resource access. Verify with integration tests for all four cases.
- [x] 2.3 Add `POST /api/decks/[deckId]/unlock` to validate the role-specific PIN from a link token, apply per-client and per-deck attempt limits, and issue a 30-day unlock session. Verify with integration tests for correct PIN, wrong PIN, wrong-role PIN, rate limiting, and the returned expiry.
- [x] 2.4 Add `POST /api/join/lookup` and `POST /api/join/unlock`: lookup returns the deck ID and title for a valid seven-digit code, and unlock verifies the chosen role PIN and issues a session. Verify with integration tests for valid/invalid codes, leading zeros, editor/viewer choice, wrong PIN, rate limiting, and no content before unlock.
- [x] 2.5 Add `POST /api/decks/[deckId]/access/reset` requiring an edit unlock session; generate and return a new join code plus two new PINs, increment `pinVersion`, and issue a fresh edit session. Verify with an integration test that the old code, old PINs, and old sessions fail after reset and viewers cannot reset.
- [x] 2.6 Update deck-scoped upload and image-search authorization to require an unlock session for protected decks while leaving legacy decks unchanged. Verify with integration tests that raw protected link tokens are rejected and unlock sessions succeed.
- [x] 2.7 Document the join lookup/unlock, link unlock, and reset routes in `docs/api.md`. Verify the documented payloads and error codes match the route tests.

## 3. Collaboration enforcement

- [x] 3.1 Update the collaboration authentication resolver to accept a valid unlock session for a protected deck, reject raw link tokens for protected decks, keep accepting link tokens for legacy decks, and preserve viewer read-only mode. Verify with collaboration integration tests for link unlock, join-code unlock, raw token rejection, and a stale `pinVersion`.
- [x] 3.2 Document `DECK_SESSION_SECRET` and join/PIN limits in `.env.example`, deployment and security docs, including the deploy order, join-code title visibility, and the rollback limitation. Verify the documented variables match both environment schemas.

## 4. Client unlock, join, and creation flow

- [x] 4.1 Add client helpers for reading, storing, expiring, and clearing the 30-day unlock session, plus session, link-unlock, join-lookup, and join-unlock API calls that distinguish `requiresPin`, invalid code/PIN, and rate-limit responses. Verify with unit tests for storage scope, expiry, malformed stored values, and API error mapping.
- [x] 4.2 Add the PIN entry screen to `DeckLoader`, try a remembered session before prompting, and pass both the session credential and the optional original link token through `DeckProvider`. Verify with component tests for first load, remembered load, wrong PIN, rate limit, expiry, and that viewers never gain edit controls.
- [x] 4.3 Add a local access-value store and a creation confirmation dialog that shows the join code and both PINs once with copy actions and opens the editor only after confirmation. Verify with component tests that values are stored before navigation, all three are displayed, and a failed copy still allows opening.
- [x] 4.4 Add the landing-page **Join a deck** form: seven-digit code lookup, deck title, Edit/View choice, role PIN entry, and navigation into the deck after a stored unlock. Verify with component tests for valid/invalid codes, leading zeros, role choice, wrong PIN, rate limit, and remembered session.
- [x] 4.5 Add the access section to the share dialog: show and copy the join code and PINs when known, show links only when a link token is available, explain code-joined limitations, and offer an editor-only reset with confirmation. Verify with component tests for link-opened and code-joined editors, known/unknown values, reset success/failure, and viewer absence.
- [x] 4.6 Add English and Greek copy for creation, landing join, title/role choice, unlock, errors, copying, reset, and warnings; update the localization glossary. Verify dictionary parity, placeholder parity, and a Greek join/unlock component test.

## 5. End-to-end and integration verification

- [x] 5.1 Add Playwright coverage for creating a deck, recording all three values, opening the edit link in a fresh context, rejecting a wrong PIN, accepting the edit PIN, and reopening without a prompt within the same browser. Verify the new spec passes without manual steps.
- [x] 5.2 Add Playwright coverage for joining from the landing page by code, seeing the title, choosing Edit or View, entering the wrong/right PIN, leading zeros, and code-joined sharing. Verify the new join spec passes.
- [x] 5.3 Add Playwright coverage for the view link and view PIN, collaboration between two unlocked editors (one by link, one by code), raw link-token rejection, and legacy link-only behavior. Verify all new and existing collaboration tests pass.
- [x] 5.4 Add Playwright coverage for resetting access: the old code, old PIN, and old session fail; the new code/PINs work; collaborators are prompted again. Verify the reset flow passes and the share dialog reflects the new values.
- [x] 5.5 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, and `pnpm build`; fix regressions. Verify all commands exit successfully.
- [x] 5.6 Run `openspec validate add-deck-pins --strict` and review the change against the specs. Verify validation passes and no requirement is left unimplemented.

## Workflow follow-up

- Run a manual smoke test with a production-like `DECK_SESSION_SECRET`: create, join by code, unlock by link, collaborate, reset all access, and open a legacy deck.
- Archive the change after the project's review requirements are satisfied.
