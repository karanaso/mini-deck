# Design

## Context

See `proposal.md` for motivation. Two constraints shape the approach:

- Images in a deck are referenced by `assetId` and served from the deck's own asset store, never from remote URLs. Export renders the same Konva slide off-screen, so every displayed image must be same-origin and stored locally.
- Deck content lives in a Yjs document. Slide data is read through helpers in `packages/deck` and written through explicit operations; older documents do not have new keys. New per-slide fields must therefore have safe defaults and must not require a schema-version bump.

The web app already has a server-side image pipeline (`sharp`, size/type validation, `deck_assets` rows), a token-based deck authorization helper, an in-memory rate limiter, and EN/EL dictionaries.

## Goals / Non-Goals

**Goals:**

- Search Unsplash and Pexels from the editor with no provider key in the browser.
- Import a chosen photo into the deck asset store so it renders, collaborates, and exports exactly like an uploaded image.
- Add a small, predictable transition model that is stored with each slide and animated only during presentation.
- Keep the feature set opt-in per provider and completely backward compatible.

**Non-Goals:**

- No general-purpose URL image import, stock video, or GIF search.
- No provider accounts, OAuth, collections, favorites, or per-user API keys.
- No per-element entrance animations, animation ordering, custom durations, or transition editing for viewers.
- No changes to the database schema, deck schema version, or export behavior.
- No visible attribution watermark baked into slides or exports.

## Decisions

### 1. Proxy provider calls through the server

The browser calls deck-scoped app routes; the server calls Unsplash and Pexels with server-side keys.

**Why:** keys stay secret, provider CORS does not matter, responses can be normalized, rate limits can be enforced centrally, and the import route can re-fetch by ID instead of trusting a client-supplied URL. Direct browser calls were rejected because they expose keys and cannot guarantee that the imported bytes are safe or durable.

**Provider abstraction:** a small registry in `apps/web/src/server/stock-images/` exposes a common interface:

```ts
interface StockProvider {
  id: "unsplash" | "pexels";
  search(input: SearchInput): Promise<StockSearchPage>;
  resolve(photoId: string): Promise<StockPhotoSource>;
}
```

`SearchInput` carries a trimmed query, page, and orientation. `StockSearchPage` carries normalized summaries (`id`, `provider`, `previewUrl`, `thumbnailUrl`, width, height, photographer name/profile URL, source page URL, alt text) plus `hasMore`. `StockPhotoSource` additionally carries the best downloadable image URL and the attribution needed for the inserted element. Provider-specific JSON mapping lives beside each provider and is unit-tested with fixtures.

**Provider enablement:** `UNSPLASH_ACCESS_KEY` and `PEXELS_API_KEY` are optional environment variables. A non-empty value enables that provider. `GET /api/image-search/providers` returns only enabled provider IDs; the editor fetches this when the image menu opens and caches it for the session. The endpoint returns no key material.

**Alternatives considered:** a single "all providers" result list. Rejected for the first version because merging two independently paginated result sets and ranking them adds complexity without a clear UX benefit. Provider tabs with independent pagination are predictable and easy to test.

### 2. Deck-scoped search and import routes

- `GET /api/image-search/providers` — public, cacheable, returns enabled providers.
- `GET /api/decks/[deckId]/image-search?provider=&q=&page=&orientation=` — requires the deck bearer token and the editor role; returns normalized results.
- `POST /api/decks/[deckId]/image-search/import` — requires the editor role and accepts `{ provider, photoId }` only.

Search and import are deck-scoped so authorization, abuse limits, and asset ownership all use the same context as uploads. Viewers cannot search. Responses use the existing `apiError` shape and `no-store` headers.

**Validation and limits:**

- Query is trimmed, 1–100 characters; page is an integer from 1–50; orientation is `landscape`, `portrait`, or `all`.
- Rate limits use the existing `RateLimiter`: `IMAGE_SEARCH_RATE_LIMIT` (default 60/minute per IP) and `IMAGE_IMPORT_RATE_LIMIT` (default 30/minute per IP).
- Successful search pages are cached in a small in-memory LRU (100 entries, 60-second TTL) keyed by provider, query, page, and orientation. Cache and limiter are best-effort per process, matching the existing deck-creation limiter.
- Provider calls use a 5-second timeout for search and a 15-second timeout for import. Upstream 429 responses surface as a 429 app error with a retry message; other upstream failures surface as 502. The client keeps the query and offers retry.
- The import body is schema-validated with `zod`; unknown providers or malformed IDs return 400.

### 3. Import reuses the upload pipeline

Extract the current upload route's validation and `sharp` work into a shared server helper (`apps/web/src/server/images.ts`) that accepts bytes plus a declared MIME type, resizes to the existing 2560-pixel bound, applies the existing format rules, writes to storage, and inserts a `deck_assets` row.

The import route:

1. Resolves the provider photo by ID through that provider's API.
2. Accepts only HTTPS URLs whose host is on that provider's approved image-host list (`images.unsplash.com`, `plus.unsplash.com`, `images.pexels.com`). This protects against SSRF even if a provider response is malformed.
3. Downloads with a byte cap derived from `MAX_IMAGE_BYTES`, checking `Content-Length` when present and aborting the stream when the cap is exceeded.
4. Passes the bytes to the shared image pipeline, stores the asset, and returns `{ asset, credit }`.
5. For Unsplash imports, calls the provider's download-tracking endpoint after the asset is stored; failure of that call does not fail the import.

Because the deck stores the resulting `assetId`, a later provider deletion cannot break the deck. No database migration is needed; imported images are ordinary `deck_assets` rows.

**Alternatives considered:** storing the provider URL directly in the image element. Rejected because it breaks CORS-safe export, leaks the deck's use to the provider on every view, and breaks when the provider removes the photo.

### 4. Credit metadata travels with the image element

`ImageElementData` gains an optional `credit` object:

```ts
interface ImageCredit {
  provider: "unsplash" | "pexels";
  photographerName: string;
  photographerUrl: string;
  sourceUrl: string;
}
```

The zod image schema accepts the optional object; document read helpers ignore malformed credit rather than dropping the image. The toolbar passes credit when inserting; clipboard copy/paste and duplication preserve it because they operate on `ElementData`. The style panel shows a small "Photo by … on Unsplash/Pexels" line with a safe external link when the selected image has credit.

**Why element metadata instead of database columns:** it avoids a migration and an extra asset lookup, and the credit stays with copies of the image across slides and decks. The trade-off is that it is part of collaborative content and can be edited by any editor; that is acceptable for attribution display and it is validated on read.

Attribution is intentionally not drawn on the slide or included in exports; the search UI and editor inspector satisfy the requirement without altering slide design.

### 5. Image insertion is shared by upload and search

Extract the current toolbar insertion logic into `apps/web/src/lib/insert-image.ts`:

```ts
placeImageAsset({ doc, slideId, asset, credit?, selectOnly, undoManager })
```

It caps the initial width at 1200 px, preserves the asset aspect ratio, centers the image, adds the element, selects it, and stops undo capture. Both upload and stock import call it, so the two paths cannot drift.

### 6. Transitions are a per-slide string with a safe default

Add to `packages/deck`:

```ts
export const SLIDE_TRANSITIONS = ["none", "fade", "push", "zoom"] as const;
export type SlideTransition = (typeof SLIDE_TRANSITIONS)[number];
```

`SlideData` gains `transition: SlideTransition`, and `SlideMap` stores `transition`. `getSlideData` returns `"none"` when the key is missing or invalid; `createSlideMap` writes `"none"`; `createSlideDataMap` writes a validated value; `duplicateSlide` copies the source transition; a `setSlideTransition` operation writes it in a local transaction. The schema version stays at 1 because readers default missing values and writers add an ignorable key safely.

**UI:** a transition dropdown in the editor top bar, visible only to editors, applies to the current slide. It lists None, Fade, Push, and Zoom with the active one marked, and writes through the same undo manager as other slide edits. A compact icon and tooltip keep the control unobtrusive; localized labels come from the dictionaries.

**Alternatives considered:** a free-form duration/easing editor. Rejected as excessive for "a couple of transitions" and harder to keep consistent in presentations.

### 7. Presentation uses a two-layer CSS animation state machine

`PresentationOverlay` keeps two values: the settled slide index and the requested target index. Navigation updates only the target. When target differs from settled, the overlay renders the settled slide as the outgoing layer and the target slide as the incoming layer, applies a CSS class for the transition, and starts a timer (or listens for `animationend`). On completion it marks the target as settled.

- Fade: outgoing stays, incoming animates opacity 0 → 1.
- Push: outgoing translates by −100% (forward) or +100% (backward); incoming starts at the opposite edge and ends at 0.
- Zoom: incoming scales 0.92 → 1 with opacity 0.6 → 1.
- None: settled jumps immediately.
- Rapid navigation: changing the target cancels the in-flight timer, keeps the last settled slide as the outgoing layer, and animates once to the newest target. Presentation therefore never displays a stale slide after settling.
- Reduced motion: a `matchMedia("(prefers-reduced-motion: reduce)")` listener sets the duration to zero and skips animation classes.

The overlay renders `SlidePreview` layers, which already share the exact slide renderer. The animation is presentation-only; the editor canvas, rail thumbnails, and `renderSlideToCanvas` never read the transition. CSS keyframes live in a small global stylesheet so Tailwind utilities are not generated dynamically.

**Alternatives considered:** adding `framer-motion` or another animation library. Rejected; a 380 ms two-layer CSS transition is small enough to implement directly and avoids a dependency.

### 8. Localization and error mapping

All new UI strings (menu items, dialog labels, provider labels, orientation options, loading/empty/error copy, attribution pattern, transition names, tooltips) go into both `en.ts` and `el.ts`. API error codes map through the existing `messageForError` path. Provider brand names ("Unsplash", "Pexels") and photographer names remain untranslated.

### 9. Test strategy

- **Unit (`packages/deck`)**: transition defaulting, invalid values, round-trip, duplication, credit schema, clipboard preservation of credit.
- **Unit (`apps/web`)**: provider response mapping with fixtures, env provider resolution, query validation, cache keying, transition/reduced-motion helpers.
- **Integration (`apps/web/test`)**: search route with a stubbed `fetch`; disabled provider; viewer/read-only rejection; rate limit; import re-fetch and asset row creation; rejected arbitrary URL; oversized provider image; upstream failure mapping.
- **E2E (Playwright)**: image menu availability with and without providers (route interception), search → import → visible image, attribution in the style panel, transition selection persistence, presentation transition attributes, and reduced-motion instant navigation.

Provider tests stub the global `fetch`; no live API keys are required in CI. A manual smoke checklist covers real keys.

## Risks / Trade-offs

- **Provider quotas and outages** → cache search pages briefly, rate-limit per IP, keep the query on failure, and show retry. Imported decks are unaffected by later outages.
- **Licensing and attribution expectations** → show credit in results and retain it in the element; trigger Unsplash's download endpoint on import. Operators remain responsible for provider terms.
- **In-memory cache and rate limits are per process** → same limitation as the existing deck-creation limiter; acceptable for the current single-instance deployment. A shared store can replace it later without changing the API.
- **Two Konva stages during a transition** → only one extra render for ~380 ms, and reduced motion disables it. Slide previews are already lightweight.
- **Optional `credit` field could be malformed by another client** → read validation keeps the image and drops only the malformed credit; clipboard and duplicate paths preserve valid credit.
- **Provider image hosts change** → the allowlist is centralized per provider; an unexpected host fails closed with a clear import error rather than being fetched.
- **Transition control adds top-bar density** → a compact icon dropdown, editor-only, with localized tooltip and active state.
- **Older clients** → they ignore the `transition` key and preserve it in Yjs updates, so transitions are not lost by editing other content. They will present without animation until upgraded, which is the intended compatibility behavior.

## Migration Plan

1. Deploy the code with no provider keys configured. Search is hidden; uploads, decks, and presentation behave as before.
2. Set `UNSPLASH_ACCESS_KEY` and/or `PEXELS_API_KEY` and restart the web app. Add the optional rate-limit variables only when tuning is needed.
3. Run the provider mapping and import tests, then a manual search/import smoke test with real keys.
4. No database migration or deck migration is required. Existing decks read transitions as None.
5. Rollback: unset the provider keys to hide search. Newly imported images remain valid deck assets. Transition keys remain in Yjs documents and are ignored by older builds, so rollback does not corrupt decks.
