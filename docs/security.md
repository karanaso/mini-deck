# Security review

Scope: capability links, HTTP APIs, WebSocket collaboration, asset handling, clipboard ingestion, and browser headers. This is a link-shared prototype without accounts; controls focus on preventing accidental cross-deck access and unauthenticated writes.

## Controls

### Capability links

- 126-bit deck IDs and 32-byte edit tokens.
- View tokens are derived with HMAC-SHA-256 from the edit token and deck ID. They are one-way.
- Tokens live in the URL fragment, never in the initial HTTP request, server access logs, or `Referer`.
- Only SHA-256 token hashes are stored. Role resolution uses timing-safe comparison with the edit hash checked first.
- API and WebSocket authorization require the bearer token or a signed unlock session; no cookie-based sessions, so classic CSRF does not apply.
- Invalid, tampered, and unknown links return the same generic 404.

### Deck access PINs

- New decks receive a unique seven-digit join code and two six-digit role PINs generated from a cryptographic random source.
- Role PINs are stored only as salted scrypt hashes. A six-digit PIN is low entropy, so scrypt and attempt limits are required.
- Unlocks are stateless 30-day HMAC-signed sessions bound to the deck, role, and PIN version. `DECK_SESSION_SECRET` is shared by the web and collaboration services and must be at least 32 characters in production.
- The join code is a public identifier, not a secret. It resolves only the deck title; slide content and collaboration require a role PIN.
- A raw edit or view link token does not authorize protected deck APIs or collaboration. The collaboration server rejects link tokens when the deck has role PIN hashes.
- Reset access rotates the join code and both PINs and increments the PIN version, invalidating all prior unlock sessions and values.
- Join lookups and PIN attempts are rate-limited per client, code, and deck. The limits are process-local.
- A forgotten PIN is recoverable only through an existing edit unlock session; losing every access value and remembered session makes the deck unreachable.

### Read-only enforcement

`onAuthenticate` sets `connectionConfig.readOnly = true` for view tokens. Hocuspocus rejects Yjs sync updates from those connections while continuing to deliver sync and awareness. An integration test connects a viewer, attempts to write a title, and verifies a fresh editor still sees the original title. UI controls are hidden as a second layer.

### Browser headers

- `Referrer-Policy: no-referrer`
- `Cache-Control: no-store` on deck shells and APIs (assets are immutable)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` and `frame-ancestors 'none'`
- CSP restricts scripts, styles, images, fonts, workers, and connections to the app and collaboration origin.
- No third-party scripts or analytics are loaded on deck pages, reducing fragment-token exfiltration paths.

### Assets

- PNG, JPEG, and WebP only; SVG and active formats are rejected.
- 10 MB upload cap.
- Every image is decoded and re-encoded with `sharp`, stripping metadata and limiting pixels/dimensions.
- MIME type is stored on the server, not trusted from the request at delivery time.
- Asset IDs are 128-bit capabilities; delivery is `nosniff`, inline, and immutable.
- Object keys are generated server-side; uploaded filenames never reach storage paths.

### Stock image imports

- Provider API keys exist only in server environment variables and never appear in client bundles or responses.
- Search and import require an editor token; view-only links receive `403`.
- Import accepts only a provider identifier, never a client-supplied image URL. The server re-fetches metadata and the image itself.
- Image downloads must use HTTPS and an approved provider host, with redirects disabled, a timeout, and the same byte cap as uploads. Provider images pass through the same `sharp` re-encoding pipeline.
- Search pages are cached briefly and both search and import are rate limited per IP.
- Result thumbnails load from the provider CDNs, so the CSP allows only `images.unsplash.com`, `plus.unsplash.com`, and `images.pexels.com` in `img-src`. No provider script is loaded.

### Input handling

- Clipboard envelopes are strict zod schemas with element, byte, and text caps. Unknown fields fail closed.
- HTML from the clipboard is never inserted into the DOM; only the app's non-executable marker is parsed.
- Text is rendered by Konva/React as text, not HTML.
- Deck/element/text/title limits are enforced in shared operations and the API.
- WebSocket payloads are capped at 5 MiB; unauthenticated queue limits use Hocuspocus defaults.
- Awareness states are validated and malformed entries dropped.

### Abuse resistance

- In-memory token buckets limit deck creation, failed token attempts, stock image search, stock image import, join-code lookups, and PIN attempts per IP and deck.
- Image processing and WebSocket payloads are size-limited.
- SQL is parameterized through Drizzle.
- Logs redact tokens and contain deck ID, role, socket ID, and outcome only.

## Findings and accepted risks

1. **Links have no expiry.** Anyone with a protected link and its role PIN can access the deck until an editor resets access. Link revocation itself is not available; reset rotates all access values.
2. **No account ownership or recovery.** The device-local recent list is the only index; clearing storage loses the list, not the deck.
3. **CSP uses `unsafe-inline` for scripts/styles.** Next.js inline bootstrap styles/scripts require it without a nonce pipeline. `unsafe-eval` is development-only; production removes it. Adding a nonce-based CSP is recommended before a public launch.
4. **Fragment tokens are readable by browser extensions and remain in browser history.** This is inherent to link-based access. The app avoids third-party scripts and documents that links are secrets.
5. **Asset URLs are secondary capabilities.** A leaked image URL exposes that image. Images are re-encoded and served with immutable caching; no private-access control exists per image.
6. **Single collaboration instance.** Rate limiting and presence state are process-local. Scaling requires shared rate limiting and the Hocuspocus Redis extension.
7. **No server-side rendering of deck content.** OpenGraph previews do not show deck content, which is intentional to keep tokens client-side.

## Test evidence

- `packages/deck/test/tokens.test.ts` — token entropy/derivation/hash/role.
- `packages/deck/test/clipboard.test.ts` — malformed/oversized clipboard data.
- `apps/web/test/api.integration.test.ts` — hashed storage, generic 404, headers, upload validation, viewer rejection, rate limiting.
- `apps/web/test/access.integration.test.ts` — PIN creation, link unlock, join lookup/unlock, reset rotation, legacy link-only decks.
- `apps/collab/test/collab.integration.test.ts` — invalid tokens, link-token rejection for protected decks, unlock sessions, read-only writes, awareness, persistence, log redaction.
- `e2e/sharing.spec.ts` — fragment privacy, headers, share dialog, viewer restrictions.
- `e2e/clipboard.spec.ts` — malformed envelopes and read-only paste.
- `e2e/export.spec.ts` — missing asset failure without a partial download.

## Recommended follow-ups

- Owner keys with link rotation/revocation.
- Nonce-based CSP and a formal third-party script ban.
- Redis-backed rate limits and collaboration fan-out.
- Object lifecycle cleanup for orphaned uploads.
- Dependency and container scanning in CI.
