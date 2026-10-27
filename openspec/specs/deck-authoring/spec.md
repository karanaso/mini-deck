# deck-authoring Specification

## Purpose

Lets people create a small slide deck and compose each 16:9 slide with text, shapes, arrows, and images, then present it.

## Requirements

### Requirement: Create a deck

The system SHALL let a visitor create a new deck from the landing page with a single action. A new deck MUST start with one blank 16:9 slide and open directly in the editor under an edit-capable link.

#### Scenario: Create a deck from the landing page

- **WHEN** a visitor activates the "New deck" action
- **THEN** the system creates a deck with one blank slide and opens its editor
- **AND** the deck is titled "Untitled deck"

#### Scenario: Deck survives a fresh visit

- **WHEN** the creator opens the deck's edit link in a new browser session
- **THEN** the editor opens with the same slides and elements that were last saved

### Requirement: Rename a deck

The system SHALL let an editor change the deck title inline and show the updated title to every participant.

#### Scenario: Rename propagates

- **WHEN** an editor changes the deck title to "Quarterly plan"
- **THEN** the new title appears in that editor's header
- **AND** other participants see the new title without reloading

#### Scenario: Empty title is rejected

- **WHEN** an editor clears the title and confirms
- **THEN** the previous title is restored

### Requirement: Manage slides

The system SHALL let editors add, duplicate, and delete slides. A deck MUST always contain at least one slide, and deleting the last remaining slide MUST be prevented.

#### Scenario: Add a slide

- **WHEN** an editor adds a slide
- **THEN** a blank slide is inserted after the current slide and becomes selected
- **AND** every participant sees the new slide

#### Scenario: Duplicate a slide

- **WHEN** an editor duplicates a slide containing elements
- **THEN** a copy of the slide with the same elements is inserted immediately after it

#### Scenario: Delete the last slide

- **WHEN** an editor attempts to delete the only remaining slide
- **THEN** the slide remains and the editor is told that a deck needs at least one slide

### Requirement: Reorder slides

The system SHALL let editors reorder slides in the slide list, and the new order MUST be reflected for all participants, in presentation mode, and in PDF export.

#### Scenario: Drag a slide to a new position

- **WHEN** an editor drags slide 3 above slide 1
- **THEN** the slide list order becomes 3, 1, 2
- **AND** other participants see the same order

### Requirement: Insert and edit text

The system SHALL let editors add a text element and edit its content directly on the slide. Text MUST remain readable when the slide is scaled to fit the viewport.

#### Scenario: Add text

- **WHEN** an editor chooses the text tool and clicks on the slide
- **THEN** a text element is created in edit mode at that position
- **AND** the entered text is visible to all participants as it is typed

#### Scenario: Abandon empty text

- **WHEN** an editor creates a text element, enters nothing, and leaves edit mode
- **THEN** the empty text element is removed

### Requirement: Insert shapes and arrows

The system SHALL let editors add rectangle, ellipse, and arrow elements. Arrows MUST display a visible arrowhead indicating direction.

#### Scenario: Add a rectangle

- **WHEN** an editor drags with the rectangle tool on the slide
- **THEN** a rectangle sized to the drag is created at that position

#### Scenario: Add an arrow

- **WHEN** an editor drags with the arrow tool from point A to point B
- **THEN** an arrow is created pointing from A to B

### Requirement: Insert images

The system SHALL let editors add images by uploading a file or pasting an image from the clipboard. Supported formats MUST include PNG, JPEG, and WebP, and files larger than 10 MB MUST be rejected with a visible error.

#### Scenario: Upload an image

- **WHEN** an editor selects a 2 MB PNG file
- **THEN** the image is uploaded and placed on the current slide
- **AND** all participants see the image

#### Scenario: Reject an oversized image

- **WHEN** an editor selects a 15 MB image file
- **THEN** the upload is refused and an error message explains the 10 MB limit

#### Scenario: Paste an image

- **WHEN** an editor pastes an image from the system clipboard while the canvas is focused
- **THEN** the image is uploaded and inserted at the center of the visible slide area

### Requirement: Select elements

The system SHALL support selecting one element, adding elements to the selection with Shift, selecting multiple elements with a marquee drag, and clearing the selection.

#### Scenario: Multi-select with a marquee

- **WHEN** an editor drags a selection rectangle over three elements on empty canvas
- **THEN** all three elements become selected and show selection handles

#### Scenario: Clear selection

- **WHEN** an editor clicks empty canvas
- **THEN** the current selection is cleared

### Requirement: Transform elements

The system SHALL let editors move, resize, rotate, and delete selected elements, and nudge them with the arrow keys. Transforms MUST preserve the element's aspect ratio when resizing with Shift held.

#### Scenario: Move an element

- **WHEN** an editor drags a selected element to a new position
- **THEN** the element's new position is shown to the editor immediately
- **AND** the position is synchronized to other participants

#### Scenario: Nudge with the keyboard

- **WHEN** an editor presses the right arrow key with one element selected
- **THEN** the element moves one unit to the right, or ten units when Shift is held

#### Scenario: Delete selected elements

- **WHEN** an editor presses Delete or Backspace with elements selected
- **THEN** the selected elements are removed for all participants

### Requirement: Restyle elements

The system SHALL provide appearance controls appropriate to each element type: fill and stroke for shapes, stroke width for arrows, and font size, color, and alignment for text.

#### Scenario: Change a shape fill

- **WHEN** an editor selects a rectangle and chooses a new fill color
- **THEN** the rectangle's fill changes for all participants

#### Scenario: Change text size

- **WHEN** an editor selects a text element and increases its font size
- **THEN** the text reflows within its box at the larger size

### Requirement: Arrange elements

The system SHALL let editors duplicate selected elements and change their stacking order by bringing them forward or sending them backward.

#### Scenario: Duplicate an element

- **WHEN** an editor duplicates a selected element
- **THEN** a copy appears offset from the original and is selected

#### Scenario: Bring an element to the front

- **WHEN** an editor brings a selected element to the front
- **THEN** it renders above the other overlapping elements

### Requirement: Use the clipboard

The system SHALL let editors copy, cut, and paste elements within a slide, across slides, and across decks. Pasting MUST preserve the relative positions of copied elements. The system SHALL also accept plain text and images from the system clipboard.

#### Scenario: Copy and paste within a slide

- **WHEN** an editor copies two selected elements and pastes them on the same slide
- **THEN** both elements are duplicated with the same relative spacing and a small offset

#### Scenario: Copy between decks

- **WHEN** an editor copies an element, opens a different deck, and pastes
- **THEN** the element is added to the current slide of the second deck

#### Scenario: Paste plain text

- **WHEN** an editor pastes non-empty plain text from outside the app
- **THEN** a text element containing that text is created at the center of the visible slide area

#### Scenario: Read-only participant pastes

- **WHEN** a participant with a view-only link attempts to paste
- **THEN** no element is created and the participant remains read-only

### Requirement: Undo and redo

The system SHALL provide undo and redo for the local participant's own edits. Undoing MUST NOT revert edits made by other participants.

#### Scenario: Undo a local edit

- **WHEN** an editor moves a rectangle and then invokes undo
- **THEN** the rectangle returns to its previous position

#### Scenario: Undo does not affect a collaborator

- **WHEN** editor A moves one element, editor B moves another, and editor A invokes undo
- **THEN** only A's move is reverted
- **AND** B's element remains in its new position

### Requirement: Present a deck

The system SHALL provide a presentation mode that displays slides scaled to fit the viewport, hides editor controls and collaboration overlays, and supports keyboard navigation between slides. Any participant with a valid link MUST be able to start presentation mode.

#### Scenario: Start presenting

- **WHEN** a participant starts presentation mode from the current slide
- **THEN** the current slide fills the viewport without selection handles, toolbars, cursors, or presence indicators

#### Scenario: Navigate slides

- **WHEN** the presenter presses the right arrow key or Space
- **THEN** the next slide is shown, and the last slide remains when there is no next slide

#### Scenario: Exit presentation

- **WHEN** the presenter presses Escape
- **THEN** presentation mode closes and the editor returns to the slide that was being presented

### Requirement: Save changes automatically

The system SHALL persist deck content automatically while editing without requiring a Save action. Reopening a deck link MUST restore the latest saved title, slide order, elements, styles, and uploaded images.

#### Scenario: Reopen after editing

- **WHEN** an editor adds text and an image, waits for the changes to settle, and closes the tab
- **THEN** reopening the edit link shows the text and image in their previous positions

#### Scenario: No explicit save needed

- **WHEN** an editor makes a change and never activates a save control
- **THEN** the change is still persisted

### Requirement: Insert geometric shapes

The editor SHALL let an editor add triangle, diamond, parallelogram, trapezoid, pentagon, hexagon, and five-point star elements by dragging a bounding box on the slide. Each shape MUST fill its bounding box, accept fill, stroke, and stroke-width styling, and render identically for every participant and in every exported output.

#### Scenario: Add a triangle

- **WHEN** an editor selects the triangle tool and drags a bounding box on the slide
- **THEN** a triangle sized to the drag is created and selected
- **AND** other participants see the triangle without reloading

#### Scenario: Add a five-point star

- **WHEN** an editor drags with the star tool
- **THEN** a five-point star is created inside the dragged bounding box

#### Scenario: Restyle a polygon

- **WHEN** an editor selects a pentagon and changes its fill, stroke, or stroke width
- **THEN** the pentagon updates for every participant
- **AND** the same styling appears in thumbnails, presentation mode, and PNG/PDF export

#### Scenario: Reuse a shape through editing operations

- **WHEN** an editor rotates, duplicates, copies, pastes, or reorders a diamond
- **THEN** the resulting element keeps its diamond shape kind and styling
- **AND** undo restores the previous state

### Requirement: Insert straight lines

The editor SHALL let an editor add a straight line element without an arrowhead by dragging from a start point to an end point. A line MUST support stroke color and stroke width, keep its direction when moved or resized, and remain a distinct element type from an arrow.

#### Scenario: Add a line

- **WHEN** an editor drags from point A to point B with the line tool
- **THEN** a straight line is created from A to B with no arrowhead

#### Scenario: Style a line

- **WHEN** an editor changes a line's stroke color or stroke width
- **THEN** the line updates for every participant and in exported output

#### Scenario: Distinguish a line from an arrow

- **WHEN** a slide contains both a line and an arrow
- **THEN** only the arrow displays an arrowhead

### Requirement: Choose new shapes from the toolbar

The editor toolbar SHALL present rectangle, ellipse, and arrow directly and SHALL provide a shape picker containing triangle, diamond, parallelogram, trapezoid, pentagon, hexagon, star, and line. Every option MUST have a localized accessible name, show which tool is active, and return the editor to the select tool after a shape is drawn.

#### Scenario: Choose a shape with the keyboard

- **WHEN** a keyboard user opens the shape picker and chooses the hexagon option
- **THEN** the hexagon tool becomes active and is announced as the current tool

#### Scenario: Drawing returns to selection

- **WHEN** an editor draws any shape from the picker
- **THEN** the new element is selected and the tool returns to select

#### Scenario: Viewers cannot draw

- **WHEN** a participant opens a view-only link
- **THEN** the shape picker and drawing tools are not available

### Requirement: Insert emoji from a picker

The editor SHALL provide an emoji picker with a curated set of emoji grouped into localized categories. Choosing an emoji MUST create a new text element containing that emoji at the center of the visible slide, select it, and leave it editable; emoji MUST be stored as ordinary Unicode text.

#### Scenario: Insert an emoji

- **WHEN** an editor chooses a smiling emoji from the picker
- **THEN** a selected text element containing that emoji is added at the center of the current slide
- **AND** other participants see the emoji without reloading

#### Scenario: Edit the inserted emoji text

- **WHEN** an editor double-clicks the emoji text and appends characters or changes its font size
- **THEN** the text element updates as ordinary editable text and persists after reload

#### Scenario: Reuse the emoji as content

- **WHEN** an editor copies, pastes, or exports a slide containing an emoji text element
- **THEN** the emoji is preserved as text in the pasted element and in PNG/PDF output

#### Scenario: Greek emoji picker

- **WHEN** the interface is Greek
- **THEN** the picker heading, category names, and emoji accessible names are Greek
- **AND** the emoji characters themselves remain unchanged

#### Scenario: Viewers cannot insert emoji

- **WHEN** a participant opens a view-only link
- **THEN** the emoji picker is not available
- **AND** no emoji element can be inserted

### Requirement: Keep existing decks compatible

The shape and emoji additions MUST be additive. Decks containing only text, rectangle, ellipse, arrow, and image elements MUST continue to open, render, export, and collaborate without migration, and the existing rectangle, ellipse, and arrow tools MUST keep their current behavior.

#### Scenario: Open a deck created before this change

- **WHEN** an editor opens a deck that contains only the original element types
- **THEN** every element renders and edits exactly as before
- **AND** no migration or schema-version change is required

#### Scenario: Existing tools unchanged

- **WHEN** an editor uses the rectangle, ellipse, or arrow tool
- **THEN** creation, styling, and keyboard shortcuts behave as they did before this change
