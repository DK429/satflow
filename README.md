# SATFlow — v1.5.6

A web app for measuring saturation flow (pcu/h) at a signalised stop-line.

## Survey workflow

1. Enter site number, junction, arm/lane, surveyor, date, optional notes and start-up delay. The default delay is two seconds.
2. Choose **Continue to Measure**, then **Green** to start timing.
3. Vehicle controls become available after the configured delay. Record Car (1 PCU), LGV (1.5 PCU), Bus/HGV (2 PCU) or Cycle (0.5 PCU).
4. Choose **End of Sat** to record the sample. Its flow appears in **Last sample**.
5. Repeat for additional samples. **Delete Last Sample** removes the newest completed sample.
6. **End Survey** opens Results. Save CSV or TXT above the sample table. **Reset Survey** clears completed samples; it does not reset a running measurement.

Changing screens does not stop or reset a running sample. Return to Measure to continue counting or use End of Sat. Delete and Reset do not alter a running sample.

## Calculations

Effective seconds = max(0, measured seconds − start-up delay).

Sample flow = PCU / effective seconds × 3600; zero when effective seconds is zero.

Lane saturation flow uses total PCU / total effective seconds × 3600, rather than an unweighted average of sample flows.

## Layout and exports

The mobile layout follows MOVA Speed Survey: light panels, labelled inputs, equal tabs, a circular Green button, large vehicle controls and a prominent last-sample reading. Results shows the two newest samples first; **Show all samples** expands the complete table. Swipe horizontally to see vehicle counts.

Both exports always include every retained sample in recording order, site metadata, per-sample PCU, effective seconds, flow, class counts, totals and lane saturation flow. CSV handles quotation marks, commas and line breaks in metadata. The app and saved reports share the same version constant.

Button taps provide an audible click where supported by the browser. The current app does not wire up keyboard shortcuts, undo of individual vehicle taps, or a haptic-feedback setting.

## Browser checks

GitHub Actions runs Chromium and WebKit tests across six phone widths, rotation, larger text, touch counting, start-up delay, navigation during timing, deletion, sample-table expansion, exports and reset. Physical iPhone Safari and Samsung Internet checks complement these automated tests.

For local tests, install Playwright and its Chromium/WebKit browsers, serve the repository on port 8767, then run:

```sh
node --test tests/mobile-layout.test.cjs
```
