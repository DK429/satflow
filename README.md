# SATFlow (DK Coding) — v0.5 mobile

A lightweight, offline web app to measure **saturation flow (pcu/h)** at a signalised stop-line.

## What’s new in v0.5
- **Per-sample counts** for each class (**Car, LGV, HGV, Cycle**) are recorded and shown in both tables.
- **Action Log & Undo**: Undo removes the last increment with the right PCU value and decrements that class count accurately.
- Keeps **v0.4** features: configurable start-up delay per site and rich keyboard shortcuts.

## Export
CSV/TXT now include columns: `Sample, PCU, Seconds, Flow (pcu/h), Car, LGV, HGV, Cycle`.

## Keyboard Shortcuts
- Green/End: `Space`
- Car: `+`, `1`, or `C`
- LGV: `2` or `L`
- Bus/HGV: `3`, `H`, or `B`
- Cycle: `4` or `Y`
- Undo: `U`
- Reset Current: `R`


**v0.6**: Fixed-width, right-aligned TXT export (8-char columns, line-by-line with CRLF endings).

**v0.7**: Docked controls only visible on Measurements tab with fade animation; TXT export adds dashed separator and totals row (PCU, Secs, Car, LGV, HGV, Cyc).

# SATFlow (DK Coding) — v0.9 mobile

Minimal, offline web app to measure **saturation flow (pcu/h)** at a signalised stop-line.

## v0.9 Highlights
- **Minimal measurement UI** (timer + count + live flow) for iPhone screens.
- **2×2 vehicle grid** and **bottom full-width “End of Sat”** while counting.
- **Controls only visible** on the Measurements tab (with fade animation).
- **Per-sample delay deducted** from recorded seconds and used for flow calculation.
- TXT export: **fixed-width, right-justified** columns + **dashed separator** + **totals row**.
- **New:** Running **Last Sample** flow display on Measurements (hidden while counting).
- **New:** Post-sample admin buttons show **End Survey** and **Delete Last Sample**.
- Robust undo of increments via keyboard (`u`).

## Flow Calculation
Per-sample flow uses **effective seconds** = `max(0, measured_seconds − start_delay)`.

## Export
- **CSV**: raw site data, samples, and lane flow.
- **TXT**: fixed-width columns, totals row (PCU, Secs, Car, LGV, HGV, Cyc), CRLF endings.


**v1.0**: Adds safe haptic feedback (Vibration API) on key taps (vehicle increments, Green/End, delete last, undo).

**v1.1**: Adds a simple 'Enable Haptic Feedback' toggle on the Site tab (persisted).
