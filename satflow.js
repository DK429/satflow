/* SATFlow logic — DK Coding
   Purpose: Measure saturation flow during green intervals at traffic signals.
   Baseline: MOVA Speed v3.4 (distance removed; structure adapted)
*/

(function(){
  'use strict';

  // ----------- State -----------
  const state = {
    site: {
      site: '',
      junction: '',
      arm: '',
      surveyor: '',
      date: '',
      notes: ''
    },
    running: false,
    startTs: 0,
    tickHandle: null,
    currentPCU: 0,
    samples: [] // { sampleNo, pcu, seconds, flowPcuPerHour }
  };

  // ----------- Elements -----------
  const tabs = {
    site: document.getElementById('tab-site'),
    measure: document.getElementById('tab-measure'),
    results: document.getElementById('tab-results')
  };

  const siteForm = {
    site: document.getElementById('site'),
    junction: document.getElementById('junction'),
    arm: document.getElementById('arm'),
    surveyor: document.getElementById('surveyor'),
    date: document.getElementById('date'),
    notes: document.getElementById('notes')
  };

  const btns = {
    tabBtns: document.querySelectorAll('.tab-btn'),
    startMeasurements: document.getElementById('start-measurements'),
    green: document.getElementById('green-btn'),
    inc: document.getElementById('inc-pcu-btn'),
    undo: document.getElementById('undo-btn'),
    resetCurrent: document.getElementById('reset-current-btn'),
    endSurvey: document.getElementById('end-survey-btn'),
    exportCSV: document.getElementById('export-csv'),
    exportTXT: document.getElementById('export-txt')
  };

  const display = {
    timer: document.getElementById('timer-display'),
    pcu: document.getElementById('pcu-display'),
    sampleCount: document.getElementById('sample-count'),
    liveFlow: document.getElementById('live-flow'),
    samplesBody: document.getElementById('samples-body'),
    resultsBody: document.getElementById('results-body'),
    summary: document.getElementById('summary')
  };

  // ----------- Utils -----------
  const pad = (n, z=2) => String(n).padStart(z,'0');
  function fmtSeconds(sec){
    if(!isFinite(sec)) return '—';
    const m = Math.floor(sec/60);
    const s = Math.floor(sec % 60);
    const cs = Math.round((sec - Math.floor(sec))*100);
    return `${pad(m)}:${pad(s)}.${pad(cs)}`;
  }
  function nowSec(){ return performance.now()/1000; }

  function setActiveTab(tabName){
    Object.values(tabs).forEach(el => el.classList.remove('active'));
    tabs[tabName].classList.add('active');
    btns.tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab===tabName));
  }

  function loadToday(){
    const today = new Date();
    siteForm.date.valueAsDate = today;
  }

  function readSite(){
    state.site.site = siteForm.site.value.trim();
    state.site.junction = siteForm.junction.value.trim();
    state.site.arm = siteForm.arm.value.trim();
    state.site.surveyor = siteForm.surveyor.value.trim();
    state.site.date = siteForm.date.value;
    state.site.notes = siteForm.notes.value.trim();
  }

  function writeSiteToSummary(){
    const s = state.site;
    const header = [
      `Site: ${s.site || '-'}`,
      `Junction: ${s.junction || '-'}`,
      `Arm/Lane: ${s.arm || '-'}`,
      `Surveyor: ${s.surveyor || '-'}`,
      `Date: ${s.date || '-'}`
    ].join(' | ');
    return header;
  }

  // ----------- Measurements Logic -----------
  function startGreen(){
    if(state.running) return;
    state.running = true;
    state.startTs = nowSec();
    state.currentPCU = 0;
    display.pcu.textContent = '0';
    display.timer.textContent = '00:00.00';

    btns.green.textContent = 'End of Sat';
    btns.inc.disabled = false;
    btns.undo.disabled = false;
    btns.resetCurrent.disabled = false;

    state.tickHandle = setInterval(()=>{
      const elapsed = nowSec() - state.startTs;
      display.timer.textContent = fmtSeconds(elapsed);
    }, 50);
  }

  function endSat(){
    if(!state.running) return;
    state.running = false;
    const duration = Math.max(0, nowSec() - state.startTs);
    clearInterval(state.tickHandle); state.tickHandle = null;

    const sampleNo = state.samples.length + 1;
    const pcu = state.currentPCU;
    const seconds = duration;
    const flow = seconds > 0 ? (pcu / seconds) * 3600 : 0;

    state.samples.push({ sampleNo, pcu, seconds, flowPcuPerHour: flow });
    renderSamples();
    updateLiveFlow();

    // reset for next measurement
    state.currentPCU = 0;
    display.pcu.textContent = '0';
    display.timer.textContent = '00:00.00';
    btns.green.textContent = 'Green';
    btns.inc.disabled = true;
    btns.undo.disabled = true;
    btns.resetCurrent.disabled = true;
  }

  function incrementPCU(){
    state.currentPCU += 1;
    display.pcu.textContent = String(state.currentPCU);
  }

  function undo(){
    if(state.running){
      if(state.currentPCU>0){
        state.currentPCU -= 1;
        display.pcu.textContent = String(state.currentPCU);
      }
    } else {
      // undo last saved sample
      if(state.samples.length>0){
        state.samples.pop();
        renderSamples();
        updateLiveFlow();
      }
    }
  }

  function resetCurrent(){
    if(state.running){
      state.currentPCU = 0;
      display.pcu.textContent = '0';
      // do not reset timer; user requested only counter reset
    }
  }

  function renderSamples(){
    display.samplesBody.innerHTML = '';
    state.samples.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${s.sampleNo}</td><td>${s.pcu}</td><td>${s.seconds.toFixed(2)}</td>`;
      display.samplesBody.appendChild(tr);
    });
    display.sampleCount.textContent = String(state.samples.length);
  }

  function updateLiveFlow(){
    const totalPCU = state.samples.reduce((a,b)=>a+b.pcu,0);
    const totalSec = state.samples.reduce((a,b)=>a+b.seconds,0);
    const flow = totalSec>0 ? (totalPCU/totalSec)*3600 : NaN;
    display.liveFlow.textContent = isFinite(flow) ? flow.toFixed(1) : '—';
  }

  function endSurvey(){
    // lock measurement controls
    if(state.running){
      // if still running, end current as per user's button press requirement
      endSat();
    }
    btns.green.disabled = true;
    btns.inc.disabled = true;
    btns.undo.disabled = false; // allow removing a mistaken last row even after end
    btns.resetCurrent.disabled = true;
    btns.endSurvey.disabled = true;

    // compute summary and render results table
    renderResults();
    setActiveTab('results');
  }

  // ----------- Results -----------
  function renderResults(){
    const s = state.samples;
    display.resultsBody.innerHTML = '';
    s.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${row.sampleNo}</td>
                      <td>${row.pcu}</td>
                      <td>${row.seconds.toFixed(2)}</td>
                      <td>${row.flowPcuPerHour.toFixed(1)}</td>`;
      display.resultsBody.appendChild(tr);
    });

    const totalPCU = s.reduce((a,b)=>a+b.pcu,0);
    const totalSec = s.reduce((a,b)=>a+b.seconds,0);
    const flowTotal = totalSec>0 ? (totalPCU/totalSec)*3600 : 0;

    const meanOfRates = s.length>0 ? (s.reduce((a,b)=>a+b.flowPcuPerHour,0)/s.length) : 0;

    const header = writeSiteToSummary();
    display.summary.innerHTML = `
      <div><strong>${header}</strong></div>
      <div style="margin-top:8px">
        Samples: <span class="mono">${s.length}</span> ·
        Total PCU: <span class="mono">${totalPCU}</span> ·
        Total Seconds: <span class="mono">${totalSec.toFixed(2)}</span> ·
        <strong>Lane Saturation Flow (pcu/h):</strong>
        <span class="mono">${flowTotal.toFixed(1)}</span>
        <span style="color:var(--muted)">(mean of per-sample rates: ${meanOfRates.toFixed(1)})</span>
      </div>
    `;
  }

  // ----------- Exports -----------
  function exportCSV(){
    const lines = [];
    const s = state.site;
    lines.push(`"SATFlow v0.1"`);
    lines.push(`"Site","${s.site}"`);
    lines.push(`"Junction","${s.junction}"`);
    lines.push(`"Arm/Lane","${s.arm}"`);
    lines.push(`"Surveyor","${s.surveyor}"`);
    lines.push(`"Date","${s.date}"`);
    lines.push(`"Notes","${s.notes.replace(/"/g,'""')}"`);
    lines.push("");
    lines.push("Sample,PCU,Seconds,Flow (pcu/h)");
    for(const r of state.samples){
      lines.push(`${r.sampleNo},${r.pcu},${r.seconds.toFixed(2)},${r.flowPcuPerHour.toFixed(1)}`);
    }
    const totalPCU = state.samples.reduce((a,b)=>a+b.pcu,0);
    const totalSec = state.samples.reduce((a,b)=>a+b.seconds,0);
    const flowTotal = totalSec>0 ? (totalPCU/totalSec)*3600 : 0;
    lines.push("");
    lines.push(`"Lane Saturation Flow (pcu/h)",${flowTotal.toFixed(1)}`);

    downloadText(lines.join("\r\n"), suggestFileBase()+".csv", "text/csv");
  }

  function exportTXT(){
    const s = state.site;
    const lines = [];
    lines.push("SATFlow v0.1");
    lines.push(`Site: ${s.site}`);
    lines.push(`Junction: ${s.junction}`);
    lines.push(`Arm/Lane: ${s.arm}`);
    lines.push(`Surveyor: ${s.surveyor}`);
    lines.push(`Date: ${s.date}`);
    lines.push(`Notes: ${s.notes}`);
    lines.push("");
    lines.push("Sample\tPCU\tSeconds");
    for(const r of state.samples){
      lines.push(`${r.sampleNo}\t${r.pcu}\t${r.seconds.toFixed(2)}`);
    }
    const totalPCU = state.samples.reduce((a,b)=>a+b.pcu,0);
    const totalSec = state.samples.reduce((a,b)=>a+b.seconds,0);
    const flowTotal = totalSec>0 ? (totalPCU/totalSec)*3600 : 0;
    lines.push("");
    lines.push(`Lane Saturation Flow (pcu/h): ${flowTotal.toFixed(1)}`);

    downloadText(lines.join("\r\n"), suggestFileBase()+".txt", "text/plain");
  }

  function suggestFileBase(){
    const s = state.site;
    const date = s.date || new Date().toISOString().slice(0,10);
    const arm = s.arm ? s.arm.replace(/\s+/g,'_') : 'lane';
    return `SATFlow_${arm}_${date}`;
  }

  function downloadText(text, filename, mime){
    const blob = new Blob([text], {type: mime + ';charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{
      URL.revokeObjectURL(url); a.remove();
    }, 0);
  }

  // ----------- Event Wiring -----------
  function wire(){
    // top nav
    btns.tabBtns.forEach(b => {
      b.addEventListener('click', () => setActiveTab(b.dataset.tab));
    });

    btns.startMeasurements.addEventListener('click', () => {
      readSite();
      setActiveTab('measure');
    });

    btns.green.addEventListener('click', () => {
      if(!state.running) startGreen(); else endSat();
    });
    btns.inc.addEventListener('click', incrementPCU);
    btns.undo.addEventListener('click', undo);
    btns.resetCurrent.addEventListener('click', resetCurrent);
    btns.endSurvey.addEventListener('click', endSurvey);

    btns.exportCSV.addEventListener('click', exportCSV);
    btns.exportTXT.addEventListener('click', exportTXT);

    // keyboard helpers
    window.addEventListener('keydown', (e) => {
      // Space: toggle Green/End-of-Sat when on Measurements tab
      if(tabs.measure.classList.contains('active')){
        if(e.code === 'Space'){
          e.preventDefault();
          btns.green.click();
        } else if(e.key === '+'){
          e.preventDefault();
          if(!btns.inc.disabled) btns.inc.click();
        } else if(e.key === 'u'){
          e.preventDefault();
          btns.undo.click();
        } else if(e.key === 'r'){
          e.preventDefault();
          btns.resetCurrent.click();
        }
      }
    });
  }

  function init(){
    // default to site tab with today's date
    loadToday();
    wire();
    setActiveTab('site');
  }

  init();
})();
