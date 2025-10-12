/* SATFlow v1.4 (mobile)
   DK Coding — Saturation Flow Survey
   Includes haptic feedback toggle, delay-adjusted flow, and line-by-line TXT export
*/

const state = {
  tab: 'site',
  running: false,
  startTime: 0,
  delaySec: 2,
  counterStart: 0,
  totalPCU: 0,
  elapsed: 0,
  samples: [], // { sampleNo, pcu, seconds, flowPcuPerHour, car, lgv, hgv, cycle }
  site: {},
  settings: { haptics: true }
};

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
  lastSample: document.getElementById('last-sample'),
  lastFlow: document.getElementById('last-flow'),
  lastSampleNo: document.getElementById('last-sample-no'),
  resultsTotalsRow: document.getElementById('results-totals-row')
};

function nowSec(){ return performance.now()/1000; }
function haptic(ms){
  try{ if(state.settings?.haptics && 'vibrate' in navigator) navigator.vibrate(ms); }catch(e){}
}

function pad(num, width){
  const str = num.toFixed(2).padStart(width,' ');
  return str;
}
function padInt(num, width){
  const str = String(num).padStart(width,' ');
  return str;
}

function formatTime(sec){
  const m = Math.floor(sec/60);
  const s = (sec % 60).toFixed(2).padStart(5,'0');
  return `${m>0?m+':':''}${s}`;
}

function updateHasSamplesClass(){
  if(state.samples && state.samples.length>0){
    document.body.classList.add('has-samples');
  } else {
    document.body.classList.remove('has-samples');
  }
}

function setActiveTab(tab){
  state.tab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
  document.body.classList.toggle('dock-visible', tab === 'measure');
}

function resetUI(){
  display.timer.textContent = '00:00.00';
  display.pcu.textContent = '0';
  display.liveFlow.textContent = '—';
  display.lastSample.style.display = 'none';
}

function updateTimer(){
  if(!state.running) return;
  state.elapsed = nowSec() - state.startTime;
  display.timer.textContent = formatTime(state.elapsed);
  requestAnimationFrame(updateTimer);
}

function startGreen(){
  haptic(60);
  state.running = true;
  state.startTime = nowSec();
  state.totalPCU = 0;
  state.counterStart = 0;
  display.pcu.textContent = '0';
  document.body.classList.add('counting');
  btns.green.disabled = true;
  btns.endSat.disabled = false;
  Object.values(btns.veh).forEach(b => b.disabled = false);
  updateTimer();
  setTimeout(()=>{ state.counterStart = nowSec(); }, state.delaySec * 1000);
}

function endSat(){
  haptic(90);
  state.running = false;
  const end = nowSec();
  const totalSec = end - state.startTime;
  const effSeconds = Math.max(0, totalSec - state.delaySec);
  const pcu = state.totalPCU;
  const flow = effSeconds > 0 ? (pcu / effSeconds) * 3600 : 0;

  const car = state.car || 0, lgv = state.lgv || 0, hgv = state.hgv || 0, cyc = state.cyc || 0;
  const sampleNo = state.samples.length + 1;
  state.samples.push({ sampleNo, pcu, seconds: effSeconds, flowPcuPerHour: flow, car, lgv, hgv, cycle: cyc });
  updateHasSamplesClass();
  renderResults();
  updateLastSampleSummary();

  display.lastSample.style.display = 'block';
  btns.green.disabled = false;
  btns.endSat.disabled = true;
  Object.values(btns.veh).forEach(b => b.disabled = true);
  document.body.classList.remove('counting');
  document.body.classList.add('idle');
}

function incrementPCUBy(type, delta){
  haptic(35);
  if(!state.running || (nowSec() - state.startTime) < state.delaySec) return;
  state.totalPCU += delta;
  state[type] = (state[type] || 0) + 1;
  display.pcu.textContent = state.totalPCU.toFixed(1);
  updateLiveFlow();
}

function updateLiveFlow(){
  const effElapsed = nowSec() - (state.counterStart || state.startTime);
  if(!state.running || effElapsed <= 0) return;
  const flow = (state.totalPCU / effElapsed) * 3600;
  display.liveFlow.textContent = flow.toFixed(0);
}

function updateLastSampleSummary(){
  const last = state.samples[state.samples.length-1];
  if(!last) return;
  display.lastFlow.textContent = last.flowPcuPerHour.toFixed(1);
  display.lastSampleNo.textContent = last.sampleNo;
}

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

  const avgFlow = flowTotal.toFixed(1);
  document.getElementById('summary').innerHTML =
    `Lane Saturation Flow (pcu/h): <strong>${avgFlow}</strong>`;
}

function deleteLastSample(){
  haptic(50);
  if(state.samples.length > 0){
    state.samples.pop();
    updateHasSamplesClass();
    renderResults();
    updateLastSampleSummary();
  }
}

function exportTXT(){
  const s = state.site;
  const lines = [];
  const push = t => lines.push(t + "\r\n");

  push(`SATFlow v1.4 (mobile)`);
  push(`Site        : ${s.site}`);
  push(`Junction    : ${s.junction}`);
  push(`Arm/Lane    : ${s.arm}`);
  push(`Surveyor    : ${s.surveyor}`);
  push(`Date        : ${s.date}`);
  push(`Delay (s)   : ${state.delaySec}`);
  push(`Notes       : ${s.notes || ''}`);
  push('');

  push('  Sample      PCU     Secs  Flow(pcu/h)      Car      LGV      HGV      Cyc');
  state.samples.forEach(r=>{
    push(padInt(r.sampleNo,8)+pad(r.pcu,10)+pad(r.seconds,9)+pad(r.flowPcuPerHour,13)
      +padInt(r.car,9)+padInt(r.lgv,9)+padInt(r.hgv,9)+padInt(r.cycle,9));
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

  const blob = new Blob([lines.join('')], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${s.site || 'satflow'}_${s.arm || 'lane'}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportCSV(){
  const lines = [];
  const s = state.site;
  lines.push(`"SATFlow v1.4 (mobile)"`);
  lines.push(`"Site","${s.site}"`);
  lines.push(`"Junction","${s.junction}"`);
  lines.push(`"Arm/Lane","${s.arm}"`);
  lines.push(`"Surveyor","${s.surveyor}"`);
  lines.push(`"Date","${s.date}"`);
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

  const blob = new Blob([lines.join("\r\n")], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${s.site || 'satflow'}_${s.arm || 'lane'}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function resetSurvey(){
  haptic(40);
  state.samples = [];
  state.totalPCU = 0;
  resetUI();
  renderResults();
  updateHasSamplesClass();
}

function init(){
  try{
    const raw = localStorage.getItem('satflow_settings');
    if(raw){
      const parsed = JSON.parse(raw);
      if(typeof parsed.haptics === 'boolean'){ state.settings.haptics = parsed.haptics; }
    }
  }catch(e){}
  if(btns.hapticsToggle){
    btns.hapticsToggle.checked = !!state.settings.haptics;
    btns.hapticsToggle.addEventListener('change', () => {
      state.settings.haptics = !!btns.hapticsToggle.checked;
      try{ localStorage.setItem('satflow_settings', JSON.stringify(state.settings)); }catch(e){}
    });
  }

  btns.startMeasurements.addEventListener('click', ()=>{
    state.site = {
      site: document.getElementById('site').value,
      junction: document.getElementById('junction').value,
      arm: document.getElementById('arm').value,
      surveyor: document.getElementById('surveyor').value,
      date: document.getElementById('date').value,
      notes: document.getElementById('notes').value
    };
    const delay = parseFloat(document.getElementById('delay').value);
    state.delaySec = !isNaN(delay)? delay : 2;
    setActiveTab('measure');
    document.body.classList.add('idle');
    updateHasSamplesClass();
    resetUI();
  });

  btns.green.addEventListener('click', startGreen);
  btns.endSat.addEventListener('click', endSat);
  btns.endSurvey.addEventListener('click', ()=>{ renderResults(); setActiveTab('results'); });
  btns.deleteLast.addEventListener('click', deleteLastSample);
  btns.exportTXT.addEventListener('click', exportTXT);
  btns.exportCSV.addEventListener('click', exportCSV);
  btns.resetSurvey.addEventListener('click', resetSurvey);

  for(const [k,b] of Object.entries(btns.veh)){
    b.addEventListener('click', ()=> incrementPCUBy(k, k==='car'?1:k==='lgv'?1.5:k==='hgv'?2:0.5));
  }

  document.querySelectorAll('.tab-btn').forEach(b=>{
    b.addEventListener('click', ()=> setActiveTab(b.dataset.tab));
  });

  updateHasSamplesClass();
}

window.addEventListener('DOMContentLoaded', init);
