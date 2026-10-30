# Proposal

## Why

Editors can only add images from local files or the clipboard, so finding a suitable visual means leaving the editor, downloading a photo, and uploading it again. Presentations also jump abruptly between slides, which makes a shared deck feel less polished. This change brings stock photo search into the editor and adds a small, predictable set of slide transitions.

## What Changes

- Add server-proxied stock image search for Unsplash and Pexels. A provider is available only when its server-side API key is configured; keys never reach the browser.
- Replace the single image action with an image menu offering **Upload image** and **Search stock photos**. The search dialog provides a query field, provider tabs, an orientation filter, pagination, and loading, empty, and error states.
- Show photographer and provider attribution in search results, and retain that credit on the inserted image element so it can be shown in the editor later.
- Import a chosen photo by provider and photo ID. The server re-fetches the photo metadata and image, validates type and size, runs it through the existing image pipeline, stores it as a deck asset, and inserts a normal image element. No remote URLs are stored in the deck.
- Add per-slide transitions: **None** (default), **Fade**, **Push**, and **Zoom**. An editor chooses the current slide's transition from the top bar; the choice is stored in the collaborative deck and applies for every participant.
- Animate transitions only in presentation mode. Push is direction-aware, and all motion is skipped when the viewer prefers reduced motion. Thumbnails, the editor canvas, and PNG/PDF export remain static.
- Keep existing decks compatible: a slide without a stored transition reads as **None**. The deck schema version and database schema do not change.
- Add English and Greek interface strings for the new controls and document the optional provider configuration.

## Capabilities

### New Capabilities

- `stock-image-search`: In-editor search across configured stock photo providers, importing a chosen result as a deck image, attribution, provider enablement, request limits, and failure handling.

### Modified Capabilities

- `deck-authoring`: Presentation mode gains per-slide transitions, and the editor gains a control for choosing the current slide's transition.

## Impact

- **`apps/web`**: New provider client and mapping modules, deck-scoped search and import routes, provider availability route, image search dialog, image menu, presentation transition playback, attribution display, English/Greek dictionaries, server environment schema, and tests.
- **`packages/deck`**: Optional credit metadata on image elements, a `SlideTransition` type, slide default/read/write behavior, duplication behavior, schema validation, and unit tests.
- **`packages/db`**: No migration. Imported photos reuse the existing `deck_assets` table and storage pipeline.
- **Configuration**: Optional `UNSPLASH_ACCESS_KEY` and `PEXELS_API_KEY`; search and import rate-limit settings; updates to `README.md`, `.env.example`, and deployment documentation.
- **External services**: Outbound calls to the Unsplash and Pexels APIs from the server, subject to provider quotas. No new runtime dependency.
- **Compatibility**: Additive. Existing decks, share links, collaboration, exports, and clients that do not know about transitions continue to work.
