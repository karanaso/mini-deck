# Proposal

## Why

A deck's edit or view link is currently the only secret protecting it. Anyone who receives a forwarded link, sees it in a chat, or recovers it from browser history gains the full role immediately. Adding a separate 6-digit PIN for each role gives the creator a second secret that can be shared through a different channel, without introducing accounts or passwords. A Kahoot-style join code also lets someone find the deck from the landing page without receiving a link.

## What Changes

- Generate a unique 7-digit join code and two random 6-digit role PINs when a new deck is created: an edit PIN and a view PIN.
- Show the join code and both PINs once on a creation confirmation dialog and keep them in the creator's browser so the share dialog can display and copy them later.
- Add a **Join a deck** field on the landing page. A valid join code shows the deck title, then asks the visitor to choose Edit or View and enter that role's PIN.
- Require the matching PIN before a protected deck loads from either a link or the join code. A PIN-protected edit link must not open the editor, and a PIN-protected view link must not show the deck, until unlocked.
- Remember a successful unlock for 30 days in that browser. Expired or missing unlock sessions ask for the PIN again.
- Enforce the PIN gate on the server and the collaboration WebSocket, not only in the UI. A raw edit or view link token must not authorize a protected deck's API or live session by itself.
- Add an editor-only **Reset access** action in the share dialog. Resetting creates a new join code and two new PINs, invalidates the old values, and signs out existing unlock sessions.
- Rate-limit join-code lookups and PIN attempts per client and per deck to make guessing impractical.
- Keep decks created before this change link-only: they have no join code or PINs and require no migration or unlock step. New decks always receive all three values.
- Code-joined editors share the join code and PINs, not the original edit/view links, because those links cannot be recovered from their hashes.
- Add English and Greek interface copy for creation, joining, entry, errors, copying, and reset.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `link-sharing`: New decks gain a join code and edit/view PINs, PIN-gated links and code entry, remembered unlock sessions, access display/reset in the share dialog, attempt limits, and link-only compatibility for existing decks.
- `live-collaboration`: Joining a PIN-protected deck requires a valid unlock session; a raw link token alone no longer authorizes the collaboration connection.

## Impact

- **`packages/db`**: Add a nullable unique join code, nullable hashed edit/view PIN columns, and a PIN version to `decks`; no data migration for existing rows.
- **`packages/deck`**: PIN generation/format helpers and signed unlock-session token helpers shared by the web and collaboration servers.
- **`apps/web`**: Deck creation returns the join code and PINs once; new join lookup, join unlock, link unlock, and access-reset routes; session/authorization changes across deck APIs; landing page join flow; PIN entry state in `DeckLoader`; unlock session persistence; creation dialog and share-dialog changes; EN/EL copy and tests.
- **`apps/collab`**: Authentication accepts unlock sessions for PIN-protected decks and rejects raw link tokens; viewer read-only behavior is unchanged.
- **Configuration**: New `DECK_SESSION_SECRET` shared by web and collaboration for signing 30-day unlock sessions, plus join-lookup and PIN attempt limits. Existing link-only deployments still work, but enabling PINs requires the secret.
- **Security**: Role PINs are stored as salted scrypt hashes; the join code is a non-secret identifier and may be stored for lookup and display. PINs are never logged or returned after creation except by an explicit editor reset. Code lookup and PIN entry are rate-limited. Asset URLs remain unguessable capabilities and are not separately PIN-gated.
- **Compatibility**: Existing decks and share links keep working unchanged. Newly created decks require their join code or link plus PIN. Losing all three values and every remembered browser session makes the deck unrecoverable without a valid edit PIN.
