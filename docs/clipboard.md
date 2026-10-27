# Clipboard

Copying elements writes a versioned envelope:

```json
{
  "format": "mini-deck/clipboard",
  "version": 1,
  "elements": []
}
```

The envelope is validated with a strict zod schema. Unknown fields, more than 200 elements, more than 1 MB of JSON, invalid element data, or malformed JSON are ignored.

## Formats and precedence

Copying writes:

1. `text/plain` — a short human-readable summary.
2. `text/html` — an empty `<div data-mini-deck-clipboard="{base64url envelope}">` marker.
3. `application/x-mini-deck+json` — the raw envelope when the browser permits it.

Pasting checks in this order:

1. Same-tab memory (60-second fallback).
2. Custom MIME envelope.
3. HTML marker.
4. An image file.
5. Non-empty plain text.

The in-memory copy makes copy/paste reliable within one tab. The HTML marker lets elements survive a navigation to another deck; the text summary keeps external pastes readable.

## Paste behavior

- Elements receive new IDs on every paste.
- Relative positions are preserved and the group is offset by 24 logical pixels.
- Pasting text creates a text element near the center of the current slide.
- Pasting an image uploads it through the same asset endpoint as the toolbar and inserts it centered.
- Read-only participants can see the clipboard event but cannot create elements; they get a read-only notice.

## Security

- All element input is untrusted and validated before insertion.
- Text is rendered as plain text; no HTML from the clipboard is executed.
- Custom MIME and HTML markers are only parsed as Mini Deck data.
- Paste handlers are skipped while focus is in an input, textarea, or contenteditable element.

## Limits

| Limit | Value |
| --- | --- |
| Elements per paste | 200 |
| Envelope size | 1 MB |
| Text element content | 10,000 characters |
| Image upload | 10 MB, PNG/JPEG/WebP |

Tests live in `packages/deck/test/clipboard.test.ts` and the Playwright clipboard suite.
