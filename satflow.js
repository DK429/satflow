/* SATFlow v1.4.2 (mobile)
   DK Coding — Saturation Flow Survey
   Fixes:
   - Dock always visible on Measurements tab
   - Green/End-of-Sat buttons toggle correctly (inline style overridden)
   - Vehicle buttons locked until delay expires
   - TXT (CRLF, line-by-line) and CSV include Totals row
   - Haptic feedback with user toggle (persisted)
*/

const state = {
  tab: 'site',
  running: false,
  startTime: 0,
  delaySec: 2,
  counterStart: 0,      // time when counting becomes valid (startTime + delay)
  totalPCU: 0,
  samples: [],          // { sampleNo, pcu, seconds, flowPcuPerHour, car, lgv, hgv, cycle }
  site: {},             // site header fields
  settings: { haptics: true }
};

// --- Elements ---
const btns = {
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

const display = {
  timer: document.getElementById('timer-display'),
  pcu: document.getElementById('pcu-display'),
  liveFlow: document.getElementById('live-flow'),
  resultsBody: document.getElementById('results-body'),
  resultsTotalsRow: document.getElementById('results-totals-row'),
  lastSample: document.getElementById('last-sample'),
  lastFlow: document.getElementById('last-flow'),
  lastSampleNo: document.getElementById('last-sample-no')
};

// --- Utils ---
function nowSec(){ return performance.now()/1000; }
function haptic(ms){ try{ if(state.settings?.haptics && 'vibrate' in navigator) navigator.vibrate(ms); }catch(e){} }
function pad(num, width){ return Number(num).toFixed(2).padStart(width,' '); }
function padInt(num, width){ return String(num).padStart(width,' '); }
function formatTime(sec){
  const m = Math.floor(sec/60);
  const s = (sec % 60).toFixed(2).padStart(5,'0');
  return `${m>0?m+':':''}${s}`;
}
function updateHasSamplesClass(){
  if(state.samples.length>0) document.body.classList.add('has-samples');
  else document.body.classList.remove('has-samples');
}
function setVehDisabled(disabled){
  Object.values(btns.veh).forEach(b => b.disabled = disabled);
}

// --- Tab + dock control (includes FIX for dock & button visibility) ---
function setActiveTab(tab){
  state.tab = tab;

  // Sections
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');

  // Nav highlight
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if(activeBtn) activeBtn.classList.add('active');

  // Dock visibility
  const dock = document.getElementById('dock');
  if(dock){
    if(tab === 'measure'){
      dock.classList.remove('controls-hidden');     // show dock
      document.body.classList.add('dock-visible');
      // Pre-count (idle) state: show Green, hide End-of-Sat
      btns.green.style.display = '';
      btns.endSat.style.display = 'none';
      document.body.classList.add('idle');
      document.body.classList.remove('counting');
      setVehDisabled(true);                         // locked until Green
    }else{
      dock.classList.add('controls-hidden');        // hide elsewhere
      document.body.classList.remove('dock-visible');
    }
  }
}

// --- UI helpers ---
function resetUI(){
  display.timer.textContent = '00:00.00';
  display.pcu.textContent = '0';
  display.liveFlow.textContent = '—';
  display.lastSample.style.display = state.samples.length ? '' : 'none';
}

function updateTimer(){
  if(!state.running) return;
  const elapsed = nowSec() - state.startTime;
  display.timer.textContent = formatTime(elapsed);
  requestAnimationFrame(updateTimer);
}

function updateLiveFlow(){
  if(!state.running || !state.counterStart) return;
  const effElapsed = nowSec() - state.counterStart;
  if(effElapsed <= 0) return;
  const flow = (state.totalPCU / effElapsed) * 3600;
  display.liveFlow.textContent = flow.toFixed(0);
}

function updateLastSampleSummary(){
  const last = state.samples[state.samples.length-1];
  if(!last){ display.lastSample.style.display = 'none'; return; }
  display.lastFlow.textContent = last.flowPcuPerHour.toFixed(1);
  display.lastSampleNo.textContent = last.sampleNo;
  display.lastSample.style.display = '';
}

// --- Measurement lifecycle ---
function startGreen(){
  if(state.running) return;
  haptic(60);
  state.running = true;
  state.startTime = nowSec();
  state.counterStart = 0;
  state.totalPCU = 0;
  // per-class counters (while running)
  state.car = 0; state.lgv = 0; state.hgv = 0; state.cyc = 0;

  // Swap buttons (FIX: override inline style)
  btns.green.style.display = 'none';
  btns.endSat.style.display = '';

  // State flags
  document.body.classList.add('counting');
  document.body.classList.remove('idle');

  // Lock vehicle buttons until delay window expires
  setVehDisabled(true);
  setTimeout(()=>{
    if(state.running){
      state.counterStart = nowSec();   // counting starts after delay
      setVehDisabled(false);
    }
  }, state.delaySec * 1000);

  resetUI();
  updateTimer();
}

function endSat(){
  if(!state.running) return;
  haptic(90);
  state.running = false;

  const end = nowSec();
  const totalSec = end - state.startTime;
  const effSeconds = Math.max(0, totalSec - state.delaySec);
  const pcu = state.totalPCU;
  const flow = effSeconds > 0 ? (pcu / effSeconds) * 3600 : 0;

  const sampleNo = state.samples.length + 1;
  state.samples.push({
    sampleNo,
    pcu,
    seconds: effSeconds,
    flowPcuPerHour: flow,
    car: state.car, lgv: state.lgv, hgv: state.hgv, cycle: state.cyc
  });
  updateHasSamplesClass();

  // Reset run-only counters
  state.totalPCU = 0; state.car=0; state.lgv=0; state.hgv=0; state.cyc=0;
  state.counterStart = 0;

  // Swap buttons back (FIX)
  btns.green.style.display = '';
  btns.endSat.style.display = 'none';

  // Lock vehicle buttons again
  setVehDisabled(true);

  // State flags
  document.body.classList.remove('counting');
  document.body.classList.add('idle');

  renderResults();
  updateLastSampleSummary();
  resetUI();
}

function incrementPCUBy(type, delta){
  haptic(35);
  if(!state.running) return;
  // Block increments until delay window is over
  if(!state.counterStart || nowSec() < state.counterStart) return;

  state.totalPCU = +(state.totalPCU + delta).toFixed(1);
  state[type] = (state[type] || 0) + 1;

  display.pcu.textContent = state.totalPCU.toFixed(1);
  updateLiveFlow();
}

function deleteLastSample(){
  haptic(50);
  if(state.running) return; // avoid corrupting a running sample
  if(state.samples.length > 0){
    state.samples.pop();
    updateHasSamplesClass();
    renderResults();
    updateLastSampleSummary();
  }
}

// --- Results & exports ---
function renderResults(){
  const s = state.samples;
  let html = '';
  s.forEach(r=>{
    html += `<tr>
      <td>${r.sampleNo}</td>
      <td>${r.pcu.toFixed(1)}</td>
      <td>${r.seconds.toFixed(2)}</td>
      <td>${r.flowPcuPerHour.toFixed(1)}</td>
      <td>${r.car}</td>
      <td>${r.lgv}</td>
      <td>${r.hgv}</td>
      <td>${r.cycle}</td>
    </tr>`;
  });
  display.resultsBody.innerHTML = html;

  const totalPCU = s.reduce((a,b)=>a+b.pcu,0);
  const totalEffSec = s.reduce((a,b)=>a+b.seconds,0);
  const sumCar = s.reduce((a,b)=>a+b.car,0);
  const sumLGV = s.reduce((a,b)=>a+b.lgv,0);
  const sumHGV = s.reduce((a,b)=>a+b.hgv,0);
  const sumCyc = s.reduce((a,b)=>a+b.cycle,0);
  const flowTotal = totalEffSec>0 ? (totalPCU/totalEffSec)*3600 : 0;

  display.resultsTotalsRow.innerHTML =
    `<td><strong>Totals:</strong></td>
     <td><strong>${totalPCU.toFixed(1)}</strong></td>
     <td><strong>${totalEffSec.toFixed(1)}</strong></td>
     <td></td>
     <td><strong>${sumCar}</strong></td>
     <td><strong>${sumLGV}</strong></td>
     <td><strong>${sumHGV}</strong></td>
     <td><strong>${sumCyc}</strong></td>`;

  document.getElementById('summary').innerHTML =
    `Lane Saturation Flow (pcu/h): <strong>${flowTotal.toFixed(1)}</strong>`;
}

function exportTXT(){
  const s = state.site;
  const lines = [];
  const push = t => lines.push(t + "\r\n");  // CRLF, line-by-line

  push(`SATFlow v1.4.2 (mobile)`);
  push(`Site        : ${s.site||''}`);
  push(`Junction    : ${s.junction||''}`);
  push(`Arm/Lane    : ${s.arm||''}`);
  push(`Surveyor    : ${s.surveyor||''}`);
  push(`Date        : ${s.date||''}`);
  push(`Delay (s)   : ${state.delaySec}`);
  push(`Notes       : ${s.notes||''}`);
  push('');

  push('  Sample      PCU     Secs  Flow(pcu/h)      Car      LGV      HGV      Cyc');
  state.samples.forEach(r=>{
    push(
      padInt(r.sampleNo,8) +
      pad(r.pcu,10) +
      pad(r.seconds,9) +
      pad(r.flowPcuPerHour,13) +
      padInt(r.car,9) +
      padInt(r.lgv,9) +
      padInt(r.hgv,9) +
      padInt(r.cycle,9)
    );
  });

  const totalPCU = state.samples.reduce((a,b)=>a+b.pcu,0);
  const totalEffSec = state.samples.reduce((a,b)=>a+b.seconds,0);
  const sumCar = state.samples.reduce((a,b)=>a+b.car,0);
  const sumLGV = state.samples.reduce((a,b)=>a+b.lgv,0);
  const sumHGV = state.samples.reduce((a,b)=>a+b.hgv,0);
  const sumCyc = state.samples.reduce((a,b)=>a+b.cycle,0);
  const flowTotal = totalEffSec>0 ? (totalPCU/totalEffSec)*3600 : 0;

  push(' ──────────────────────────────────────────────────────────────────────────');
  push(` Totals:${pad(totalPCU,10)}${pad(totalEffSec,9)}${' '.repeat(13)}${padInt(sumCar,9)}${padInt(sumLGV,9)}${padInt(sumHGV,9)}${padInt(sumCyc,9)}`);
  push('');
  push(`Lane Saturation Flow (pcu/h): ${flowTotal.toFixed(1)}`);

  const blob = new Blob([lines.join('')], {type:'text/plain;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${s.site || 'satflow'}_${s.arm || 'lane'}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportCSV(){
  const lines = [];
  const s = state.site;
  lines.push(`"SATFlow v1.4.2 (mobile)"`);
  lines.push(`"Site","${s.site||''}"`);
  lines.push(`"Junction","${s.junction||''}"`);
  lines.push(`"Arm/Lane","${s.arm||''}"`);
  lines.push(`"Surveyor","${s.surveyor||''}"`);
  lines.push(`"Date","${s.date||''}"`);
  lines.push(`"Start-up Delay (s)","${state.delaySec}"`);
  lines.push(`"Notes","${(s.notes||'').replace(/"/g,'""')}"`);
  lines.push("");
  lines.push("Sample,PCU,Seconds,Flow (pcu/h),Car,LGV,HGV,Cycle");
  for(const r of state.samples){
    lines.push(`${r.sampleNo},${r.pcu},${r.seconds.toFixed(2)},${r.flowPcuPerHour.toFixed(1)},${r.car},${r.lgv},${r.hgv},${r.cycle}`);
  }
  const totalPCU = state.samples.reduce((a,b)=>a+b.pcu,0);
  const totalEffSec = state.samples.reduce((a,b)=>a+b.seconds,0);
  const sumCar = state.samples.reduce((a,b)=>a+b.car,0);
  const sumLGV = state.samples.reduce((a,b)=>a+b.lgv,0);
  const sumHGV = state.samples.reduce((a,b)=>a+b.hgv,0);
  const sumCyc = state.samples.reduce((a,b)=>a+b.cycle,0);
  const flowTotal = totalEffSec>0 ? (totalPCU/totalEffSec)*3600 : 0;
  lines.push(`Totals,${totalPCU.toFixed(1)},${totalEffSec.toFixed(1)},,${sumCar},${sumLGV},${sumHGV},${sumCyc}`);
  lines.push(`"Lane Saturation Flow (pcu/h)",${flowTotal.toFixed(1)}`);

  const blob = new Blob([lines.join("\r\n")], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${s.site || 'satflow'}_${s.arm || 'lane'}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function resetSurvey(){
  haptic(40);
  if(state.running) return;
  state.samples = [];
  state.totalPCU = 0;
  updateHasSamplesClass();
  renderResults();
  updateLastSampleSummary();
  resetUI();
}

// --- Wiring & init ---
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
}

function init(){
  // Restore haptic setting
  try{
    const raw = localStorage.getItem('satflow_settings');
    if(raw){
      const parsed = JSON.parse(raw);
      if(typeof parsed.haptics === 'boolean') state.settings.haptics = parsed.haptics;
    }
  }catch(e){}
  if(btns.hapticsToggle){
    btns.hapticsToggle.checked = !!state.settings.haptics;
    btns.hapticsToggle.addEventListener('change', ()=>{
      state.settings.haptics = !!btns.hapticsToggle.checked;
      try{ localStorage.setItem('satflow_settings', JSON.stringify(state.settings)); }catch(e){}
    });
  }

  // Tabs
  btns.tabBtns.forEach(b => b.addEventListener('click', ()=> setActiveTab(b.dataset.tab)));

  // Site → Measurements
  btns.startMeasurements.addEventListener('click', ()=>{
    readSite();
    const hint = document.getElementById('delay-hint');
    if(hint) hint.textContent = `Counting starts ${state.delaySec}s after Green`;
    setActiveTab('measure');
    updateHasSamplesClass();
    resetUI();
  });

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
  btns.exportTXT.addEventListener('click', exportTXT);
  btns.exportCSV.addEventListener('click', exportCSV);
  btns.resetSurvey.addEventListener('click', resetSurvey);

  // Initial tab
  setActiveTab('site');
}

window.addEventListener('DOMContentLoaded', init);
