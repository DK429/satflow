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
