# Performance baseline

Fixture: 30 slides, 510 elements, no images, local PGlite + local filesystem storage. Production build on the development machine. Timings are single-run observations from the Playwright performance test.

| Operation | Observed | Budget |
| --- | --- | --- |
| Initial deck load (canvas + Live + slide rail) | 1705 ms | < 15,000 ms |
| All 30 thumbnails available (from navigation) | 1765 ms | < 30,000 ms |
| Switch to slide 16 | 143 ms | < 3,000 ms |
| Export 30-slide PDF | 8431 ms | < 60,000 ms |

The initial load includes syncing the 510-element Yjs snapshot, mounting the canvas, and rendering the slide rail. PDF export renders each slide sequentially at 1920×1080 before embedding it in the PDF.
