# Design

## Context

See `proposal.md` — Why and `specs/deck-authoring/spec.md` for the behavior contract. The editor already has a stable element pipeline that every new shape must join:

- `packages/deck` defines the strict zod element union, Yjs decoding/creation, limits, and clipboard envelopes.
- `apps/web/src/components/editor/element-node.tsx` renders the interactive canvas; `apps/web/src/lib/render-slide.ts` renders the same data offscreen for thumbnails, presentation, PNG, and PDF.
- `canvas-stage.tsx` creates elements from drag gestures and previews the in-progress draft.
- `style-panel.tsx`, `editor-store.ts`, and `use-editor-shortcuts.ts` branch on the current element or tool type.
- `apps/web/src/lib/i18n` is a typed English/Greek dictionary; Greek completeness is enforced by the `EnglishDictionary` type.
- The `deck-authoring` capability is currently carried by the unarchived `add-collaborative-decks` delta, so this change adds requirements to the same path rather than introducing a parallel capability.

## Goals / Non-Goals

**Goals:**

- Add the new shapes without duplicating seven near-identical schemas or render switches.
- Make the interactive canvas and the offscreen renderer share one geometry definition.
- Keep every existing element behavior (selection, transform, undo, clipboard, collaboration, limits, export) working automatically for the new types.
- Keep the toolbar discoverable without replacing the existing rectangle, ellipse, and arrow controls.
- Store emoji as ordinary text so no document-format or collaboration change is needed for the emoji feature.

**Non-Goals:**

- Editable vertices, bezier paths, connectors, or line/arrow endpoint editing.
- Per-shape text labels, shape-specific panels, or shape presets.
- A full emoji catalog, search, skin tones, recents, or drag-and-drop emoji.
- Inserting an emoji into an existing text element at the caret.
- Changes to APIs, the database, the collaboration server, or the deck URL model.

## Decisions

### D1. One `shape` element for closed polygons, one `line` element for open strokes

Add two variants to the shared element union:

```ts
type ShapeKind =
  | "triangle"
  | "diamond"
  | "parallelogram"
  | "trapezoid"
  | "pentagon"
  | "hexagon"
  | "star";

interface ShapeElementData extends BaseElementData {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

interface LineElementData extends BaseElementData {
  type: "line";
  stroke: string;
  strokeWidth: number;
  flipX: boolean;
  flipY: boolean;
}
```

`shape` is a discriminated variant with a `shape` kind field. Closed polygons share fill, stroke, and stroke-width semantics, so seven separate element types would duplicate the schema, decode defaults, creation switch, style-panel conditions, and tests. A single variant means a future shape is a new enum member plus geometry, not a new document type.

`line` stays separate because it has no fill and reuses the arrow's directional `flipX`/`flipY` encoding. Folding it into `shape` would force an unused fill field and special cases in the style panel.

Both schemas are `.strict()`, join `elementDataSchema`, and are handled by `getElementData`, `createElementMap`, and `cloneElementData`. Common fields, limits, IDs, clipboard envelopes, undo, and collaboration are unchanged.

**Alternatives considered**

- *One element type per shape (`triangle`, `diamond`, …):* explicit, but multiplies near-identical schemas and switches across five files for no behavioral difference. Rejected.
- *A single `shape` type including `line`:* fewer variants, but line-specific direction fields and missing fill leak into every polygon branch. Rejected.
- *Store shapes as SVG or image assets:* loses vector styling, clean collaboration, and shape identity in the style panel. Rejected.

### D2. Shared pure geometry produces every polygon

Add `packages/deck/src/shapes.ts` exporting `getShapePoints(shape, width, height): number[]` as a flat Konva-compatible point list:

- Triangle: apex at top center, base at the bottom.
- Diamond: midpoints of the four box edges.
- Parallelogram: top edge inset by 25% on the left, bottom edge inset by 25% on the right.
- Trapezoid: top edge inset by 25% on both sides.
- Pentagon/hexagon: regular points inscribed in the box, one vertex at the top.
- Star: ten alternating outer and inner points, inner radius 40% of the outer radius.

The helper is pure and unit-testable. `element-node.tsx` and `render-slide.ts` both call it, so editor, thumbnails, presentation, PNG, and PDF cannot drift. Closed polygons render as `Konva.Line` with `closed: true` plus fill/stroke/strokeWidth; the line element renders as an open `Konva.Line` using the same flip logic as arrows.

Lines get a minimum `hitStrokeWidth` so a thin line remains clickable. Draft previews use the same point helper and are clipped to the dragged box, so the preview matches the committed shape.

**Alternatives considered**

- *Duplicate point math in the two renderers:* fast to write but guaranteed to drift. Rejected.
- *Konva `RegularPolygon` for pentagon/hexagon:* convenient, but its radius model does not fill an arbitrary bounding box and would not share geometry with the offscreen renderer. Rejected.
- *SVG path strings stored in the document:* unnecessary serialization and versioning burden for fixed shapes. Rejected.

### D3. Extend the existing toolbar with a shape picker

Keep rectangle, ellipse, and arrow as direct buttons and existing `tool-rect` / `tool-ellipse` / `tool-arrow` test IDs. Add a `Shapes` dropdown trigger (`tool-shapes`) using the existing Radix dropdown primitive. Its items are triangle, diamond, parallelogram, trapezoid, pentagon, hexagon, star, and line, each with a localized label and an inline SVG preview.

Selecting an item sets the editor tool to the shape kind. `EditorTool` grows the new values, `commitDraft` distinguishes polygon tools and line, and a successful draw selects the element, returns the tool to `select`, and stops undo capture. The trigger shows an active state whenever a picker shape is the current tool.

Radix provides keyboard navigation, focus return, and Escape handling. Line also gets the `L` shortcut; the existing `R` / `O` / `A` shortcuts remain. The shortcuts dialog and toolbar labels are updated in both locales.

**Alternatives considered**

- *Move rectangle and ellipse into the picker too:* cleaner in the abstract, but breaks established muscle memory and several Playwright flows for no requirement. Rejected.
- *One toolbar button per new shape:* eleven visible tool buttons crowd the canvas and make the toolbar harder to scan. Rejected.
- *A modal shape gallery:* heavier than a dropdown and unnecessary for nine options. Rejected.

### D4. Emoji picker inserts a text element

Add a curated catalog in `apps/web/src/lib/emoji.ts` with four localized categories (smileys, gestures/people, nature, objects/symbols) and roughly eight emoji per category. Each entry carries the Unicode character and a dictionary key for its accessible name. There is no network request and no new dependency.

A toolbar button (`tool-emoji`, smile icon) opens a dropdown containing category labels and a grid of emoji buttons. Choosing one calls `createTextElement` with the current slide, a 240×160 box centered on the 1920×1080 slide, the emoji as text, `fontSize: 96`, and centered alignment. The element is selected, the tool returns to `select`, undo capture stops, and a localized toast confirms insertion.

Because the result is a normal text element, it inherits inline editing, font size, color, alignment, rotation, opacity, duplication, clipboard, limits, undo, collaboration, thumbnails, and export with no emoji-specific branches. The picker is rendered only inside the editor toolbar, which is already editor-only.

**Alternatives considered**

- *A new `emoji` element type:* would duplicate text behavior and break the requirement that emoji remain editable text. Rejected.
- *A full emoji library such as `emoji-mart`:* adds a large dependency, a full catalog, search, and skin-tone UI that are out of scope. Rejected.
- *Insert at the caret of the text currently being edited:* useful later, but it needs selection tracking inside the textarea overlay and is not required. Deferred.

### D5. Style-panel and accessibility predicates follow element capabilities

Replace the growing type equality chains in `style-panel.tsx` with small capability helpers: `hasFill`, `hasStroke`, `hasStrokeWidth`, and `hasCornerRadius`. Closed shapes get fill and stroke controls; lines get stroke and stroke-width; rectangles keep corner radius. The panel heading shows the specific shape name (for example, “Pentagon”) by mapping `shape` to a localized key.

`elementTypeKey` in the canvas and the accessible element list do the same mapping, so a screen reader hears “Pentagon” rather than “Shape”. The shape picker's items and emoji buttons use localized `aria-label`s, and the picker trigger reports its active state with `aria-pressed`.

**Alternatives considered**

- *Keep boolean chains and add `|| element.type === "shape"`:* works but becomes unreadable as variants grow. Rejected.
- *Show every control for every shape and ignore irrelevant patches:* exposes no-op controls and confuses users. Rejected.

### D6. Additive schema, no migration

New variants are strict but additive. Existing decks decode exactly as before, and `DECK_SCHEMA_VERSION` stays at `1` because no stored field changes meaning and no backfill is required. New elements use the existing `MAX_ELEMENTS_PER_DECK` and text limits and the existing clipboard envelope version.

An older client that does not know `shape` or `line` would decode those elements as `null` and hide them, but it would not delete the underlying Y.Map. The supported deployment is a single web version that reloads on navigation, so no cross-version client compatibility is promised. Rolling back the web app is therefore safe for stored data: new elements disappear from the old rendering and return after redeploy.

**Alternatives considered**

- *Bump `schemaVersion` and add a migration:* no field semantics change, so a migration would be ceremony without effect. Rejected.
- *Convert new shapes to `rect` on load for old clients:* destructive and loses shape identity. Rejected.

### D7. Localization and test strategy

Add the new English keys and their Greek translations to the existing typed dictionaries: picker labels, shape names, line, emoji picker heading, categories, emoji names, and insertion feedback. The `EnglishDictionary` type makes a missing Greek key a compile error, and the existing dictionary-parity test covers placeholders and empty values.

Tests:

- **Unit (Vitest, `packages/deck`)**: `getShapePoints` returns in-bounds points for every kind, the expected point counts, alternating star radii, and stable output for zero/small dimensions; schemas accept valid shape/line data and reject malformed kinds, missing fields, and extra fields; document and clipboard round-trips preserve `shape` and `line`.
- **Unit (web)**: tool selection, style-capability predicates, and emoji catalog integrity (unique keys, valid characters, every name key exists in both dictionaries).
- **Playwright**: open the shape picker by keyboard and draw a triangle, star, and line; verify tool reset, selection, styling, duplication, copy/paste, second-context visibility, PNG/PDF export, and line-versus-arrow heads. Insert an emoji, edit it as text, copy/paste it, and verify Greek picker labels. Confirm viewers see neither picker. Run axe on the editor with both pickers open.
- **Rendering parity**: assert that a styled shape appears in the offscreen renderer output and in the editor element list with the same geometry-derived bounds. Avoid pixel assertions for emoji because color-emoji fonts differ by platform; assert text content instead.

## Risks / Trade-offs

- **Editor and export renderers drift** → Both call the same pure `getShapePoints` helper; add a renderer parity test for representative shapes.
- **Thin lines are hard to select** → Set `hitStrokeWidth` to a comfortable minimum independent of the visible stroke width.
- **Emoji appearance varies by platform** → Treat emoji as text and assert content, not pixels; document the font-fallback behavior.
- **Toolbar crowding as shapes grow** → The picker is a dropdown, so adding a shape does not add a toolbar button; keeping rectangle/ellipse/arrow direct preserves established flows.
- **Greek terminology is new** → Follow the existing localization glossary and flag shape/emoji terms for native-speaker review with the rest of the Greek copy.
- **Rollback hides new elements** → Stored Yjs data is untouched; document that rollback is non-destructive and redeploying restores the elements.

## Migration Plan

1. Add the shared element variants, geometry helper, and tests; build `@mini-deck/deck`.
2. Add rendering to the interactive canvas and the offscreen renderer.
3. Add the toolbar pickers, tool state, style-panel predicates, shortcuts, and dictionary keys in both locales.
4. Add Playwright coverage and update the document/editor-architecture guides.
5. Deploy the web app and shared package together. No database migration or collaboration-server deploy is needed.

Rollback: redeploy the previous web build. Decks containing new elements keep those elements in Yjs; they are simply not rendered until the new build returns.
