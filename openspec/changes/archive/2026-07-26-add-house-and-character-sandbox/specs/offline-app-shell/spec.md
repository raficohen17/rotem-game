## ADDED Requirements

### Requirement: Installs to the home screen

The app SHALL be installable from Chrome on Android as a home screen icon, and
when launched from that icon MUST open full screen in landscape with no browser
chrome visible.

#### Scenario: Launching from the home screen

- **WHEN** Rotem taps the icon on her Pixel home screen
- **THEN** the game opens full screen in landscape
- **AND** no address bar or browser interface is shown

### Requirement: Works with no network

Once installed, the app SHALL start and run fully with the device offline. It
MUST NOT require connectivity to open a world, place furniture, create a
character or save.

#### Scenario: Playing in aeroplane mode

- **WHEN** the device has no connectivity and Rotem opens the game
- **THEN** it starts and every feature works

### Requirement: Updates arrive without reinstalling

When a new version is published, the installed app SHALL replace its cached
copy and run the new version, without Rotem reinstalling anything. Stale caches
MUST be deleted so an old build cannot keep serving indefinitely.

#### Scenario: A new version is published

- **WHEN** a new version is deployed and Rotem next opens the app
- **THEN** the new version is fetched and run
- **AND** caches from the previous version are deleted

#### Scenario: An update arrives while she is playing

- **WHEN** a new version activates during a session
- **THEN** her current world is not lost

### Requirement: The app makes no network requests at runtime

The app MUST NOT contact any server while running. There SHALL be no
analytics, telemetry, advertising, third-party fonts, CDN assets, accounts or
crash reporting, and no user data SHALL leave the device. This MUST be enforced
by Content Security Policy rather than by convention alone.

#### Scenario: Watching the network while playing

- **WHEN** the game is used with network activity monitored
- **THEN** no request to any third-party origin is made

#### Scenario: An accidental third-party reference

- **WHEN** code is added that references an external origin
- **THEN** the Content Security Policy blocks the request

### Requirement: The app plays no audio of its own by default

The app SHALL NOT play background music, and sound effects SHALL default to off
behind a control the player can turn on, so that music already playing on the
phone continues uninterrupted.

#### Scenario: Playing alongside music

- **WHEN** Rotem starts music on her phone and then opens the game
- **THEN** the music keeps playing while she plays

### Requirement: Controls are sized for a child's finger

Every interactive control SHALL present a touch target of at least 64 units in
the 1280×720 design space, and the layout MUST adapt to any screen shape
without controls leaving the visible area.

#### Scenario: On a different screen shape

- **WHEN** the game is opened on a screen with a different aspect ratio
- **THEN** the whole play area remains visible
- **AND** every control stays reachable
