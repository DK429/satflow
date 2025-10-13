// scripts/main.js
import { state } from './state.js';
import { btns, ui } from './dom.js';
import { restoreSetting, haptic } from './haptics.js';
import { setActiveTab } from './tabs.js';
import { startGreen, endSat, incrementPCUBy } from './measure.js';
import { renderResults, updateLastSampleSummary, deleteLastSample } from './results.js';
import { exportCSV } from './export_csv.js';
import { exportTXT } from './export_txt.js';
import { todayISO } from './utils.js';

function readSite(){
  state.site={
    site:document.getElementById('site').value.trim(),
    junction:document.getElementById('junction').value.trim(),
    arm:document.getElementById('arm').value.trim(),
    surveyor:document.getElementById('surveyor').value.trim(),
    date:document.getElementById('date').value,
    notes:document.getElementById('notes').value.trim()
  };
  const d=parseFloat(document.getElementById('delay').value);
  state.delaySec=!isNaN(d)?Math.max(0,d):2;
  if(ui.delayHint) ui.delayHint.textContent=`Counting starts ${state.delaySec}s after Green`;
}

function wire(){
  // Tabs
  btns.tabBtns.forEach(b=>b.addEventListener('click',e=>{ haptic(20, e.currentTarget); setActiveTab(b.dataset.tab); }));
  // Site -> Measurements
  btns.startMeasurements.addEventListener('click',e=>{ haptic(30, e.currentTarget); readSite(); setActiveTab('measure'); });
  // Measurement actions
  btns.green.addEventListener('click',e=>{ haptic(60, e.currentTarget); startGreen(); });
  btns.endSat.addEventListener('click',e=>{ haptic(80, e.currentTarget); endSat(); });
  // Vehicle buttons
  btns.veh.car.addEventListener('click',e=>{ haptic(35, e.currentTarget); incrementPCUBy('car',1); });
  btns.veh.lgv.addEventListener('click',e=>{ haptic(35, e.currentTarget); incrementPCUBy('lgv',1.5); });
  btns.veh.hgv.addEventListener('click',e=>{ haptic(35, e.currentTarget); incrementPCUBy('hgv',2); });
  btns.veh.cyc.addEventListener('click',e=>{ haptic(35, e.currentTarget); incrementPCUBy('cyc',0.5); });
  // Admin
  btns.endSurvey.addEventListener('click',e=>{ haptic(50, e.currentTarget); renderResults(); setActiveTab('results'); });
  btns.deleteLast.addEventListener('click',e=>{ haptic(40, e.currentTarget); deleteLastSample(); });
  btns.exportCSV.addEventListener('click',e=>{ haptic(30, e.currentTarget); exportCSV(); });
  btns.exportTXT.addEventListener('click',e=>{ haptic(30, e.currentTarget); exportTXT(); });
  btns.resetSurvey.addEventListener('click',e=>{
    haptic(60, e.currentTarget);
    if(state.running) return;
    state.samples=[];
    renderResults();
    updateLastSampleSummary();
  });
}

function init(){
  // Auto-fill today's date in YYYY-MM-DD if empty
  const dateEl = document.getElementById('date');
  if (dateEl && !dateEl.value) { dateEl.value = todayISO(); }

  restoreSetting(btns.hapticsToggle);
  wire();
  setActiveTab('site');
}

window.addEventListener('DOMContentLoaded', init);
