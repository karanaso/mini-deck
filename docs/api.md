# HTTP API

All API routes are same-origin. Tokens are sent in the `Authorization: Bearer <token>` header, never in a query string. Deck pages read the token from the URL fragment and send it only to the session endpoint and collaboration provider.

Responses use a compact error envelope:

```json
{ "error": { "code": "not_found", "message": "Deck not found" } }
```

Deck and session responses send `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff`. Asset responses are immutable and long-cached.

## Create a deck

```http
POST /api/decks
```

No body or authentication is required. Rate limited per IP.

```json
{
  "deckId": "pfwqFFrwLL3sfRpWlOUD0",
  "editToken": "…",
  "title": "Untitled deck"
}
```

The view token is derived locally from the edit token:

```ts
viewToken = base64url(HMAC-SHA256(editTokenBytes, `view:${deckId}`))
```

## Open a session

```http
POST /api/decks/{deckId}/session
Authorization: Bearer {token}
```

Returns the role and current title. Edit and view tokens resolve to different roles. Unknown decks, unknown assets, and tampered tokens all return the same `404`.

```json
{ "role": "editor", "title": "Untitled deck" }
```

`role` is `editor` or `viewer`.

## Upload an image

```http
POST /api/decks/{deckId}/assets
Authorization: Bearer {editToken}
Content-Type: multipart/form-data
```

The `file` field must be PNG, JPEG, or WebP and no larger than 10 MB. Images are decoded, re-encoded with metadata stripped, and downscaled to fit within 2560×2560. View tokens receive `403 read_only`.

## Stock image providers

```http
GET /api/image-search/providers
```

No authentication. Returns only the providers configured on the server, for example:

```json
{ "providers": ["unsplash"] }
```

The response never contains API keys. Without keys the list is empty.

## Search stock images

```http
GET /api/decks/{deckId}/image-search?provider=unsplash&q=mountain&page=1&orientation=landscape
Authorization: Bearer {editToken}
```

`provider` is `unsplash` or `pexels`, `q` is 1–100 characters, `page` is 1–50, and `orientation` is `landscape`, `portrait`, or `all`. Only editors may search. Results are normalized across providers and include preview URLs, dimensions, photographer attribution, and a source link.

```json
{
  "provider": "unsplash",
  "query": "mountain",
  "page": 1,
  "hasMore": true,
  "results": [
    {
      "id": "photo-id",
      "provider": "unsplash",
      "thumbnailUrl": "https://images.unsplash.com/…",
      "previewUrl": "https://images.unsplash.com/…",
      "width": 4000,
      "height": 3000,
      "photographerName": "Ada Lovelace",
      "photographerUrl": "https://unsplash.com/@ada",
      "sourceUrl": "https://unsplash.com/photos/photo-id",
      "alt": "A mountain"
    }
  ]
}
```

Errors use the standard envelope. A disabled provider returns `400 provider_not_configured`, an upstream busy provider returns `429 provider_rate_limited`, and other upstream failures return `502 provider_unavailable`. Repeated identical searches may be served from a short-lived server cache.

## Import a stock image

```http
POST /api/decks/{deckId}/image-search/import
Authorization: Bearer {editToken}
Content-Type: application/json
```

```json
{ "provider": "unsplash", "photoId": "photo-id" }
```

The server re-fetches the photo by identifier, downloads it from the approved provider host, validates and re-encodes it with the upload pipeline, stores it as a deck asset, and returns the asset plus credit:

```json
{
  "asset": {
    "id": "AEW27odZsT3JFUmlgz_m1",
    "url": "/api/assets/AEW27odZsT3JFUmlgz_m1",
    "mimeType": "image/jpeg",
    "width": 1920,
    "height": 1080
  },
  "credit": {
    "provider": "unsplash",
    "photographerName": "Ada Lovelace",
    "photographerUrl": "https://unsplash.com/@ada",
    "sourceUrl": "https://unsplash.com/photos/photo-id"
  }
}
```

A URL in `photoId` is rejected with `400`. Oversized or unsupported provider images return `413` or `415` and create no asset. View tokens receive `403 read_only`.

```json
{
  "asset": {
    "id": "AEW27odZsT3JFUmlgz_m1",
    "url": "/api/assets/AEW27odZsT3JFUmlgz_m1",
    "mimeType": "image/png",
    "width": 32,
    "height": 32
  }
}
```

## Deliver an image

```http
GET /api/assets/{assetId}
```

Returns the stored bytes with the stored MIME type, `X-Content-Type-Options: nosniff`, and `Cache-Control: public, max-age=31536000, immutable`. Asset IDs are 128-bit random capabilities so `<img>` tags do not need an authorization header.

## Health

```http
GET /api/health
```

Returns `200 { "status": "ok" }` when the database is reachable, or `503 { "status": "unavailable" }`.

## Smoke script

With the web app running:

```bash
pnpm smoke:api
```

Set `API_URL` to target another origin. The script creates a deck, resolves both roles, uploads a PNG, fetches it, and exercises the health endpoint. It is safe to rerun; each run creates a new deck.
