# Spec Delta

## MODIFIED Requirements

### Requirement: Manage slides

The system SHALL let editors add, duplicate, and delete slides. A deck MUST always contain at least one slide, and deleting the last remaining slide MUST be prevented. Deleting a slide owned by another participant, or containing elements owned by another participant, MUST be blocked with an ownership prompt.

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

#### Scenario: Delete another participant's slide

- **WHEN** an editor attempts to delete a slide owned by another participant
- **THEN** the slide remains
- **AND** the editor is shown a prompt naming the owner

#### Scenario: Delete a slide containing another participant's work

- **WHEN** an editor owns a slide but another participant has added an element to it
- **AND** the editor attempts to delete the slide
- **THEN** the slide remains with all its elements
- **AND** the editor is shown a prompt naming the element's owner

### Requirement: Transform elements

The system SHALL let editors move, resize, rotate, and delete selected elements, and nudge them with the arrow keys. Transforms MUST preserve the element's aspect ratio when resizing with Shift held. Deleting an element owned by another participant MUST be blocked with an ownership prompt.

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

#### Scenario: Delete another participant's element

- **WHEN** an editor presses Delete or Backspace with an element owned by another participant selected
- **THEN** the element remains for all participants
- **AND** the editor is shown a prompt naming the owner

### Requirement: Use the clipboard

The system SHALL let editors copy, cut, and paste elements within a slide, across slides, and across decks. Pasting MUST preserve the relative positions of copied elements. The system SHALL also accept plain text and images from the system clipboard. Cutting an element owned by another participant MUST be blocked with an ownership prompt.

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

#### Scenario: Cut another participant's element

- **WHEN** an editor cuts an element owned by another participant
- **THEN** the element remains in the deck
- **AND** the editor is shown a prompt naming the owner
