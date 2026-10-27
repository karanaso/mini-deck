# Proposal

## Why

The editor can draw only rectangles, ellipses, and arrows, so common diagram shapes such as triangles, diamonds, and stars must be faked with images or built from several elements. Adding an emoji is also awkward: there is no in-app picker, and desktop users must rely on an operating-system emoji keyboard.

## What Changes

- Add a broader shape library: triangle, diamond, parallelogram, trapezoid, pentagon, hexagon, five-point star, and a straight line without an arrowhead.
- Keep rectangle, ellipse, and arrow as direct toolbar tools, and add a keyboard-reachable shape picker for the new shapes and line.
- Let editors drag to create each new shape, then move, resize, rotate, duplicate, arrange, undo, copy/paste, and collaborate on it like any existing element.
- Give closed shapes fill, stroke, and stroke-width controls; give lines stroke and stroke-width controls.
- Render new shapes consistently in the editor, slide thumbnails, presentation mode, PNG export, and PDF export.
- Add a curated, categorized emoji picker. Choosing an emoji creates a new editable text element at the center of the visible slide, using the existing text element, styling, collaboration, clipboard, and export paths.
- Add English and Greek interface strings for the shape picker, shape names, emoji picker, emoji categories, emoji accessible names, and insertion feedback.
- Explicitly out of scope: editable line/arrow endpoints and connectors, custom polygon point editing, text labels attached to shapes, SVG shape uploads, a full Unicode emoji catalog, emoji search, skin-tone variants, recently used emoji, and inserting an emoji into existing text at the caret.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `deck-authoring`: adds the broader shape library, the line element, shape-picker behavior, and emoji insertion. This capability is currently defined by the unarchived `add-collaborative-decks` delta; this change adds requirements to the same `deck-authoring` path so the two deltas merge into one capability when archived.

## Impact

- **Shared model**: `packages/deck` element types, schemas, document decoding, element creation, limits, clipboard compatibility, and a pure shape-geometry helper with unit tests.
- **Editor UI**: toolbar shape picker, a new emoji picker, canvas draft previews and creation, element rendering, style panel conditions, editor tool state, and keyboard shortcuts.
- **Rendering**: the shared offscreen renderer used by thumbnails, presentation, PNG, and PDF must draw every new shape; no API, database, or collaboration-server changes are needed.
- **Localization**: new keys in the English source dictionary and matching Greek translations; the typed dictionary must keep both locales complete.
- **Tests and docs**: unit tests for shape geometry and schema round-trips, Playwright coverage for shape creation, styling, clipboard, export, collaboration, and emoji insertion, plus updates to the document and editor-architecture guides.
- **Compatibility**: additive element variants only. Existing decks and existing element types are unchanged, and no document migration or schema-version bump is required.
