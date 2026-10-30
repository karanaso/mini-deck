# Tasks

## 1. Deck model foundations

- [x] 1.1 Add `SLIDE_TRANSITIONS`, `SlideTransition`, `transition` on `SlideData`, defaulting/reading/writing in `createSlideMap`, `getSlideData`, `createSlideDataMap`, `duplicateSlide`, and `setSlideTransition`. Verify with unit tests for default None, valid round-trip, invalid values, duplication, and old documents without the key.
- [x] 1.2 Add optional `ImageCredit` metadata to image elements, extend the zod schema and document read/write helpers, and preserve credit through clipboard and duplicate operations. Verify with unit tests that valid credit survives a round-trip and malformed credit is dropped without losing the image.
- [x] 1.3 Extract shared image insertion into `placeImageAsset` so upload and future stock imports center a selected image, preserve aspect ratio, and stop undo capture. Verify with a unit test that covers sizing, selection, and credit placement.

## 2. Server-side stock image support

- [x] 2.1 Add optional `UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY`, `IMAGE_SEARCH_RATE_LIMIT`, and `IMAGE_IMPORT_RATE_LIMIT` to the server environment schema, provider registry, and provider-availability logic. Verify with unit tests for configured, missing, and empty keys.
- [x] 2.2 Define normalized search/import types and implement Unsplash and Pexels response mapping, including pagination, orientation, preview/thumbnail URLs, and attribution. Verify with fixture-based unit tests for both providers and malformed responses.
- [x] 2.3 Add the cached search layer and search/import rate limiters, including cache keys, TTL, reset helpers, and upstream 429 mapping. Verify with unit tests for cache hits, key isolation, expiry, and rate-limit refusal.
- [x] 2.4 Extract the existing upload route's validation, `sharp` resize/encode, storage write, and `deck_assets` insert into a shared server image helper. Verify the existing upload integration tests still pass and add a helper test for oversized, unsupported, and valid input.

## 3. Image search API routes and configuration docs

- [x] 3.1 Add `GET /api/image-search/providers` returning only enabled provider IDs with cache headers. Verify with a route test for zero, one, and two configured providers and confirm no key material appears in the response.
- [x] 3.2 Add `GET /api/decks/[deckId]/image-search` with bearer authorization, editor-only access, query/page/orientation validation, normalized results, and mapped provider errors. Verify with integration tests for a successful search, viewer rejection, invalid input, disabled provider, upstream timeout, and rate limiting.
- [x] 3.3 Add `POST /api/decks/[deckId]/image-search/import` that accepts only provider and photo ID, resolves metadata server-side, enforces the approved image-host allowlist and byte cap, stores the asset, and returns asset plus credit. Verify with integration tests for a successful import, rejected URL-shaped input, oversized photo, read-only participant, provider failure, and the Unsplash download trigger.
- [x] 3.4 Document provider keys, rate limits, privacy/attribution expectations, and the no-migration behavior in `README.md`, `.env.example`, and deployment documentation. Verify the documented environment variables match the schema and the quickstart still starts without provider keys.

## 4. Editor image search interface

- [x] 4.1 Add a client API module for provider discovery, search, and import, using the existing bearer token and error mapping. Verify with unit tests that requests carry the token, parameters are encoded, and API errors map to localized messages.
- [x] 4.2 Replace the single image button with an image menu offering upload and stock search, hiding search when no provider is configured. Verify with component tests for menu contents with zero, one, and two providers and that upload still opens the file input.
- [x] 4.3 Build the stock image search dialog with query submission, provider tabs, orientation filter, results grid, photographer/provider credit links, loading, empty, error/retry, "Load more", import progress, and focus handling. Verify with component tests for each state and that choosing a result calls import and inserts the returned asset.
- [x] 4.4 Show retained attribution when an imported image is selected and ensure the credit link is safe (`noopener noreferrer`). Verify with a component test for an image with credit and one with an uploaded asset that has none.
- [x] 4.5 Add all new UI strings to the English and Greek dictionaries and update the localization documentation/glossary. Verify the i18n dictionary parity tests pass and review the Greek copy for untranslated interface text.

## 5. Slide transition control and presentation playback

- [x] 5.1 Add an editor-only transition dropdown to the top bar for the current slide, listing None, Fade, Push, and Zoom with an accessible active state and tooltip. Verify with a component test that selection writes through the document, persists, and is not rendered for viewers.
- [x] 5.2 Implement the presentation transition state machine and CSS keyframes for Fade, direction-aware Push, and Zoom, with rapid-navigation settling and a `prefers-reduced-motion` bypass. Verify with component tests using fake timers for forward/backward Push, fade, none, rapid navigation, and reduced motion.
- [x] 5.3 Add transition labels, tooltips, and accessibility strings to both dictionaries. Verify dictionary parity and that the Greek transition names render.
- [x] 5.4 Verify static surfaces ignore transitions: the editor canvas, slide rail thumbnails, and PNG/PDF export must render unchanged for any transition value. Verify with an integration/export test and a visual assertion in the presentation component tests.

## 6. End-to-end and integration verification

- [x] 6.1 Add Playwright coverage with intercepted provider routes for provider availability, search → import → visible image, and attribution in the style panel. Verify the new tests pass with `pnpm test:e2e` (or the focused spec) and no live keys.
- [x] 6.2 Add Playwright coverage for selecting a transition, reloading, presenting, and asserting the applied transition plus the reduced-motion instant path. Verify the presentation test passes and no stale slide remains after rapid key presses.
- [x] 6.3 Run `pnpm lint`, `pnpm typecheck`, and `pnpm test`; fix any regressions. Verify all commands exit successfully.
- [x] 6.4 Run `pnpm test:integration` and `openspec validate add-image-search-and-slide-transitions --strict`. Verify the integration suite passes and the change validates without errors.

## Workflow follow-up

- Run a manual smoke test with real Unsplash and Pexels keys: search both providers, import a photo, confirm export, and check attribution links.
- Archive the change after the project's review requirements are satisfied.
