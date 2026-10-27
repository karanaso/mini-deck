# Spec Delta

## ADDED Requirements

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
