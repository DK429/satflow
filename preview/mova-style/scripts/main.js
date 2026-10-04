// scripts/main.js
import { state } from './state.js';
import { btns, ui } from './dom.js';
import { setActiveTab } from './tabs.js';
import { startGreen, endSat, incrementPCUBy } from './measure.js';
import { renderResults, updateLastSampleSummary, deleteLastSample } from './results.js';
import { exportCSV } from './export_csv.js';
import { exportTXT } from './export_txt.js';
import { todayISO } from './utils.js';
import { click as audioClick } from './audio.js';

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
  btns.tabBtns.forEach(b=>b.addEventListener('click',()=>{ audioClick(); setActiveTab(b.dataset.tab); }));
  btns.startMeasurements.addEventListener('click',()=>{ audioClick(); readSite(); setActiveTab('measure'); });
  btns.green.addEventListener('click', startGreen);
  btns.endSat.addEventListener('click', endSat);
  btns.veh.car.addEventListener('click', ()=>incrementPCUBy('car',1));
  btns.veh.lgv.addEventListener('click', ()=>incrementPCUBy('lgv',1.5));
  btns.veh.hgv.addEventListener('click', ()=>incrementPCUBy('hgv',2));
  btns.veh.cyc.addEventListener('click', ()=>incrementPCUBy('cyc',0.5));
  btns.endSurvey.addEventListener('click', ()=>{ audioClick(); renderResults(); setActiveTab('results'); });
  btns.deleteLast.addEventListener('click', ()=>{ audioClick(); deleteLastSample(); });
  btns.exportCSV.addEventListener('click', ()=>{ audioClick(); exportCSV(); });
  btns.exportTXT.addEventListener('click', ()=>{ audioClick(); exportTXT(); });
  btns.resetSurvey.addEventListener('click', ()=>{
    audioClick();
    if(state.running) return;
    state.samples=[];
    renderResults();
    updateLastSampleSummary();
  });
}

function init(){
  const dateEl = document.getElementById('date');
  if (dateEl && !dateEl.value) { dateEl.value = todayISO(); }
  wire();
  setActiveTab('site');
}

window.addEventListener('DOMContentLoaded', init);

