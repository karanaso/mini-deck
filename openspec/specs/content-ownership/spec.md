# content-ownership Specification

## Purpose

Records which participant created each slide and element and prevents editors from deleting content that belongs to someone else.

## Requirements

### Requirement: Record the author of created content

Every slide and every element created by an editor SHALL record the creator's stable owner identity and display name at creation time. The recorded owner MUST be stored with the deck content and MUST reach collaborators through normal document synchronization.

#### Scenario: Author is recorded for a new element

- **WHEN** an editor adds a rectangle to a slide
- **THEN** the rectangle records that editor as its owner
- **AND** every other participant receives the same ownership metadata

#### Scenario: Author is recorded for a new slide

- **WHEN** an editor adds a slide
- **THEN** the slide records that editor as its owner

### Requirement: Recognize the current participant's own work

The editor SHALL treat content as the current participant's own when its recorded owner identity matches the identity held by the current browser. Ownership MUST remain recognizable after reopening the deck or reloading the page without clearing site storage.

#### Scenario: Reopen and delete own element

- **WHEN** an editor creates a shape, reopens the same deck later in the same browser, selects the shape, and deletes it
- **THEN** the deletion succeeds without an ownership prompt

#### Scenario: Same browser can delete multiple own objects

- **WHEN** an editor selects several objects they created and presses Delete
- **THEN** all selected objects are removed

### Requirement: Block deletion of another participant's work

An editor MUST NOT delete a slide or element owned by another participant. The system SHALL block the deletion and show a prompt that identifies the owner by name.

#### Scenario: Delete another participant's element

- **WHEN** editor A selects an element created by editor B and presses Delete
- **THEN** the element remains in the deck
- **AND** a prompt states that the object belongs to editor B
- **AND** editor B sees no change

#### Scenario: Delete another participant's slide

- **WHEN** editor A tries to delete a slide created by editor B
- **THEN** the slide remains in the deck
- **AND** the prompt identifies editor B as its owner

#### Scenario: Style panel delete is blocked

- **WHEN** editor A selects an element owned by editor B and activates the delete control in the style panel
- **THEN** the element remains
- **AND** the ownership prompt names editor B

#### Scenario: Cut is blocked

- **WHEN** editor A selects an element owned by editor B and invokes cut
- **THEN** the element remains in the deck
- **AND** the ownership prompt names editor B
- **AND** the clipboard does not remove the element from the deck

### Requirement: Block mixed-ownership deletion as a whole

When a deletion selection contains both the current participant's content and content owned by others, the system MUST block the entire operation and MUST NOT partially delete the selected objects.

#### Scenario: Mixed selection is not partially deleted

- **WHEN** an editor selects one of their own elements and one element owned by another participant, then presses Delete
- **THEN** neither element is removed
- **AND** the prompt identifies the other owner

#### Scenario: Multiple owners are named

- **WHEN** the selection contains objects owned by two other participants
- **THEN** the prompt names both owners
- **AND** no selected object is removed

### Requirement: Protect content inside a deleted slide

Deleting a slide MUST be blocked when the slide contains any element owned by another participant, even if the slide itself belongs to the current participant.

#### Scenario: Own slide containing another participant's element

- **WHEN** editor A owns a slide but editor B added an element to it
- **AND** editor A attempts to delete the slide
- **THEN** the slide and editor B's element remain
- **AND** the prompt identifies editor B

#### Scenario: Slide with only own content is deletable

- **WHEN** an editor owns a slide and every element on it
- **THEN** deleting the slide succeeds

### Requirement: Duplication and paste create new ownership

Duplicating, copying and pasting, or otherwise creating a new object from existing content MUST assign ownership of the new object to the participant who performed the action. The source object's ownership MUST remain unchanged.

#### Scenario: Duplicate another participant's element

- **WHEN** editor A duplicates an element owned by editor B
- **THEN** the copy belongs to editor A
- **AND** the original still belongs to editor B

#### Scenario: Paste another participant's copied element

- **WHEN** editor A pastes an element copied from editor B's content
- **THEN** the pasted element belongs to editor A

#### Scenario: Duplicate a slide

- **WHEN** editor A duplicates a slide created by editor B
- **THEN** the duplicate slide and its copied elements belong to editor A
- **AND** editor A can delete the duplicate

### Requirement: Keep unowned content deletable

Slides and elements without ownership metadata, including content created before this change, SHALL remain deletable by any editor under the existing rules.

#### Scenario: Delete legacy element

- **WHEN** an editor opens a deck created before ownership metadata existed and deletes an element that has no recorded owner
- **THEN** the element is deleted without an ownership prompt

#### Scenario: Edit unowned content

- **WHEN** a deck contains unowned slides and elements
- **THEN** editors can add, edit, duplicate, and delete them as before

### Requirement: Keep the collaboration model unchanged

Ownership checks MUST NOT change viewer capabilities, collaboration access, or deck persistence. Viewers MUST remain unable to edit or delete any content, and ownership metadata MUST NOT require a database migration or schema-version change.

#### Scenario: Viewer cannot delete owned content

- **WHEN** a participant with a view-only link selects any element and presses Delete
- **THEN** no deletion occurs
- **AND** the existing read-only message is shown

#### Scenario: Existing deck opens unchanged

- **WHEN** an editor opens a deck created before this change
- **THEN** the deck opens, renders, collaborates, and exports without migration
- **AND** existing content has no ownership prompt until it is recreated or duplicated
