# Sharing and capability links

Mini Deck has no accounts. A link is the capability.

## URL shape

```text
http://localhost:3000/d/{deckId}?lang={en|el}#{token}
```

The token is in the fragment, so it is not sent to the web server, included in access logs, or forwarded in the `Referer` header. The browser shell reads the fragment, calls `POST /api/decks/{deckId}/session` with an `Authorization: Bearer` header, and passes the token to the collaboration provider.

The `lang` query parameter carries the editor's interface language. The proxy consumes a valid value, stores it in the `mini-deck-locale` cookie, and redirects to `/d/{deckId}#{token}` without the query. The browser inherits the fragment on that redirect, so the token is never sent to the server. Existing links without `lang` keep working and use the visitor's stored or browser-derived language.

`lang` is presentation-only. Changing, removing, or invalidating it never changes the deck ID, role, permissions, collaboration data, or exports. It is not an authorization input.

## Tokens

- `deckId`: 21-character nanoid (126 bits).
- `editToken`: 32 random bytes, base64url encoded.
- `viewToken`: `base64url(HMAC-SHA256(editTokenBytes, "view:" + deckId))`.
- `joinCode`: unique seven-digit deck identifier for landing-page entry.

Only SHA-256 hashes of the edit and view tokens are stored. Role resolution hashes the presented token and compares timing-safely against both hashes, checking the edit hash first. A view token cannot be exchanged for editing rights and cannot reveal the edit token.

## PINs and join codes

New decks receive a unique seven-digit join code and two six-digit PINs: one for editing and one for read-only viewing. The creation dialog shows all three once and stores them in that browser. Only salted scrypt hashes of the PINs are stored; the join code is a non-secret lookup value.

A protected deck can be opened in two ways:

1. Open the edit or view link, then enter that role's PIN.
2. Enter the join code on the landing page, choose Edit or View, then enter that role's PIN.

A successful unlock is remembered for 30 days in that browser. A raw link token or join code never authorizes deck content or collaboration; the server requires the signed unlock session for protected operations. The collaboration server rejects link tokens when the deck has PIN hashes.

The share dialog shows the links when the session was opened through a link, plus the join code and PINs when this browser knows them. A code-joined editor sees the code and PINs instead of the original links, because the link tokens cannot be recovered from their hashes. **Reset access** generates a new code and both PINs, invalidates old values, and signs out existing unlock sessions.

Existing decks created before PIN support have no join code or PINs and continue to use link-only access.

## Roles

| Link | Capabilities |
| --- | --- |
| Edit | View, edit, upload, present, export, share |
| View | View, navigate, present, export; no edit, upload, rename, or share |

The collaboration server independently sets `readOnly` for view connections. Hocuspocus rejects document updates from those connections, even if a client is modified.

## Share dialog

The editor derives the view token locally and shows both links. Both include the current interface language as `lang`, and switching language while the dialog is open regenerates them. The dialog warns that links are bearer secrets. View sessions do not receive the edit token and cannot open the share dialog.

## Limitations

- Links have no expiry. An editor can reset all access values, which invalidates old PINs, join codes, and unlock sessions, but the link URLs themselves remain.
- Anyone with an edit link and the edit PIN, or the join code and the edit PIN, can edit and reshare the deck.
- Asset URLs (`/api/assets/{id}`) are separate 128-bit capabilities so images can render without an authorization header. A leaked asset URL exposes that image.
- Recent decks are stored in `localStorage` on the device. Clearing site storage removes that list, not the deck or its links. Code-joined sessions are not added to recents.
- Losing the join code, both PINs, and every remembered session makes the deck unreachable without an existing edit unlock session.

## Tests

`packages/deck/test/tokens.test.ts` covers generation, derivation, hashing, and role resolution. API integration tests cover edit/view/tampered links. Playwright covers the share dialog, copied links, viewer restrictions, the URL-fragment privacy checks, and language-bearing share links (first-open precedence, persistence, and parameter cleanup).
