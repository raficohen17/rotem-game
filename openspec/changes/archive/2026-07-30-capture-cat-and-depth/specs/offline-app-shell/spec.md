# offline-app-shell Specification

## ADDED Requirements

### Requirement: A new build is asked for, not waited for
The app MUST check for a new version when it starts and again when it comes
back to the foreground. Registering a service worker only checks on a fresh
navigation, and Rotem never navigates — she opens the game from her home screen
and Android resumes it from the app switcher, which is not a load. Without this
a phone can stay on an old build for as long as the app is never fully closed.

#### Scenario: Coming back to the app
- **WHEN** the app is brought back to the foreground
- **THEN** it asks whether there is a newer build

#### Scenario: Not on every glance
- **WHEN** the app is shown and hidden repeatedly
- **THEN** it does not ask more often than a deploy could possibly happen

#### Scenario: What she was doing is kept
- **WHEN** a new build takes over and the page reloads
- **THEN** the world is saved first, so the last thing she did is not lost
