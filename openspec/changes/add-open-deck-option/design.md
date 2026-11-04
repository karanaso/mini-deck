# Design

## Context

See `proposal.md` for motivation and the `link-sharing` delta for required behavior.

Today `POST /api/decks` always generates two PINs and stores their scrypt hashes. Access resolution already treats a deck as protected only when **both** `editPinHash` and `viewPinHash` are present (`isProtectedDeck` in `apps/web/src/server/auth.ts`). Decks with null hashes — the pre-PIN legacy decks — already authorize edit and view link tokens directly and reject unlock-session issuance. Collaboration follows the same rule: a deck without PIN hashes accepts raw link tokens and keeps viewer connections read-only.

The columns `joinCode`, `editPinHash`, and `viewPinHash` are nullable, and `pinVersion` defaults to `0`, so an open deck needs no schema change.

## Goals / Non-Goals

**Goals:**

- Add an opt-in open access mode at creation without changing the default behavior.
- Represent open decks with the existing null-PIN representation so authorization, collaboration, and legacy handling stay on one code path.
- Keep join-by-code useful for open decks, skipping only the PIN step.
- Make every dialog explicit about whether PINs exist, so creators are not told to distribute values that do not exist.

**Non-Goals:**

- Converting an existing deck between open and protected modes.
- Making open decks discoverable, searchable, or publicly listed.
- Changing token derivation, collaboration authorization, or the database schema.
- Storing raw link tokens server-side so code-joined editors can recover links.

## Decisions

### 1. Open decks are decks with no PIN hashes

Store open decks with `editPinHash = NULL`, `viewPinHash = NULL`, and `pinVersion = 0`, keeping the join code. Access resolution already returns `protected: false` and `requiresPin: false` for such decks, and both the web APIs and the collaboration server already grant roles from raw tokens in that case.

*Alternatives considered:* a new `accessMode` column (requires a migration and a second source of truth next to the hashes), or a separate `open_decks` table (duplicates tokens, documents, assets, recents, and authorization). Both add paths without changing behavior.

Consequence to preserve: protection is derived from "both hashes present", not from `pinVersion`. An open deck must never have one hash set.

### 2. `POST /api/decks` takes an optional access mode

Request body (optional): `{ "accessMode": "protected" | "open" }`. Missing body or missing field means `protected`, preserving every existing client and the current `POST` with no body. An unknown value returns `400 invalid_request`.

Response keeps the existing keys and adds `accessMode`; `editPin` and `viewPin` are `null` for open decks. Keeping the keys (rather than omitting them) gives the client a stable shape and makes the open mode explicit.

*Alternatives considered:* a query parameter (visible in logs and cache keys), a separate `/api/decks/open` endpoint (duplicates rate limiting, token creation, document seeding), or returning only the join code for open decks (ambiguous for clients). A body field validated with Zod matches existing request-validation patterns.

Implementation sketch:

- Protected path: unchanged generation and hashing.
- Open path: generate tokens and join code, skip `generateDeckPins`, insert null hashes and `pinVersion: 0`.
- Both paths still require `DECK_SESSION_SECRET`, because join-by-code issues sessions and the session endpoint must remain available.

### 3. Join-by-code issues sessions for open decks

`POST /api/join/lookup` returns `{ deckId, title, protected }`, where `protected` comes from `isProtectedDeck`. It accepts decks that have a join code regardless of PIN hashes; legacy decks remain unfindable because they have no join code.

`POST /api/join/unlock` makes `pin` optional. For a protected deck a missing or malformed PIN is rejected; for an open deck the PIN is ignored, PIN rate limiters are skipped, and a session is issued for the chosen role. `issueDeckSession` is relaxed to allow any existing deck and signs `pinVersion` from the row (0 for open decks), so `resolveSessionToken` continues to bind sessions to the deck and version.

*Alternatives considered:* returning the raw edit token to the code-joined client (the server stores only hashes, so it cannot), or requiring the client to fall back to a link (breaks the join-code entry point). Issuing a normal session reuses the 30-day remembered-session flow and the collaboration handshake unchanged.

### 4. Landing-page toggle, off by default

Add a labeled checkbox/switch beside the New deck button that sets the request body to `{ accessMode: "open" }`. It is not persisted, so a previous choice cannot silently create future decks without PINs. The creation dialog is the confirmation step.

*Alternatives considered:* a modal that asks on every creation (more friction than today), or a remembered preference (risk of accidentally creating open decks).

### 5. UI reflects capability, not a new session field

`DeckAccessValues` becomes `{ deckId, joinCode, editPin: string | null, viewPin: string | null }`. The validator requires both PINs to be valid six-digit strings or both to be null; existing stored protected entries remain valid. The creation dialog hides PIN rows and changes its warning when both are null.

The share dialog renders a "no PINs" note for every unprotected deck, which covers open decks opened through a link on a browser with no stored values as well as legacy link-only decks. When stored values exist with null PINs, the same section also shows the join code. The reset action stays inside the protected section, so it disappears for open decks; the API keeps its existing `400 pins_not_configured` guard. No provider or session-shape change is needed.

*Alternatives considered:* threading an `accessMode` through the session response and `DeckProvider`. That adds plumbing for copy that can be derived from the locally held values; a code-joined open-deck editor still sees the existing "access values unknown on this browser" note, which is already accurate for code-joined protected editors.

### 6. Localization, docs, and tests move with the code

Add new message keys to both `en` and `el` dictionaries (the localization spec requires the dictionaries to stay in sync). Update `README.md`, `docs/api.md`, `docs/sharing.md`, and `docs/security.md` where they assert that every new deck has PINs.

Test coverage:

- Unit: creation-dialog open/protected variants, join-dialog PIN-skipping, share-dialog open variant, access-value validation with null PINs.
- Integration: open creation response and stored row, open link authorization, join lookup/unlock without a PIN, reset rejection, invalid `accessMode`.
- E2E: create an open deck from the landing toggle, open both links without PIN gates, join by code without a PIN, and confirm the share dialog has no PIN/reset controls.

## Risks / Trade-offs

- **Anyone with an open deck's edit link gets editing rights.** → The mode is opt-in, the toggle is labeled, the creation and share dialogs state that links are the credential, and the default remains protected.
- **An open deck cannot be made protected later.** → Treated as a limitation of this change; the creator must recreate the deck. Documented in `docs/sharing.md` so the choice is informed.
- **Clients that assume `editPin`/`viewPin` are strings break.** → The response adds `accessMode`, the shared type is widened to nullable, and unit/integration tests cover both shapes; `typecheck` catches remaining assumptions.
- **Sessions for open decks could outlive a future protection change.** → Open decks cannot rotate or gain PINs in this change; if that changes later, incrementing `pinVersion` already invalidates sessions.
- **Join codes remain a second credential for open decks.** → Joining still requires the code and offers only the same roles the links already grant; no new content is exposed beyond what a link-holder can see.

## Migration Plan

1. Deploy the web app change (no database migration). Open creation is ignored by older servers only if the UI and API versions are mismatched; the API default keeps existing clients protected.
2. Rollback is safe: open decks are stored exactly like legacy link-only decks, so an older server continues to serve them through their links (without join-by-code support for open decks).
3. No backfill: existing protected and legacy decks are untouched.
