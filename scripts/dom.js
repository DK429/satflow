// scripts/dom.js
// Caches DOM references and small DOM helpers.

export const btns = {
  tabBtns: document.querySelectorAll('.tab-btn'),
  startMeasurements: document.getElementById('start-measurements'),
  green: document.getElementById('green-btn'),
  endSat: document.getElementById('end-of-sat-btn'),
  endSurvey: document.getElementById('end-survey-btn'),
  deleteLast: document.getElementById('delete-last-btn'),
  exportCSV: document.getElementById('export-csv'),
  exportTXT: document.getElementById('export-txt'),
  resetSurvey: document.getElementById('reset-survey-btn'),
  hapticsToggle: document.getElementById('haptics-toggle'),
  veh: {
    car: document.getElementById('btn-car'),
    lgv: document.getElementById('btn-lgv'),
    hgv: document.getElementById('btn-hgv'),
    cyc: document.getElementById('btn-cycle')
  }
};

export const ui = {
  timer: document.getElementById('timer-display'),
  pcu: document.getElementById('pcu-display'),
  liveFlow: document.getElementById('live-flow'),
  resultsBody: document.getElementById('results-body'),
  totalsRow: document.getElementById('results-totals-row'),
  lastWrap: document.getElementById('last-sample'),
  lastFlow: document.getElementById('last-flow'),
  lastNo: document.getElementById('last-sample-no'),
  summary: document.getElementById('summary'),
  delayHint: document.getElementById('delay-hint')
};

// toggleVeh(disabled) -> void
// Enables or disables all vehicle buttons together.
export function toggleVeh(disabled){ Object.values(btns.veh).forEach(b=> b.disabled = disabled); }
