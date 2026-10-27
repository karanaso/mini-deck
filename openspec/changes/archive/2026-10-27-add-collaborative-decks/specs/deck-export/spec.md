# Spec Delta

## Purpose

Lets people take a deck out of the app as slide images or a printable PDF that matches what they see in the editor.

## ADDED Requirements

### Requirement: Export a slide as PNG

The system SHALL let a participant download the current slide as a PNG image at 1920x1080 pixels. The export MUST include the slide background, shapes, arrows, text, and images, and MUST exclude selection handles, remote cursors, presence indicators, and editor controls.

#### Scenario: Export the current slide

- **WHEN** a participant chooses "Export PNG" on a slide containing text and an image
- **THEN** a PNG file downloads containing the slide content
- **AND** no editor chrome appears in the image

#### Scenario: Off-slide content is clipped

- **WHEN** an element extends beyond the slide boundary and the slide is exported
- **THEN** the exported image shows only the portion inside the slide

#### Scenario: Filename identifies the slide

- **WHEN** a deck titled "Launch plan" exports slide 2
- **THEN** the downloaded file name includes the deck title and slide number

### Requirement: Export the deck as a PDF

The system SHALL let a participant download the entire deck as a single PDF with one 16:9 page per slide, in the deck's current slide order. The PDF MUST include all rendered slide content and exclude collaboration and editor overlays.

#### Scenario: Export all slides

- **WHEN** a participant exports a four-slide deck as PDF
- **THEN** the downloaded PDF has four 16:9 pages in the same order as the slide list

#### Scenario: PDF respects reordered slides

- **WHEN** an editor reorders slides and then exports the PDF
- **THEN** the PDF pages follow the new order

#### Scenario: Viewer can export

- **WHEN** a participant with a view link exports the deck
- **THEN** the PDF downloads with the current content

### Requirement: Preserve visual fidelity

Exported slides MUST match the editor's rendering for element position, size, rotation, stacking order, colors, stroke widths, text layout, and image placement. Text MUST remain legible and fully contained as displayed.

#### Scenario: Styled elements render correctly

- **WHEN** a slide containing a rotated rectangle, a colored arrow, and centered text is exported
- **THEN** the export shows the same rotation, colors, and alignment as the editor

#### Scenario: Images are included

- **WHEN** a slide contains an uploaded image
- **THEN** the image appears in both PNG and PDF exports at its displayed position and size

### Requirement: Handle export progress and failure

The system SHALL show progress while generating a multi-slide export and MUST report a clear error if generation fails. A failed export MUST NOT download a partial or corrupt file.

#### Scenario: Progress is shown

- **WHEN** a participant starts a PDF export of a multi-slide deck
- **THEN** the interface shows that the export is in progress until the file is ready

#### Scenario: Export failure

- **WHEN** an image cannot be loaded during export
- **THEN** the export stops, no file is downloaded, and an error message identifies the problem
- **AND** the participant can retry

### Requirement: Export the latest content

An export SHALL reflect the latest deck content known to the participant at the time the export starts, including local edits that have not yet reached other participants.

#### Scenario: Export immediately after an edit

- **WHEN** an editor changes a title text and immediately exports a PNG on the same slide
- **THEN** the PNG contains the changed text
