# Presentation and export

Presentation mode and exports use the same 1920×1080 slide data and the same element rendering rules as the editor. Collaboration overlays and editor chrome are never included.

## PNG

The current slide is rendered offscreen at 1920×1080 (pixel ratio 1) and downloaded as:

```text
{slugified-deck-title}-slide-{number}.png
```

Elements outside the slide bounds are clipped. The slide background is included.

## PDF

All slides are rendered sequentially in `slideOrder`. Each becomes a 16:9 page (960×540 points) in a single PDF using `pdf-lib`, with a 1920×1080 PNG embedded per page at 2× resolution. Sequential rendering bounds memory use.

The filename is `{slugified-deck-title}.pdf`. Progress is reported as `completed/total` while the file is generated. If any image fails to load, rendering throws before a download starts; the UI reports the error and the participant can retry. No partial file is produced.

PDF text is rasterized, so it is not selectable. This is an intentional v1 trade-off for exact visual fidelity.

## Presentation

Presentation is a full-screen overlay with fitted slides, a slide counter, previous/next controls, and keyboard navigation:

- Right arrow / Space / PageDown: next slide
- Left arrow / PageUp: previous slide
- Escape: exit and return to the slide being presented

When presentation opens, toasts are dismissed. Toolbars, presence, cursors, and selections are not mounted. Fullscreen is requested when the browser allows it; otherwise the overlay fills the viewport.

## Permissions

Any valid edit or view link can present and export. Exports use the local Y.Doc, including edits that have not yet reached other participants. A viewer cannot edit or share, but can take the content with them.

## Tests

Playwright downloads and inspects PNG dimensions, parses PDF page count and order, checks styled/rotated content, verifies viewer exports and presentation overlay absence, and simulates a missing image to confirm that no partial file downloads.
