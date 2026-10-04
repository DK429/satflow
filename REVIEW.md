# Mobile presentation update

The visual design follows MOVA Speed Survey v3.4: a light neutral background, compact equal tabs, consistent form labels and inputs, white panels, generous touch targets, and clear action colours.

Green uses the same 164px circular control. During counting, Satflow's four vehicle controls use an 80px minimum height and End of Sat uses a separate 72px full-width control so the counting screen remains compact. The last sample stays at the top. Results retains all sample rows, showing the newest two by default with an expandable table. CSV and TXT continue to export all retained samples.

Only HTML, CSS and a new presentation module change the app. All existing JavaScript modules remain unchanged.

## Validation

The browser suite covers Chromium and WebKit at 320, 360, 375, 393, 402 and 430 CSS pixels, repeated rotation, larger text, touch counting, start-up delay, sample deletion, expanded tables, complete CSV/TXT exports and reset. GitHub Actions publishes screenshots for review. Physical iPhone Safari and Samsung Internet checks remain necessary.

Local browser execution is unavailable in the editing environment because browser downloads are blocked. See the pull request checks for the actual browser results.

## Existing issues found during review

- Switching away from and back to Measure during a running sample sets the presentation to idle and hides End of Sat although state.running remains true (scripts/tabs.js). Finish a sample before changing tabs pending a separate functional fix.
- Live flow is not cleared at the start or end of a sample, so the previous live value can remain until the next vehicle tap (scripts/measure.js).
- CSV metadata does not escape quotes in all site fields (scripts/export_csv.js).
- The app footer reports v1.5.6 but both export headings report v1.5.5.
- README mentions keyboard undo and haptic settings that are not wired into the current main module.

These are recorded for a separate functional update; they are not changed by this styling work.
