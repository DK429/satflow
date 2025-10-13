// scripts/main.js
// App bootstrap: reads site form, wires events, and initialises modules.

import { state } from './state.js';
import { btns, ui } from './dom.js';
import { restoreSetting } from './haptics.js';
import { setActiveTab } from './tabs.js';
import { startGreen, endSat, incrementPCUBy } from './measure.js';
import { renderResults, updateLastSampleSummary, deleteLastSample } from './results.js';
import { exportCSV } from './export_csv.js';
import { exportTXT } from './export_txt.js';

// readSite() -> void
// Copies the site form fields into state and updates the delay hint.
function readSite(){
  state.site = {
    site: document.getElementById('site').value.trim(),
    junction: document.getElementById('junction').value.trim(),
    arm: document.getElementById('arm').value.trim(),
    surveyor: document.getElementById('surveyor').value.trim(),
    date: document.getElementById('date').value,
    notes: document.getElementById('notes').value.trim()
  };
  const d = parseFloat(document.getElementById('delay').value);
  state.delaySec = !isNaN(d) ? Math.max(0,d) : 2;
  if(ui.delayHint) ui.delayHint.textContent = `Counting starts ${state.delaySec}s after Green`;
}

// wire() -> void
// Hooks up UI events to feature functions.
function wire(){
  // Tabs
  btns.tabBtns.forEach(b => b.addEventListener('click', ()=> setActiveTab(b.dataset.tab)));

  // Site -> Measurements
  btns.startMeasurements.addEventListener('click', ()=>{ readSite(); setActiveTab('measure'); });

  // Measurement actions
  btns.green.addEventListener('click', startGreen);
  btns.endSat.addEventListener('click', endSat);

  // Vehicle buttons
  btns.veh.car.addEventListener('click', ()=> incrementPCUBy('car',1));
  btns.veh.lgv.addEventListener('click', ()=> incrementPCUBy('lgv',1.5));
  btns.veh.hgv.addEventListener('click', ()=> incrementPCUBy('hgv',2));
  btns.veh.cyc.addEventListener('click', ()=> incrementPCUBy('cyc',0.5));

  // Admin
  btns.endSurvey.addEventListener('click', ()=>{ renderResults(); setActiveTab('results'); });
  btns.deleteLast.addEventListener('click', deleteLastSample);
  btns.exportCSV.addEventListener('click', exportCSV);
  btns.exportTXT.addEventListener('click', exportTXT);
  btns.resetSurvey.addEventListener('click', ()=>{
    if(state.running) return;
    state.samples = [];
    renderResults();
    updateLastSampleSummary();
  });
}

// init() -> void
// Entry point: restores settings, wires events, and shows the Site tab.
function init(){
  restoreSetting(btns.hapticsToggle);
  wire();
  setActiveTab('site');
}

window.addEventListener('DOMContentLoaded', init);
