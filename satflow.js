/* SATFlow logic — DK Coding (v0.7 mobile)
   New:
   - Per-sample category counts (Car, LGV, HGV, Cycle) captured and shown
   - Robust Undo using an action log
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
      notes: '',
      startDelaySec: 2
    },
    running: false,
    startTs: 0,
    enableAt: 0,     // when to enable PCU buttons (now + delay after green)
    tickHandle: null,
    currentPCU: 0,
    currentCounts: { car: 0, lgv: 0, hgv: 0, cycle: 0 },
    actionLog: [], // [{type:'car'|'lgv'|'hgv'|'cycle', delta: number}]
    samples: [] // { sampleNo, pcu, seconds, flowPcuPerHour, car, lgv, hgv, cycle }
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
    delay: document.getElementById('delay'),
    notes: document.getElementById('notes')
  };

  const btns = {
    tabBtns: document.querySelectorAll('.tab-btn'),
    startMeasurements: document.getElementById('start-measurements'),
    green: document.getElementById('green-btn'),
    car: document.getElementById('btn-car'),
    lgv: document.getElementById('btn-lgv'),
    hgv: document.getElementById('btn-hgv'),
    cycle: document.getElementById('btn-cycle'),
    undo: document.getElementById('undo-btn'),
    resetCurrent: document.getElementById('reset-current-btn'),
    endSurvey: document.getElementById('end-survey-btn'),
    exportCSV: document.getElementById('export-csv'),
    exportTXT: document.getElementById('export-txt'),
    resetSurvey: document.getElementById('reset-survey-btn')
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
    const dock = document.querySelector('.controls-docked');
    if(dock){
      if(tabName === 'measure'){
        dock.classList.remove('controls-hidden');
        document.body.classList.add('dock-visible');
      } else {
        dock.classList.add('controls-hidden');
        document.body.classList.remove('dock-visible');
      }
    }
  }

  function loadToday(){
    const today = new Date();
    document.getElementById('date').valueAsDate = today;
  }

  function readSite(){
    state.site.site = siteForm.site.value.trim();
    state.site.junction = siteForm.junction.value.trim();
    state.site.arm = siteForm.arm.value.trim();
    state.site.surveyor = siteForm.surveyor.value.trim();
    state.site.date = siteForm.date.value;
    state.site.notes = siteForm.notes.value.trim();
    const d = parseFloat(siteForm.delay.value);
    state.site.startDelaySec = isNaN(d) ? 2 : Math.max(0, d);
  }

  function siteHeader(){
    const s = state.site;
    return [
      `Site: ${s.site || '-'}`,
      `Junction: ${s.junction || '-'}`,
      `Arm/Lane: ${s.arm || '-'}`,
      `Surveyor: ${s.surveyor || '-'}`,
      `Date: ${s.date || '-'}`
    ].join(' | ');
  }

  // ----------- Measurements Logic -----------
  function startGreen(){
    if(state.running) return;
    state.running = true;
    state.startTs = nowSec();
    state.enableAt = state.startTs + (state.site.startDelaySec ?? 2);
    state.currentPCU = 0;
    state.currentCounts = { car: 0, lgv: 0, hgv: 0, cycle: 0 };
    state.actionLog = [];
    display.pcu.textContent = '0';
    display.timer.textContent = '00:00.00';

    btns.green.textContent = 'End of Sat';
    // vehicle buttons will be enabled after delay in the tick loop
    btns.car.disabled = true; btns.lgv.disabled = true; btns.hgv.disabled = true; btns.cycle.disabled = true;
    btns.undo.disabled = false;
    btns.resetCurrent.disabled = false;

    state.tickHandle = setInterval(()=>{
      const allow = nowSec() >= state.enableAt;
      display.timer.textContent = fmtSeconds(nowSec() - state.startTs);
      btns.car.disabled = !allow;
      btns.lgv.disabled = !allow;
      btns.hgv.disabled = !allow;
      btns.cycle.disabled = !allow;
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
    const {car, lgv, hgv, cycle} = state.currentCounts;

    state.samples.push({ sampleNo, pcu, seconds, flowPcuPerHour: flow, car, lgv, hgv, cycle });
    renderSamples();
    updateLiveFlow();

    // reset for next measurement
    state.currentPCU = 0;
    state.currentCounts = { car: 0, lgv: 0, hgv: 0, cycle: 0 };
    state.actionLog = [];
    display.pcu.textContent = '0';
    display.timer.textContent = '00:00.00';
    btns.green.textContent = 'Green';
    btns.car.disabled = true; btns.lgv.disabled = true; btns.hgv.disabled = true; btns.cycle.disabled = true;
    btns.undo.disabled = true;
    btns.resetCurrent.disabled = true;
  }

  function incrementPCUBy(type, delta){
    if(!state.running || nowSec() < state.enableAt) return;
    state.currentPCU = +(state.currentPCU + delta).toFixed(1);
    state.currentCounts[type] += 1;
    state.actionLog.push({ type, delta });
    display.pcu.textContent = String(state.currentPCU);
  }

  function undo(){
    if(state.running){
      const last = state.actionLog.pop();
      if(last){
        state.currentPCU = +(state.currentPCU - last.delta).toFixed(1);
        state.currentPCU = Math.max(0, state.currentPCU);
        state.currentCounts[last.type] = Math.max(0, state.currentCounts[last.type] - 1);
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
      state.currentCounts = { car: 0, lgv: 0, hgv: 0, cycle: 0 };
      state.actionLog = [];
      display.pcu.textContent = '0';
    }
  }

  function renderSamples(){
    display.samplesBody.innerHTML = '';
    state.samples.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${s.sampleNo}</td>
                      <td>${s.pcu}</td>
                      <td>${s.seconds.toFixed(2)}</td>
                      <td>${s.flowPcuPerHour.toFixed(1)}</td>
                      <td>${s.car}</td>
                      <td>${s.lgv}</td>
                      <td>${s.hgv}</td>
                      <td>${s.cycle}</td>`;
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
    if(state.running){ endSat(); }
    btns.green.disabled = true;
    btns.car.disabled = true; btns.lgv.disabled = true; btns.hgv.disabled = true; btns.cycle.disabled = true;
    btns.undo.disabled = false;
    btns.resetCurrent.disabled = true;
    btns.endSurvey.disabled = true;

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
                      <td>${row.flowPcuPerHour.toFixed(1)}</td>
                      <td>${row.car}</td>
                      <td>${row.lgv}</td>
                      <td>${row.hgv}</td>
                      <td>${row.cycle}</td>`;
      display.resultsBody.appendChild(tr);
    });

    const totalPCU = s.reduce((a,b)=>a+b.pcu,0);
    const totalSec = s.reduce((a,b)=>a+b.seconds,0);
    const flowTotal = totalSec>0 ? (totalPCU/totalSec)*3600 : 0;
    const meanOfRates = s.length>0 ? (s.reduce((a,b)=>a+b.flowPcuPerHour,0)/s.length) : 0;

    const header = siteHeader();
    const delay = state.site.startDelaySec;
    display.summary.innerHTML = `
      <div><strong>${header}</strong></div>
      <div style="margin-top:8px">
        Samples: <span class="mono">${s.length}</span> ·
        Total PCU: <span class="mono">${totalPCU}</span> ·
        Total Seconds: <span class="mono">${totalSec.toFixed(2)}</span> ·
        <strong>Lane Saturation Flow (pcu/h):</strong>
        <span class="mono">${flowTotal.toFixed(1)}</span>
        <span style="color:var(--muted)">(mean of per-sample rates: ${meanOfRates.toFixed(1)}; delay ${delay}s)</span>
      </div>
    `;
  }

  // ----------- Exports -----------
  function suggestFileBase(){
    const s = state.site;
    const date = s.date || new Date().toISOString().slice(0,10);
    const arm = s.arm ? s.arm.replace(/\\s+/g,'_') : 'lane';
    return `SATFlow_${arm}_${date}`;
  }

  function downloadText(text, filename, mime){
    const blob = new Blob([text], {type: mime + ';charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
  }

  function exportCSV(){
    const lines = [];
    const s = state.site;
    lines.push(`"SATFlow v0.7 (mobile)"`);
    lines.push(`"Site","${s.site}"`);
    lines.push(`"Junction","${s.junction}"`);
    lines.push(`"Arm/Lane","${s.arm}"`);
    lines.push(`"Surveyor","${s.surveyor}"`);
    lines.push(`"Date","${s.date}"`);
    lines.push(`"Start-up Delay (s)","${s.startDelaySec}"`);
    lines.push(`"Notes","${s.notes.replace(/"/g,'""')}"`);
    lines.push("");
    lines.push("Sample,PCU,Seconds,Flow (pcu/h),Car,LGV,HGV,Cycle");
    for(const r of state.samples){
      lines.push(`${r.sampleNo},${r.pcu},${r.seconds.toFixed(2)},${r.flowPcuPerHour.toFixed(1)},${r.car},${r.lgv},${r.hgv},${r.cycle}`);
    }
    const totalPCU = state.samples.reduce((a,b)=>a+b.pcu,0);
    const totalSec = state.samples.reduce((a,b)=>a+b.seconds,0);
    const flowTotal = totalSec>0 ? (totalPCU/totalSec)*3600 : 0;
    lines.push("");
    lines.push(`"Lane Saturation Flow (pcu/h)",${flowTotal.toFixed(1)}`);
    downloadText(lines.join("\\r\\n"), suggestFileBase()+".csv", "text/csv");
  }

  function exportTXT(){
    const s = state.site;
    const lines = [];
    const push = t => lines.push(t + "\r\n");
    push("SATFlow v0.7 (mobile)");
    push(`Site        : ${s.site}`);
    push(`Junction    : ${s.junction}`);
    push(`Arm/Lane    : ${s.arm}`);
    push(`Surveyor    : ${s.surveyor}`);
    push(`Date        : ${s.date}`);
    push(`Delay (s)   : ${s.startDelaySec}`);
    push(`Notes       : ${s.notes}`);
    push("");
    const headers = ["Sample","PCU","Secs","Flow(pcu/h)","Car","LGV","HGV","Cyc"];
    const widths = [8,8,8,12,8,8,8,8];
    const fmt = (v,w)=>String(v).padStart(w);
    const headerLine = headers.map((h,i)=>fmt(h,widths[i])).join(" ");
    push(headerLine);
    for(const r of state.samples){
      const row=[r.sampleNo.toString(),
                 r.pcu.toFixed(1),
                 r.seconds.toFixed(1),
                 r.flowPcuPerHour.toFixed(1),
                 r.car,
                 r.lgv,
                 r.hgv,
                 r.cycle];
      push(row.map((v,i)=>fmt(v,widths[i])).join(" "));
    }
    const totalPCU = state.samples.reduce((a,b)=>a+b.pcu,0);
    const totalSec = state.samples.reduce((a,b)=>a+b.seconds,0);
    const sumCar = state.samples.reduce((a,b)=>a+b.car,0);
    const sumLGV = state.samples.reduce((a,b)=>a+b.lgv,0);
    const sumHGV = state.samples.reduce((a,b)=>a+b.hgv,0);
    const sumCyc = state.samples.reduce((a,b)=>a+b.cycle,0);
    const flowTotal = totalSec>0 ? (totalPCU/totalSec)*3600 : 0;
    // dashed separator length equals header line length
    push(" " + "─".repeat(headerLine.length-1));
    // Totals row: Sample col shows 'Totals:' (right-aligned), Flow column blank
    const totalsRow = [
      "Totals:",
      totalPCU.toFixed(1),
      totalSec.toFixed(1),
      "".padStart(widths[3]),
      String(sumCar),
      String(sumLGV),
      String(sumHGV),
      String(sumCyc)
    ].map((v,i)=>fmt(v,widths[i])).join(" ");
    push(totalsRow);
    push("");
    push(`Lane Saturation Flow (pcu/h): ${flowTotal.toFixed(1)}`);
    const blob = new Blob(lines, {type: "text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = suggestFileBase()+".txt";
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
  }

  // ----------- Event Wiring -----------
  function wire(){
    // top nav
    btns.tabBtns.forEach(b => { b.addEventListener('click', () => setActiveTab(b.dataset.tab)); });

    btns.startMeasurements.addEventListener('click', () => {
      readSite();
      const dh = document.getElementById('delay-hint');
      if(dh){ dh.textContent = `Counting starts ${state.site.startDelaySec}s after Green`; }
      setActiveTab('measure');
    });

    btns.green.addEventListener('click', () => { if(!state.running) startGreen(); else endSat(); });
    btns.car.addEventListener('click', ()=>incrementPCUBy('car',1));
    btns.lgv.addEventListener('click', ()=>incrementPCUBy('lgv',1.5));
    btns.hgv.addEventListener('click', ()=>incrementPCUBy('hgv',2));
    btns.cycle.addEventListener('click', ()=>incrementPCUBy('cycle',0.5));
    btns.undo.addEventListener('click', undo);
    btns.resetCurrent.addEventListener('click', resetCurrent);
    btns.endSurvey.addEventListener('click', endSurvey);

    btns.exportCSV.addEventListener('click', exportCSV);
    btns.exportTXT.addEventListener('click', exportTXT);

    btns.resetSurvey.addEventListener('click', () => {
      // Clear only Arm/Lane field, keep other site data
      siteForm.arm.value = '';
      state.site.arm = '';

      // reset samples and live displays
      state.samples = [];
      state.currentPCU = 0;
      state.currentCounts = { car: 0, lgv: 0, hgv: 0, cycle: 0 };
      state.actionLog = [];
      display.pcu.textContent = '0';
      display.timer.textContent = '00:00.00';
      renderSamples();
      updateLiveFlow();
      display.resultsBody.innerHTML = '';
      display.summary.innerHTML = '';

      // re-enable measurement controls
      btns.green.disabled = false;
      btns.endSurvey.disabled = false;
      btns.undo.disabled = true;
      btns.resetCurrent.disabled = true;
      btns.car.disabled = true; btns.lgv.disabled = true; btns.hgv.disabled = true; btns.cycle.disabled = true;

      // return to Measurements tab for a fresh run
      setActiveTab('measure');
    });

    // keyboard helpers (on Measurements tab)
    window.addEventListener('keydown', (e) => {
      if(tabs.measure.classList.contains('active')){
        if(e.code === 'Space'){
          e.preventDefault();
          btns.green.click();
        } else if(e.key === '+'){
          e.preventDefault();
          if(!btns.car.disabled) btns.car.click();
        } else if(e.key === '1' || e.key.toLowerCase()==='c'){
          e.preventDefault(); if(!btns.car.disabled) btns.car.click();
        } else if(e.key === '2' || e.key.toLowerCase()==='l'){
          e.preventDefault(); if(!btns.lgv.disabled) btns.lgv.click();
        } else if(e.key === '3' || e.key.toLowerCase()==='h' || e.key.toLowerCase()==='b'){
          e.preventDefault(); if(!btns.hgv.disabled) btns.hgv.click();
        } else if(e.key === '4' || e.key.toLowerCase()==='y'){
          e.preventDefault(); if(!btns.cycle.disabled) btns.cycle.click();
        } else if(e.key.toLowerCase() === 'u'){
          e.preventDefault();
          btns.undo.click();
        } else if(e.key.toLowerCase() === 'r'){
          e.preventDefault();
          btns.resetCurrent.click();
        }
      }
    });
  }

  function init(){
    loadToday();
    wire();
    setActiveTab('site');
  }

  init();
})();
