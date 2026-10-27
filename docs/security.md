# Security review

Scope: capability links, HTTP APIs, WebSocket collaboration, asset handling, clipboard ingestion, and browser headers. This is a link-shared prototype without accounts; controls focus on preventing accidental cross-deck access and unauthenticated writes.

## Controls

### Capability links

- 126-bit deck IDs and 32-byte edit tokens.
- View tokens are derived with HMAC-SHA-256 from the edit token and deck ID. They are one-way.
- Tokens live in the URL fragment, never in the initial HTTP request, server access logs, or `Referer`.
- Only SHA-256 token hashes are stored. Role resolution uses timing-safe comparison with the edit hash checked first.
- API and WebSocket authorization require the bearer token; no cookie-based sessions, so classic CSRF does not apply.
- Invalid, tampered, and unknown links return the same generic 404.

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

### Input handling

- Clipboard envelopes are strict zod schemas with element, byte, and text caps. Unknown fields fail closed.
- HTML from the clipboard is never inserted into the DOM; only the app's non-executable marker is parsed.
- Text is rendered by Konva/React as text, not HTML.
- Deck/element/text/title limits are enforced in shared operations and the API.
- WebSocket payloads are capped at 5 MiB; unauthenticated queue limits use Hocuspocus defaults.
- Awareness states are validated and malformed entries dropped.

### Abuse resistance

- In-memory token buckets limit deck creation and failed token attempts per IP.
- Image processing and WebSocket payloads are size-limited.
- SQL is parameterized through Drizzle.
- Logs redact tokens and contain deck ID, role, socket ID, and outcome only.

## Findings and accepted risks

1. **No link revocation.** Anyone with an edit link can edit and reshare. This is a product limitation, documented in the share dialog. Future owner keys/link rotation will address it.
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
- `apps/collab/test/collab.integration.test.ts` — invalid tokens, read-only writes, awareness, persistence, log redaction.
- `e2e/sharing.spec.ts` — fragment privacy, headers, share dialog, viewer restrictions.
- `e2e/clipboard.spec.ts` — malformed envelopes and read-only paste.
- `e2e/export.spec.ts` — missing asset failure without a partial download.

## Recommended follow-ups

- Owner keys with link rotation/revocation.
- Nonce-based CSP and a formal third-party script ban.
- Redis-backed rate limits and collaboration fan-out.
- Object lifecycle cleanup for orphaned uploads.
- Dependency and container scanning in CI.
