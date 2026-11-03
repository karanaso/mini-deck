# Tasks

## 1. Create open decks through the API

- [x] 1.1 Add an optional `accessMode` (`"protected" | "open"`, default `"protected"`) request schema to `apps/web/src/server/access-validation.ts` and parse it in `apps/web/src/app/api/decks/route.ts`. The open path must generate the join code and token hashes but store `editPinHash`/`viewPinHash` as `NULL` and `pinVersion` as `0`, and must return `accessMode`, `editPin: null`, `viewPin: null`. Verify with new integration cases in `apps/web/test/access.integration.test.ts` (201 body, stored row, seven-digit code) via `pnpm test:integration`.
- [x] 1.2 Reject an unknown `accessMode` with `400 invalid_request` and confirm a request with no body still creates a protected deck. Verify with integration cases in `apps/web/test/access.integration.test.ts`.
- [x] 1.3 Allow `issueDeckSession` to sign a session for an open deck using its stored `pinVersion`, while keeping protected-deck behavior unchanged. Verify the existing session tests in `apps/web/test/access.integration.test.ts` still pass and the new open-deck session assertion passes under `pnpm test:integration`.

## 2. Join open decks by code

- [x] 2.1 Return `protected` from `POST /api/join/lookup` and accept decks that have a join code without PIN hashes. Verify with an integration case that looks up an open deck and receives `protected: false` via `pnpm test:integration`.
- [x] 2.2 Make `pin` optional in `joinUnlockBodySchema`; require it for protected decks, skip PIN verification and PIN rate limiting for open decks, and issue a session for the chosen role. Verify with integration cases covering open editor and viewer joins in `apps/web/test/access.integration.test.ts` via `pnpm test:integration`.
- [x] 2.3 Keep `POST /api/decks/{deckId}/access/reset` protected-only and add an integration case asserting an editor reset on an open deck returns `400 pins_not_configured` without changing its join code. Verify via `pnpm test:integration`.

## 3. Creation UI and stored access values

- [x] 3.1 Widen `DeckAccessValues` to `editPin: string | null` and `viewPin: string | null`, accepting either two valid six-digit PINs or both null while still requiring a seven-digit join code. Verify with new cases in `apps/web/test/deck-access-client.test.ts` via `pnpm --filter @mini-deck/web test`.
- [x] 3.2 Add an "Open deck" toggle beside the New deck button on the landing page, off by default, that sends `{ accessMode: "open" }` and passes the returned mode into the created dialog. Verify with a component test that toggling changes the request body and that the default request has no body/`protected` mode.
- [x] 3.3 Update `DeckCreatedDialog` to show the join code and an open-access explanation for open decks, omit PIN rows, and keep the protected layout unchanged. Verify with new cases in `apps/web/test/access-ui.test.tsx` via `pnpm --filter @mini-deck/web test`.
- [x] 3.4 Add the new message keys to both `apps/web/src/lib/i18n/dictionaries/en.ts` and `el.ts`. Verify `pnpm --filter @mini-deck/web test` passes the dictionary-parity and placeholder tests in `apps/web/test/i18n.test.ts`.

## 4. Join and share dialogs

- [x] 4.1 Update `JoinDeckDialog` so an open deck (`protected: false`) skips the PIN stage: choosing Edit or View calls the unlock helper without a PIN, stores the session, and navigates. Verify with open- and protected-deck cases in `apps/web/test/access-ui.test.tsx` via `pnpm --filter @mini-deck/web test`.
- [x] 4.2 Update `ShareDialog` to render a join-code-only section for stored open-deck values, omit PIN rows and access reset, and show open-access copy; keep the protected section, reset, and warnings unchanged. Verify with new cases in `apps/web/test/access-ui.test.tsx` via `pnpm --filter @mini-deck/web test`.

## 5. Documentation

- [x] 5.1 Update `README.md`, `docs/api.md`, `docs/sharing.md`, and `docs/security.md` to document the creation option, open-deck request/response shape, PIN-free link and join behavior, and the inability to convert an open deck to protected. Verify by checking each command and JSON example against the implemented routes.

## 6. Integration verification

- [x] 6.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm test:integration`; all must pass with the new open-deck cases included.
- [x] 6.2 Update `apps/web/test/access-helpers.ts` and `e2e/access.spec.ts` (or add a focused spec) so E2E covers selecting the toggle, opening both links without a PIN gate, joining by code without a PIN, and the absence of PIN/reset controls. Verify with `pnpm test:e2e -- e2e/access.spec.ts`.
- [x] 6.3 Run `openspec validate add-open-deck-option --strict` and confirm the change validates without errors or warnings.

## Workflow follow-up

- Create the branch `opsx/add-open-deck-option` from an up-to-date `main`, commit, push, and open a pull request with the verification commands.
- Merge the pull request after required checks pass, then archive the change with `/opsx-archive`.
