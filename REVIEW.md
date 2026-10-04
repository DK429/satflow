# Mobile layout and reliability update

SATFlow now follows MOVA Speed Survey's mobile styling. Green retains a 164px circle; vehicle controls are at least 80px tall and End of Sat is a 72px full-width action. Last sample is prominent, and the Results table expands from the newest two samples to all retained rows.

## Issues addressed

- Returning to Measure restores the current running/idle controls without changing the timer, delay or vehicle counts.
- Live flow clears at the start and end of a sample.
- Ending during the start-up delay cancels that sample's pending callback, preventing it from enabling counting early on a later sample.
- Every CSV metadata field escapes quotes, commas and line breaks.
- The app and both report formats share APP_VERSION (1.5.6).
- README describes the implemented controls, calculations and exports, and no longer promises unwired keyboard/undo/haptic features.

The saturation-flow formula, PCU factors and sample order in saved reports are unchanged. This work does not add keyboard shortcuts or haptic functionality.

## Validation

Browser regression tests cover six phone widths in Chromium and WebKit, repeated rotation, larger text, touch counting, navigation during timing and delay, early ending/restarting, stale flow, sample deletion, expanded tables, complete CSV/TXT exports, quoted and multiline metadata, shared version labels and reset.

GitHub Actions provides the browser results and screenshots. Physical iPhone Safari and Samsung Internet verification remains pending.
