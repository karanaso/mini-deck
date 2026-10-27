# Editor architecture

## Providers

`DeckProvider` owns the client-side `Y.Doc`, the Hocuspocus provider, awareness, and the undo manager. It connects with the deck ID and capability token, sets the local participant identity, and exposes connection state.

The Y.Doc is the source of truth for deck content. React components read it through scoped hooks in `src/hooks/use-deck.ts`:

- `useDeckTitle` subscribes to the `meta` map.
- `useSlideIds` subscribes to `slideOrder` and the slides map.
- `useSlideData` subscribes to one slide with `observeDeep`, so a thumbnail or canvas only re-renders for the slide it displays.

Snapshots are cached by a serialized key so `useSyncExternalStore` returns stable references. UI-only state (current slide, zoom, active tool, selections, dialogs) lives in `src/store/editor-store.ts`.

## Awareness

Awareness fields are:

```ts
{
  user: { id, name, color },
  cursor: { slideId, x, y } | null,
  selection: { slideId, ids: string[] } | null
}
```

The server validates every state with the shared zod schema. The canvas renders remote cursors and selection outlines in a screen-space overlay. Current slide is local to each participant; remote cursors only appear when the other participant is on the same slide.

## Roles

The session endpoint returns `editor` or `viewer`. `EditorWorkspace` uses that role to decide which chrome to mount:

- Editor: title input, share dialog, toolbar, style panel, slide add/delete/reorder.
- Viewer: title text, present/export, slide navigation, presence, cursors and selections, but no editing or share controls.

The server's read-only enforcement is the security boundary; hiding controls is only a UX layer.

## Canvas

`CanvasStage` wraps Konva:

- content layer, clipped to 1920×1080;
- Transformer layer for selection and transforms;
- screen-space overlay for marquee, remote cursors, and remote selections;
- an HTML textarea overlay for text editing, bound to the nested `Y.Text`.

Element groups are center-positioned with offsets so rotation happens around the element center. Transforms and drags are written through deck operations on `LOCAL_ORIGIN`, which is the origin tracked by `Y.UndoManager`. Remote updates arrive with the provider's origin and are excluded from undo.

## Shapes, lines, and emoji

The toolbar keeps direct rectangle, ellipse, and arrow tools and adds a shape menu for triangle, diamond, parallelogram, trapezoid, pentagon, hexagon, star, and line. Choosing an item sets the editor tool; dragging on the canvas creates the element, selects it, and returns the tool to select.

Closed shapes are stored as one `shape` element variant with a `shape` kind, plus fill, stroke, and stroke width. Lines are a separate `line` variant with stroke, stroke width, and the same `flipX`/`flipY` direction flags as arrows, so they render without an arrowhead. The pure geometry lives in `packages/deck/src/shapes.ts`:

- `getShapePoints(shape, width, height)` returns normalized points that fill the bounding box.
- `getLineEndpoints(width, height, flipX, flipY)` returns the two endpoints.

Both `components/editor/element-node.tsx` (interactive canvas) and `lib/render-slide.ts` (thumbnails, presentation, PNG, PDF) call those helpers, so the two render paths cannot drift. Lines use a minimum hit stroke width so thin strokes remain selectable.

The emoji menu inserts a normal text element containing the chosen emoji at the slide center. There is no emoji element type: inline editing, text styling, clipboard handling, collaboration, and export all use the existing text path. The emoji menu is mounted inside the editor-only toolbar.

## Exports and presentation

`src/lib/render-slide.ts` renders the same element data to an offscreen Konva canvas used for thumbnails, PNG, PDF, and presentation previews. It never draws selection handles, cursors, or editor chrome.

## Testing

- Unit tests cover hooks and clipboard codecs without a browser where possible.
- Playwright covers canvas interaction, text editing, copy/paste, slide management, two-context collaboration, and viewer restrictions.
- The integration suite in `apps/collab/test` verifies server-side read-only enforcement.
