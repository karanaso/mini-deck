# Deck documents

One Yjs document represents one deck. The document is the source of truth for everything inside a deck; PostgreSQL stores a binary snapshot for durability.

## Tree

```text
DeckDoc
├── meta: Y.Map                 { schemaVersion, title }
├── slides: Y.Map               slideId -> SlideMap
│   └── SlideMap
│       ├── background: string
│       ├── elements: Y.Map      elementId -> ElementMap
│       └── elementOrder: Y.Array<elementId>
└── slideOrder: Y.Array<slideId>
```

The document factory is `createInitialDeckDoc()` in `packages/deck/src/document.ts`. It creates one blank slide, sets `schemaVersion` to `1`, and titles the deck `Untitled deck`.

## Coordinates

Slides are a fixed 1920×1080 logical space. The editor scales that space to the viewport; it never changes stored coordinates. Images, text, shapes, lines, and arrows all use the same coordinate system.

## Slides

Each slide is a `Y.Map` with:

- `background` — CSS color, currently `#ffffff`.
- `elements` — a map of element IDs to element maps.
- `elementOrder` — the authoritative z-order. The editor renders elements in this array, not in map insertion order.

`slideOrder` on the root document is the authoritative slide order. Presentation mode and PDF export iterate this array.

A deck always has at least one slide. `deleteSlide()` throws `LastSlideError` when asked to remove the final slide.

## Elements

Every element has a stable 12-character ID and these common fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Stable element identifier |
| `type` | string | `text`, `rect`, `ellipse`, `arrow`, `image`, `shape`, or `line` |
| `x`, `y` | number | Top-left position in slide coordinates |
| `width`, `height` | number | Bounding-box size |
| `rotation` | number | Degrees |
| `opacity` | number | 0 to 1 |

Type-specific fields:

| Type | Fields |
| --- | --- |
| `text` | `text` (`Y.Text`), `fontSize`, `fill`, `align` (`left`, `center`, `right`) |
| `rect` | `fill`, `stroke`, `strokeWidth`, `cornerRadius` |
| `ellipse` | `fill`, `stroke`, `strokeWidth` |
| `arrow` | `stroke`, `strokeWidth`, `flipX`, `flipY` |
| `image` | `assetId` |
| `shape` | `shape` (`triangle`, `diamond`, `parallelogram`, `trapezoid`, `pentagon`, `hexagon`, `star`), `fill`, `stroke`, `strokeWidth` |
| `line` | `stroke`, `strokeWidth`, `flipX`, `flipY` |

Arrows are drawn from one corner of their bounding box to the opposite corner. `flipX` and `flipY` select the direction. Endpoint editing is not part of v1.

Closed shapes are polygons whose points are computed from `getShapePoints()` in `packages/deck/src/shapes.ts` and normalized to exactly fill the element's bounding box. Both the interactive canvas and the offscreen renderer call that helper, so thumbnails, presentation mode, PNG, and PDF output share the same geometry. Lines use `getLineEndpoints()` with the same direction flags as arrows and render without an arrowhead.

## Emoji

Emoji inserted from the editor's picker are ordinary text elements with the emoji as their text. They are not a separate element type, so inline editing, text styling, clipboard handling, collaboration, and exports all use the normal text path.

## Text merging

Text content is stored as a nested `Y.Text`, not a plain string. The editor converts textarea changes into insert/delete operations with `updateYText()`. Concurrent typing therefore merges character by character instead of replacing the whole string.

Style changes (`fontSize`, `fill`, `align`) are normal element properties. Moving an element while another participant changes its color merges because Yjs tracks properties independently.

## Schema versioning

`meta.schemaVersion` identifies the document shape. The current version is `1`. A future change that alters the meaning of an existing field or requires backfilling stored documents must add a migration function. Additive element variants that older documents cannot contain, such as `shape` and `line`, do not require a version bump or migration.

## Validation and limits

`packages/deck/src/types.ts` defines strict zod schemas for element data, clipboard envelopes, titles, and awareness state. Element IDs are generated with `createElementId()`. Limits are in `packages/deck/src/constants.ts`:

- 100 slides per deck
- 2,000 elements per deck
- 10,000 characters per text element
- 120 characters per title
- 200 elements and 1 MB per clipboard payload

Unit coverage lives in `packages/deck/test/`.
