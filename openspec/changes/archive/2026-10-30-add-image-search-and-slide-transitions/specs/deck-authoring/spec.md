# Spec Delta

## ADDED Requirements

### Requirement: Choose a slide transition

The editor SHALL let an editor assign a transition to the current slide by choosing exactly one of None, Fade, Push, or Zoom. The default for every new or unassigned slide MUST be None. The chosen transition MUST be stored with the slide, apply to every participant, and remain after reload. View-only participants MUST see the transition but MUST NOT be able to change it.

#### Scenario: Assign a transition

- **WHEN** an editor selects Push for the current slide
- **THEN** the editor's transition control shows Push as selected
- **AND** the slide's transition is synchronized to other participants

#### Scenario: New slide defaults

- **WHEN** an editor adds a slide
- **THEN** the slide's transition is None

#### Scenario: Viewer sees but cannot edit

- **WHEN** a participant opens a view-only link
- **THEN** presentation uses the slide's stored transition
- **AND** no transition control is available

#### Scenario: Transition persists

- **WHEN** an editor sets Fade, waits for changes to settle, and reopens the deck
- **THEN** the slide still uses Fade
- **AND** the transition control shows Fade

### Requirement: Animate slide transitions in presentation

Presentation mode SHALL animate between slides using the incoming slide's transition. Fade MUST cross-fade, Push MUST move the outgoing and incoming slides horizontally with the direction matching forward or backward navigation, and Zoom MUST scale and fade the incoming slide. None MUST switch instantly. The animation MUST NOT change slide content, element positions, or the final displayed slide.

#### Scenario: Forward push

- **WHEN** the current slide uses Push and the presenter moves to the next slide
- **THEN** the outgoing slide moves out to the left while the incoming slide enters from the right

#### Scenario: Backward push

- **WHEN** the current slide uses Push and the presenter moves to the previous slide
- **THEN** the outgoing slide moves out to the right while the incoming slide enters from the left

#### Scenario: Fade

- **WHEN** the current slide uses Fade and the presenter advances
- **THEN** the incoming slide fades in over the outgoing slide

#### Scenario: None

- **WHEN** the current slide uses None and the presenter advances
- **THEN** the next slide replaces the previous slide without animation

#### Scenario: Rapid navigation

- **WHEN** the presenter advances several slides faster than the animation duration
- **THEN** presentation settles on the last requested slide
- **AND** no stale slide remains visible

#### Scenario: Reduced motion

- **WHEN** the presenter's system requests reduced motion
- **THEN** every transition changes slides instantly without movement, scaling, or fading

### Requirement: Keep transitions out of static outputs

Slide transitions MUST affect presentation playback only. The editor canvas, slide thumbnails, slide previews, PNG export, and PDF export MUST render the same static slide content regardless of the assigned transition.

#### Scenario: Transition does not alter the editor

- **WHEN** an editor assigns Zoom to a slide
- **THEN** the editor canvas and slide thumbnails do not animate or change appearance

#### Scenario: Export ignores transition

- **WHEN** a deck with Fade, Push, and Zoom slides is exported as PDF
- **THEN** each page contains only its static slide content
- **AND** no animation state appears in the output

### Requirement: Preserve existing decks and slide copies

Transitions MUST be additive. A slide without a stored transition MUST read and present as None, and decks created before this change MUST open, collaborate, and export without migration or a schema-version change. Duplicating a slide MUST copy its transition to the duplicate.

#### Scenario: Open a deck created before transitions

- **WHEN** an editor opens a deck whose slides have no transition value
- **THEN** every slide presents without animation
- **AND** no migration or error is shown

#### Scenario: Duplicate a slide with a transition

- **WHEN** an editor duplicates a slide that uses Push
- **THEN** the duplicate also uses Push

#### Scenario: Older client writes the deck

- **WHEN** a client that does not understand transitions edits another part of the deck
- **THEN** existing transitions remain stored for clients that understand them
