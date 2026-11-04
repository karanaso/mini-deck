# Proposal

## Why

Creating a deck today always produces a join code and two six-digit PINs, even when the creator only wants to hand a link to a small group or a public audience. Requiring every participant to look up and enter a PIN adds friction to low-stakes sharing. Creators need a deliberate "open" mode that keeps role-scoped links but skips PINs entirely.

## What Changes

- Add an access-mode option to deck creation: `protected` (current behavior, default) or `open`.
- `POST /api/decks` accepts an optional `{ "accessMode": "protected" | "open" }` body. Omitting it preserves today's behavior.
- Open decks still receive a unique seven-digit join code and edit/view tokens, but no PINs: both PIN hashes are `NULL` and `pinVersion` stays `0`.
- Edit and view links for an open deck grant their role directly, with no PIN prompt and no unlock session, matching the existing link-only path for pre-PIN decks.
- Join-by-code on an open deck resolves the deck, offers Edit/View, and opens the chosen role without a PIN step.
- The landing page adds an "Open deck" toggle next to the New deck button. It is off by default, so protected decks remain the default.
- The creation dialog shows the join code for open decks and omits the PIN rows; the share dialog shows the join code and an open-access warning and offers no access reset.
- Reset access remains protected-only; open decks reject it with the existing `pins_not_configured` error.
- Docs (`README.md`, `docs/api.md`, `docs/sharing.md`, `docs/security.md`) and both UI locales (`en`, `el`) are updated.

No database migration is needed: `editPinHash`, `viewPinHash`, and `joinCode` are already nullable.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `link-sharing`: deck creation may produce an open deck with no role PINs; join-by-code and the share/creation dialogs must support both protected and open decks without weakening protected-deck behavior.

## Impact

- API: `POST /api/decks` request/response shape, `POST /api/join/lookup`, `POST /api/join/unlock`, `POST /api/decks/{deckId}/session`.
- Access control: `apps/web/src/server/auth.ts` (`issueDeckSession` may issue sessions for open decks), `apps/web/src/server/access-validation.ts`.
- UI: landing creation controls, `DeckCreatedDialog`, `JoinDeckDialog`, `ShareDialog`, `DeckAccessValues` storage.
- Tests: web unit tests, web integration tests, and Playwright access tests.
- Docs and i18n dictionaries.
- Unaffected: collaboration authorization (open decks have no PIN hashes, so existing read-only enforcement is unchanged), token derivation, database schema.
