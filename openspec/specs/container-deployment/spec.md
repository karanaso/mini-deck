# container-deployment Specification

## Purpose

Packages Mini Deck as a single self-contained container that serves the web application and collaboration service through one HTTP endpoint and persists all state in a mounted volume.

## Requirements

### Requirement: Single-container runtime

The container SHALL run the web application, collaboration service, embedded database, local asset storage, and request router as one deployment unit.

#### Scenario: Full application starts

- **WHEN** the container is started with one published HTTP port and a writable volume mounted at `/data`
- **THEN** the landing page is reachable
- **AND** a deck can be created, opened, and edited from two browsers

### Requirement: Single published HTTP port

The container SHALL publish exactly one HTTP port. Requests to `/` SHALL reach the web application, and requests to `/collab` SHALL reach the collaboration service.

#### Scenario: Page and collaboration share a port

- **WHEN** a browser loads the app through the published port
- **THEN** page requests and asset requests are served by the web application
- **AND** the collaboration WebSocket upgrades on the same port under `/collab`

### Requirement: Same-origin collaboration endpoint

The browser bundle SHALL connect to the collaboration service through a same-origin path. It MUST NOT embed a deployment hostname or a second published port.

#### Scenario: Works on localhost and behind TLS

- **WHEN** the container is reached at `http://localhost:8080`
- **THEN** two browsers can collaborate over `ws://localhost:8080/collab`
- **WHEN** the container is reached through an HTTPS proxy at a public hostname
- **THEN** the same image collaborates over `wss://<hostname>/collab` without a rebuild

### Requirement: Durable state under /data

All durable application state, including deck metadata, document snapshots, asset metadata, and uploaded image bytes, SHALL be stored under `/data`.

#### Scenario: State survives container replacement

- **WHEN** a deck is created and an image is uploaded
- **AND** the container is removed and recreated with the same `/data` volume
- **THEN** the deck, its content, and its image remain available

### Requirement: Graceful shutdown persists pending updates

On SIGTERM, the container SHALL give the collaboration service time to flush pending document updates before terminating it.

#### Scenario: Recent edit survives shutdown

- **WHEN** an editor changes a deck
- **AND** the container is stopped with SIGTERM
- **THEN** the change is present after the container restarts with the same `/data` volume

### Requirement: Migrations before traffic

On startup, the container SHALL initialize the embedded database when needed and apply all pending migrations before the web or collaboration service accepts traffic.

#### Scenario: First run and upgrade

- **WHEN** the container starts with an empty `/data` volume
- **THEN** the schema is created and the app serves requests
- **WHEN** the container restarts after a release adds a migration
- **THEN** the migration is applied before the app serves requests

#### Scenario: Migration failure prevents startup

- **WHEN** a migration fails
- **THEN** the container exits non-zero without serving the application

### Requirement: Fail-fast process supervision

If any required runtime process exits or any startup step fails, the container SHALL stop instead of continuing to serve a partial system.

#### Scenario: A managed process dies

- **WHEN** the web, collaboration, proxy, or database process exits unexpectedly
- **THEN** the remaining processes are stopped and the container exits

### Requirement: Container health check

The container health check SHALL query the application health endpoint through the published HTTP port and report the container unhealthy when that endpoint does not return success.

#### Scenario: Healthy container

- **WHEN** the web application can reach the embedded database
- **THEN** the health endpoint returns `200` and the container reports healthy

#### Scenario: Unhealthy container

- **WHEN** the health endpoint returns a non-success status
- **THEN** the container health check fails

### Requirement: Non-root runtime

All application and database processes in the container SHALL run as a non-root user, and that user SHALL have write access to `/data`.

#### Scenario: Runtime user and persistence

- **WHEN** the container is running
- **THEN** the effective user ID is not `0`
- **AND** a deck creation and image upload can write under `/data`

### Requirement: No development environment file in the image

The built image MUST NOT contain a `.env` or `.env.local` file from the build context. Runtime configuration SHALL come from explicit container environment values.

#### Scenario: Development env file is present in the build context

- **WHEN** the image is built from a checkout that contains a development `.env`
- **THEN** no `.env` or `.env.local` file is present in the image
- **AND** the container starts using its explicit environment values

### Requirement: Backup and restore

The deployment documentation SHALL define a backup procedure that stops the container and archives `/data`, and a restore procedure that starts a container from the restored volume.

#### Scenario: Restore archived state

- **WHEN** a deck and uploaded image exist
- **AND** the container is stopped and `/data` is archived
- **AND** a new container starts with the archive restored
- **THEN** the deck and image are available

### Requirement: Existing two-image deployment preserved

The existing separate web and collaboration images and the production Compose example SHALL remain valid and documented.

#### Scenario: Existing production configuration still validates

- **WHEN** the existing production Compose file is validated
- **THEN** validation succeeds
- **AND** the single-container files do not replace or break the existing images
