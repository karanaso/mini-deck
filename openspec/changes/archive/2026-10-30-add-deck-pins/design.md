# Design

## Context

See `proposal.md` for motivation. The current access model is entirely link-based:

- `decks` stores SHA-256 hashes of a 32-byte edit token and a view token derived from it. The view token is never sent in the clear to a view-only client.
- Edit and view tokens live in the URL fragment and are sent as a Bearer token to the session endpoint and the Hocuspocus connection.
- `authorizeDeck` and the collaboration server independently hash the presented token and compare it with the stored hashes.
- There are no accounts, no sessions, and no recovery. Asset URLs are independent unguessable capabilities.

PINs add a second, low-entropy secret. Every place that currently treats a link token as sufficient must learn about unlock sessions, including the WebSocket, otherwise a link holder could bypass the UI and connect directly to collaboration. The join code adds a second way to identify a deck without receiving a link.

## Goals / Non-Goals

**Goals:**

- Add a unique seven-digit join code and two role-specific six-digit PINs to every new deck.
- Require the matching role PIN before content loads, whether the visitor arrives by link or by code.
- Remember successful unlocks for 30 days per browser without storing the PIN itself.
- Enforce the gate on deck APIs and live collaboration, not just in React.
- Give editors a way to recover by resetting all access values, invalidating old values and sessions.
- Preserve link-only behavior for existing decks.

**Non-Goals:**

- Accounts, passwords, email recovery, or owner identity.
- Adding access values to existing decks in this change.
- Recovering original edit/view links from a code-joined session; those links are not stored reversibly.
- Adding code-joined sessions to the recent-decks list, which remains link/token based.
- Changing asset-URL access. Asset IDs remain unguessable capabilities.
- Preventing a creator from storing links, codes, and PINs on the same device.
- Multi-instance shared rate limiting; the existing in-memory limiter model applies.

## Decisions

### 1. Generate a join code plus two PINs at deck creation

New decks receive:

- A **join code**: a uniform seven-digit value from `crypto.randomInt(0, 10_000_000)`, zero-padded, so `0001234` is valid. It is unique across decks, checked with a retry loop and enforced by a unique database index.
- An **edit PIN** and a **view PIN**: independent values from `crypto.randomInt(0, 1_000_000)`, zero-padded to six digits. If they collide, the view PIN is regenerated.

The join code is a non-secret deck identifier: it is shown in the share dialog and stored in plaintext so the landing page can look it up. It must never authorize deck content by itself. Role PINs are secrets and are hashed with Node's `crypto.scrypt` using a random 16-byte salt, stored as a versioned string such as:

```text
scrypt$16384$8$1$<base64url salt>$<base64url hash>
```

The `decks` table gains nullable `join_code` (unique), `edit_pin_hash`, `view_pin_hash`, and an integer `pin_version` (new decks start at `1`). Null values mean a legacy link-only deck. Verification uses `crypto.timingSafeEqual` on the derived key.

**Why scrypt for PINs:** a six-digit PIN has only one million possibilities. A fast hash would fall instantly to an offline attack if the database leaked. Salting prevents precomputed tables. The join code is exempt because it is intentionally public and useless without a role PIN.

**Why plaintext join code:** it must be displayed later and looked up directly by the landing page. It is a public identifier, not a secret.

### 2. Add a landing-page join flow

The landing page gets a **Join a deck** form with a seven-digit code input. The flow is:

1. `POST /api/join/lookup` with `{ code }` returns `{ deckId, title }` or the generic not-found response.
2. The UI shows the deck title and two choices: **Edit** or **View**.
3. `POST /api/join/unlock` with `{ code, role, pin }` verifies the code still maps to the deck and checks the PIN for the chosen role.
4. Success returns an unlock session, deck ID, role, title, and expiry. The client stores the session and navigates to `/d/{deckId}`.
5. `DeckLoader` finds the stored session and opens the deck without a link token.

Splitting lookup from unlock keeps the title/role-choice step simple and lets the PIN prompt show the right role. Both routes are rate-limited. The unlock route resolves the deck by code again, so knowing a deck ID is not enough to bypass the code.

**Alternatives considered:** redirecting to `/j/{code}`. A dedicated route is convenient for links but adds URL/state handling without improving the requested main-page flow. A lookup ticket was rejected because it adds a second short-lived credential without removing the need to re-check the code.

### 3. Use stateless HMAC-signed unlock sessions

A successful link unlock or join-code unlock returns a 30-day session token:

```text
v1.<base64url payload>.<base64url HMAC-SHA256 signature>
payload: { deckId, role, pinVersion, exp }
```

The signing key comes from `DECK_SESSION_SECRET`, shared by the web and collaboration services. The session is stored in `localStorage` per deck and sent as the Bearer credential for subsequent deck APIs and as the Hocuspocus token. The collaboration server verifies the signature, expiration, deck ID, and `pinVersion` against the deck row before accepting the connection. An access reset increments `pinVersion`, invalidating every outstanding session without a session table.

**Why stateless:** no session table, cleanup job, or extra database write per unlock. The only per-request cost is the existing deck lookup plus an HMAC verification. The secret must be at least 32 characters in production; development and tests use a documented dev-only fallback so local setup still works. If production has no secret, creating or unlocking a PIN-protected deck fails with a clear configuration error rather than issuing forgeable sessions.

**Alternatives considered:** database-backed random session tokens. More straightforward to revoke individually, but requires a migration, cleanup, and another lookup; `pinVersion` already provides global revocation for the reset flow.

### 4. Separate link credentials, join identity, and session credentials

A protected deck has three access concepts:

- **Link token** — proves which link was opened and therefore the intended role; used only to request a PIN and to inspect the session state. Absent in a code-joined session.
- **Join code** — identifies the deck from the landing page; used only to look up the deck and choose a role. Not an authorization credential.
- **Unlock session** — proves a role PIN was accepted; required for all protected operations and for collaboration.

`POST /api/decks/[deckId]/session` keeps accepting the link token:

- For a legacy deck it returns the role and title immediately.
- For a protected deck without a session it returns `200` with `{ requiresPin: true, role }`, so the client can show the correct prompt without treating the deck as missing.
- With a valid unlock session it returns the normal role/title.

`POST /api/decks/[deckId]/unlock` accepts the link token plus `{ pin }`. `POST /api/join/unlock` accepts `{ code, role, pin }` and returns the same unlock payload plus the deck ID. Both verify the role PIN and create a session.

All other deck-scoped routes call an authorization helper that accepts an unlock session for protected decks and still accepts a link token for legacy decks. A raw link token for a protected deck is rejected with `401 pin_required`. The collaboration server applies the same distinction: it first tries session-token verification; if that fails, it only falls back to link-token comparison when the deck has no PIN hashes.

**Why the session response distinguishes PIN-required:** a 404 would be indistinguishable from an invalid link and would force the UI to guess. Returning the role is safe because the link token already determines it.

### 5. Keep the original link token alongside the session

`DeckProvider` currently receives one `token` used for API calls, collaboration, and share-link construction. Split this into:

- `token` — the credential for APIs and collaboration (unlock session for protected decks, link token for legacy decks).
- `linkToken` — the original fragment token when the deck was opened by link; `null` for a code-joined session.

`DeckLoader` owns the unlock state: it reads any stored session for the deck, tries it first, and otherwise shows the PIN screen. On success it stores the session with its expiry and passes the session credential plus the optional link token to `DeckProvider`. All existing API modules that use `token` continue to work because they receive the session credential.

Share links and recents continue to use the edit link token when present. A code-joined editor has no link token, so the share dialog offers the join code and PINs instead of links. Viewers never receive the edit token.

### 6. Show access values once, persist them locally, and allow reset

The deck creation response includes `joinCode`, `editPin`, and `viewPin` exactly once. The landing page stores them in a separate local store keyed by deck ID before opening a creation confirmation dialog. The dialog shows all three with copy actions, warns that they are access secrets, and only then opens the editor.

The share dialog reads them from the same local store. If the current browser does not have them, it does not pretend to know them; it shows links when available and an editor-only reset action. Reset through `POST /api/decks/[deckId]/access/reset`:

1. Requires an edit unlock session.
2. Generates a new unique join code and two new PINs, writes new hashes, and increments `pinVersion`.
3. Invalidates all old unlock sessions by version, and makes the old code and PINs stop working.
4. Returns the new values and a fresh edit unlock session to the caller.
5. Updates the local store and tells the editor that collaborators must use the new values.

**Why local-only value display:** the server stores PIN hashes and cannot recover them. The join code could be read from the server, but the PINs cannot. Keeping all three together on the creating device makes the share dialog consistent and keeps reset as the recovery path. Losing the join code, both PINs, and all remembered sessions makes the deck unreachable, which is consistent with the existing no-account model and documented as an accepted risk.

### 7. Rate-limit code lookup and PIN attempts

All join and unlock routes consume from in-memory limiters before doing expensive work:

- Join-code lookup per IP, default 20 lookups per 15 minutes (`JOIN_LOOKUP_RATE_LIMIT`).
- Join-code attempts per code, default 50 per 15 minutes (`JOIN_CODE_ATTEMPT_RATE_LIMIT`), to blunt distributed enumeration.
- PIN attempts per IP, default 10 per 15 minutes (`PIN_ATTEMPT_RATE_LIMIT`).
- PIN attempts per deck, default 50 per 15 minutes (`PIN_DECK_ATTEMPT_RATE_LIMIT`).

Exceeding a limit returns `429` with `Retry-After`. Unknown codes return the generic not-found response. A valid link or code with a wrong PIN returns `401 invalid_pin` without indicating whether the PIN belongs to the other role.

**Trade-off:** these are process-local, like existing deck-creation and auth-failure limits. A multi-instance deployment needs a shared limiter. The seven-digit code space plus lookup limits makes enumeration impractical; the six-digit PIN space plus per-client and per-deck limits makes online guessing impractical in the current single-instance deployment.

### 8. Preserve legacy decks without a schema-version change

The new columns are nullable and default `pin_version` to `0`. A deck is protected only when both PIN hashes are present. Existing rows remain link-only and have no join code. New decks always set a join code, both hashes, and `pinVersion = 1`.

Session-token verification does not apply to legacy decks; they continue to use link tokens exactly as today. No Yjs or deck-content migration is required.

### 9. Test strategy

- **Unit (`packages/deck` / web server)**: join-code format and uniqueness, leading zeros, PIN generation and scrypt round-trip, session-token sign/verify/expiry/version binding, secret handling in development and production.
- **Integration (`apps/web/test`)**: creation returns code and PINs once and stores only PIN hashes; lookup reveals title but not content; join unlock verifies code and role; wrong code/PIN; rate limiting; unlock session works on session, upload, and image-search routes; raw link token rejected for protected decks; legacy decks unchanged; reset rotates all three and invalidates sessions.
- **Integration (`apps/collab/test`)**: a link token cannot join a protected deck; an unlock session can, including one obtained by join code; viewer sessions remain read-only; a token with the old `pinVersion` is rejected.
- **Component (web)**: creation dialog shows/copies/stores the code and PINs; landing join form handles valid/invalid codes and role choice; PIN entry validates six digits and shows invalid/rate-limit errors; remembered session skips the prompt; share dialog shows links or code/PINs and resets access; viewer never sees reset.
- **Playwright**: create a deck and record all values; join from the landing page by code; wrong PIN stays locked; correct edit/view PIN opens the right role; reload without prompt; reset invalidates the old code and PINs; code-joined editor sees code/PIN sharing but no links; legacy fixture opens without a prompt; two editors still collaborate after unlocking.

## Risks / Trade-offs

- **Lost access values and browser sessions are unrecoverable** → reset requires an edit PIN or an existing edit unlock session. This is documented in the creation and share dialogs. It follows the existing no-account recovery model.
- **Six-digit PINs and seven-digit codes are low entropy** → scrypt protects PIN hashes, lookup and unlock are rate-limited, and codes expose only the title without a role PIN. Operators must serve the app over HTTPS.
- **Join codes reveal deck titles** → a valid code shows the title by design. Codes are unique and rate-limited; no content or role is exposed without a PIN.
- **Session secret misconfiguration** → production issuance fails closed if `DECK_SESSION_SECRET` is missing or too short; docs and startup validation call this out.
- **Rollback to the previous web build would bypass PINs** → deploy the collaboration server and migration first, then the web build; do not roll back the web process while PIN-protected decks are live unless the app is taken offline. Legacy decks remain safe.
- **Code-joined editors cannot reveal original links** → the share dialog shows the code and PINs instead. This is deliberate; recovering links would require storing reversible link tokens.
- **Code-joined sessions are not added to recent decks** → the 30-day session still avoids a PIN prompt when the code is entered again, but the landing page cannot reopen the deck without the code. Recents remain link-based in this change.
- **Access values stored in browser storage beside edit links** → anyone with access to that browser profile already has the edit link. Sharing the PIN through a separate channel is what creates the second factor.
- **Asset IDs still work without a PIN** → asset URLs are 128-bit capabilities and are not listed by the deck APIs. The PIN protects deck content, structure, and editing, not previously leaked image URLs.
- **Per-process attempt limits** → same limitation as existing rate limiting; a shared store is a future multi-instance concern.

## Migration Plan

1. Add the nullable `join_code` (unique), `edit_pin_hash`, `view_pin_hash`, and `pin_version` columns in a database migration. Existing rows keep working as link-only decks.
2. Set `DECK_SESSION_SECRET` (32+ characters) for both web and collaboration in production. Development falls back to the documented dev-only secret.
3. Deploy the collaboration server first: it accepts legacy link tokens and the new unlock sessions.
4. Deploy the web app, which starts issuing access values for new decks and requiring unlock sessions for protected operations.
5. Verify creation, landing-page join, unlock, collaboration, reset, and a legacy deck. No deck-content migration is required.
6. Rollback: unpublish or take the app offline before restoring an older web build if PIN-protected decks exist; the older build does not understand PIN protection. Restoring the old collaboration server is safe for legacy decks but prevents protected decks from connecting.
