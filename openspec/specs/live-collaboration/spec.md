# live-collaboration Specification

## Purpose

Enables multiple people to work on the same deck at once and see each other's activity without reloading the page.

## Requirements

### Requirement: Join a live session

Opening a valid deck link SHALL join that deck's live collaboration session. A participant who joins later MUST receive the current deck content, including the latest slide order and elements.

#### Scenario: Late participant receives current state

- **WHEN** a participant opens a deck link after others have added slides and elements
- **THEN** the participant sees the current deck without waiting for a page reload

#### Scenario: Two participants edit the same deck

- **WHEN** two participants have the same deck open in separate browsers
- **THEN** both are shown as connected to the same session

### Requirement: Synchronize edits in real time

Edits made by one participant SHALL appear for other participants without a page refresh. Concurrent edits to different elements MUST both be preserved, and all participants MUST converge on the same deck content.

#### Scenario: Add an element for everyone

- **WHEN** one participant adds a rectangle
- **THEN** the rectangle appears on the other participants' canvases shortly after it is created

#### Scenario: Concurrent edits do not overwrite each other

- **WHEN** participant A moves one element while participant B moves a different element
- **THEN** both moves are preserved for both participants

#### Scenario: Concurrent text input converges

- **WHEN** two participants type into the same text element at the same time
- **THEN** both sets of inserted characters are retained
- **AND** both participants eventually display identical text

### Requirement: Show participant presence

The system SHALL show the participants currently connected to the deck, each with a distinct display name and color. New participants MUST receive a generated name, and a participant MUST be able to change their own display name for the session.

#### Scenario: Participant joins

- **WHEN** a new participant opens the deck link
- **THEN** the other participants see the new name and color in the presence list

#### Scenario: Participant leaves

- **WHEN** a participant closes the deck tab
- **THEN** their entry is removed from the presence list after the disconnect is detected

#### Scenario: Rename myself

- **WHEN** a participant changes their display name to "Sam"
- **THEN** other participants see "Sam" next to that participant's cursor and selections

### Requirement: Show live cursors

The system SHALL show each participant's pointer position on the slide that participant is viewing, labeled with that participant's name and color. Cursors MUST be absent from presentation mode and exported files.

#### Scenario: See a collaborator's cursor

- **WHEN** two participants view the same slide and one moves their pointer over the canvas
- **THEN** the other participant sees a labeled cursor at that position

#### Scenario: Cursor hidden on another slide

- **WHEN** a participant moves to a different slide
- **THEN** their cursor is no longer shown on the previous slide

#### Scenario: Cursor disappears on disconnect

- **WHEN** a participant disconnects
- **THEN** their cursor is removed from the canvas

### Requirement: Show remote selections

The system SHALL outline elements selected by other participants with that participant's color and name. Remote selection outlines MUST NOT appear in presentation mode or exports.

#### Scenario: See a remote selection

- **WHEN** participant B selects two elements
- **THEN** participant A sees both elements outlined in B's color with B's name

#### Scenario: Remote selection changes

- **WHEN** participant B clears their selection
- **THEN** the outline disappears for participant A

### Requirement: Enforce read-only viewers

Participants who join with a view link SHALL receive live updates but MUST NOT modify deck content. Editing and upload controls MUST be unavailable to them, and the collaboration server MUST reject write attempts even if the client is altered.

#### Scenario: Viewer sees updates

- **WHEN** an editor adds a slide while a viewer has the deck open
- **THEN** the viewer sees the new slide

#### Scenario: Viewer cannot edit

- **WHEN** a viewer selects an element and presses Delete
- **THEN** the element remains
- **AND** the viewer is shown that the deck is read-only

#### Scenario: Forged write from a viewer is rejected

- **WHEN** a viewer sends an edit through a modified client
- **THEN** the server rejects the change and the deck content remains unchanged

### Requirement: Report connection state and recover

The system SHALL indicate whether the participant is connected, reconnecting, or offline. After a temporary connection loss, the client MUST resynchronize without reloading the page, preserving local edits made while disconnected.

#### Scenario: Connection lost

- **WHEN** the network connection drops
- **THEN** the participant sees a reconnecting indicator
- **AND** editing remains available locally

#### Scenario: Reconnect merges changes

- **WHEN** the connection returns after a participant made changes while offline
- **THEN** the local changes synchronize with edits made by others
- **AND** no duplicate elements are created

### Requirement: Keep participants in sync on slide changes

Slide creation, deletion, and reordering SHALL be shared so participants work against the same slide list. Each participant's current slide is local. Deleting a slide that another participant is viewing MUST move that participant to an adjacent slide.

#### Scenario: Slide deleted under a participant

- **WHEN** participant A deletes the slide participant B is viewing
- **THEN** participant B is moved to the nearest remaining slide
- **AND** B sees the updated slide list
