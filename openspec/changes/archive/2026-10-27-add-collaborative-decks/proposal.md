# Proposal

## Why

People often need a small, visual deck to explain an idea, but PowerPoint and Google Slides are heavy for a handful of slides, while whiteboards produce unstructured canvases that are awkward to present. Teams also waste time on sharing setup. A link-first mini-deck tool should let anyone create a deck in one click, send a link, and build the slides together in real time without accounts or file attachments.

## What Changes

- Add a web app whose landing page has a **New deck** action and lists decks recently opened on this device.
- Add a 16:9 slide editor where users can add, select, move, resize, rotate, restyle, reorder, duplicate, and delete slides and elements.
- Support text, rectangle, ellipse, arrow, and image elements, including pasting text and images from the system clipboard and copying/pasting elements within or between decks.
- Add real-time collaboration on the same deck: shared document state, live cursors, presence, remote selections, and automatic reconnect.
- Add link-only sharing. An edit link grants editing and a separate view link grants read-only access; no accounts or invites are required. Links are bearer capabilities.
- Add presentation mode and PNG/PDF export of the deck.
- Persist deck metadata and collaborative document state in PostgreSQL, and uploaded images in S3-compatible object storage.
- Explicitly out of scope for this change: user accounts, comments, version history, templates, animations/transitions, audio/video, mobile editing, `.pptx` import or export, and granular per-user permissions.

## Capabilities

### New Capabilities

- `deck-authoring`: Creating decks and slides; adding, transforming, styling, and arranging elements; clipboard behavior; undo/redo; presentation mode.
- `live-collaboration`: Concurrent editing, presence, live cursors, remote selections, connection recovery, and read-only participation.
- `link-sharing`: Capability-link roles, token validation, share-link management, and the device-local recent-decks list.
- `deck-export`: Rendering slides to PNG and assembling all slides into a PDF.

### Modified Capabilities

None. This is a greenfield project with no existing specs.

## Impact

- **New application**: a pnpm workspace with a Next.js web app, a Hocuspocus collaboration server, and shared packages for the deck document schema.
- **New infrastructure**: PostgreSQL for deck metadata and Yjs snapshots; S3-compatible object storage (MinIO locally) for images; a WebSocket endpoint for collaboration.
- **APIs**: deck creation and metadata, authenticated-by-capability-token asset upload, and WebSocket room authentication for edit/view roles.
- **Dependencies**: React 19, Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Konva/react-konva, Yjs, Hocuspocus, Drizzle ORM, pdf-lib, Vitest, and Playwright.
- **Security considerations**: no account system means possession of a link is authorization. Tokens must be unguessable and validated server-side, and view links must be enforced as read-only by the collaboration server, not only by the UI.
