# stock-image-search Specification

## Purpose

Lets editors find stock photographs from external providers without leaving the deck editor and insert a chosen photo as a normal, durable deck image.

## Requirements

### Requirement: Offer only configured image providers

The system SHALL make a stock image provider available only when the server has a valid API key for it. Provider API keys MUST remain on the server, and the browser MUST NOT receive them. When no provider is configured, the stock image search action MUST be unavailable and the editor MUST remain fully usable.

#### Scenario: One provider configured

- **WHEN** the server has an Unsplash key but no Pexels key
- **THEN** the image menu offers stock image search
- **AND** the search dialog offers only Unsplash as a provider

#### Scenario: No providers configured

- **WHEN** the server has no provider keys
- **THEN** the image menu offers upload but not stock image search
- **AND** upload, paste, editing, and presentation continue to work

#### Scenario: Keys are not exposed

- **WHEN** a browser loads the editor and performs a search
- **THEN** no provider API key appears in the page source, client bundle, or client request parameters

### Requirement: Search stock photos from the editor

An editor SHALL be able to open stock image search from the image action, enter a text query, choose among the available providers, filter by orientation, and page through results. Results MUST show a preview, the photographer, and the provider, and the dialog MUST distinguish loading, empty, error, and end-of-results states.

#### Scenario: Search for a photo

- **WHEN** an editor enters "mountain" and runs the search with Unsplash selected
- **THEN** matching landscape-oriented photos appear as a grid of previews
- **AND** each result shows the photographer's name and the Unsplash credit

#### Scenario: No matching photos

- **WHEN** a search returns no results
- **THEN** the dialog shows an empty state with the query and a way to change it
- **AND** no error is reported

#### Scenario: Load more results

- **WHEN** an editor activates "Load more" on a result page that has more photos
- **THEN** the next page is appended to the existing results
- **AND** already displayed results remain visible

#### Scenario: Switch provider

- **WHEN** an editor switches from Unsplash to Pexels
- **THEN** the current query runs against Pexels and the results are replaced

#### Scenario: Viewers cannot search

- **WHEN** a participant opens a view-only link
- **THEN** stock image search is not offered

### Requirement: Attribute stock photos

Search results SHALL credit the photographer and link to the photo's provider page. An imported photo SHALL retain its provider, photographer name, and source link with the image in the deck so the editor can display the credit later.

#### Scenario: Credit before import

- **WHEN** a result is displayed
- **THEN** the photographer's name links to their provider profile or photo page

#### Scenario: Credit after import

- **WHEN** an editor selects a stock photo and later selects the inserted image
- **THEN** the editor shows the photographer and provider attribution for that image
- **AND** the attribution survives reload and collaboration sync

### Requirement: Import a chosen photo as a deck image

When an editor chooses a search result, the system SHALL re-fetch that photo from the provider by its provider identifier, validate and process it through the deck's image pipeline, store it as a deck asset, and insert it as a normal image element on the current slide with its aspect ratio preserved. The inserted image MUST be visible to every participant and included in PNG and PDF exports. The deck MUST NOT depend on the provider's remote URL to render or export the image.

#### Scenario: Insert a stock photo

- **WHEN** an editor chooses a search result
- **THEN** the image is stored as a deck asset and appears on the current slide
- **AND** the inserted image is selected and sized to fit within the slide while preserving its aspect ratio
- **AND** other participants see the image without reloading

#### Scenario: Export a stock photo

- **WHEN** a slide containing an imported stock photo is exported as PNG or PDF
- **THEN** the exported output contains the same image content as the editor

#### Scenario: Provider image disappears

- **WHEN** a provider later removes a photo that was already imported
- **THEN** the deck still renders and exports the stored copy

#### Scenario: Duplicate or copy the image

- **WHEN** an editor duplicates, copies, or pastes an imported stock image
- **THEN** the resulting image keeps the same asset and attribution

### Requirement: Constrain and protect image requests

The system SHALL accept import requests only by provider and provider photo identifier, never by a client-supplied image URL. The server MUST fetch photos only from the selected provider's API and approved image hosts over HTTPS, MUST enforce the deck's image size and format limits, and MUST apply rate limits to search and import requests.

#### Scenario: Arbitrary URL rejected

- **WHEN** a client submits an import request containing an arbitrary image URL instead of a provider photo identifier
- **THEN** the request is rejected without fetching that URL

#### Scenario: Oversized provider image

- **WHEN** a provider photo exceeds the deck's image size limit
- **THEN** the import fails with an error explaining the limit
- **AND** no asset or element is created

#### Scenario: Search rate limit

- **WHEN** one client exceeds the configured search rate limit
- **THEN** further searches are refused with a rate-limit error until the window resets

#### Scenario: Provider unavailable

- **WHEN** a provider API times out or returns an error
- **THEN** the dialog shows an error and keeps the query so the editor can retry
- **AND** the editor and deck content remain usable

### Requirement: Preserve existing image workflows

Adding stock image search MUST NOT change the behavior of uploading an image file or pasting an image from the clipboard. Existing decks with uploaded images MUST continue to open, render, collaborate, and export without migration.

#### Scenario: Upload still works

- **WHEN** an editor chooses "Upload image" from the image menu
- **THEN** the existing file picker, validation, upload, and insertion behavior is unchanged

#### Scenario: Existing deck opens

- **WHEN** a deck created before this change is opened
- **THEN** its images render and export exactly as before
- **AND** no migration is required
