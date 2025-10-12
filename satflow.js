/* SATFlow logic — DK Coding (v1.1 mobile)
   - Minimal measurement UI (timer + count + live flow)
   - Controls only on Measurements tab; fade in/out
   - Active: 2x2 vehicle grid + bottom End-of-Sat
   - Delay-deducted seconds recorded per sample; flows use effective seconds
   - TXT export: fixed-width columns with totals row
   - NEW: Running "Last Sample" flow on Measurements (idle only)
   - NEW: Post-sample admin: End Survey + Delete Last Sample
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
    enableAt: 0,
    tickHandle: null,
    currentPCU: 0,
    currentCounts: { car: 0, lgv: 0, hgv: 0, cycle: 0 },
    actionLog: [], // for accurate undo during counting
    samples: [], // { sampleNo, pcu, seconds, flowPcuPerHour, car, lgv, hgv, cycle }
    settings: { haptics: true }
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
    endOfSat: document.getElementById('end-of-sat-btn'),
    car: document.getElementById('btn-car'),
    lgv: document.getElementById('btn-lgv'),
    hgv: document.getElementById('btn-hgv'),
    cycle: document.getElementById('btn-cycle'),
    endSurvey: document.getElementById('end-survey-btn'),
    deleteLast: document.getElementById('delete-last-btn'),
    exportCSV: document.getElementById('export-csv'),
    exportTXT: document.getElementById('export-txt'),
    resetCurrentResults: document.getElementById('reset-current-btn'),
    resetSurvey: document.getElementById('reset-survey-btn'),
    hapticsToggle: document.getElementById('haptics-toggle')
  };

  const display = {
    timer: document.getElementById('timer-display'),
    pcu: document.getElementById('pcu-display'),
    liveFlow: document.getElementById('live-flow'),
    resultsBody: document.getElementById('results-body'),
    summary: document.getElementById('summary'),
    lastSampleWrap: document.getElementById('last-sample'),
    lastFlow: document.getElementById('last-flow'),
    lastSampleNo: document.getElementById('last-sample-no')
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
  function haptic(ms){ try{ if(state.settings?.haptics && 'vibrate' in navigator) navigator.vibrate(ms); }catch(e){} }

  function setActiveTab(tabName){
    Object.values(tabs).forEach(el => el.classList.remove('active'));
    tabs[tabName].classList.add('active');
    btns.tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab===tabName));
    // toggle dock visibility
    const dock = document.getElementById('dock');
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

  function updateLastSampleSummary(){
    if(state.samples.length === 0){
      display.lastSampleWrap.style.display = 'none';
      return;
    }
    const last = state.samples[state.samples.length - 1];
    display.lastFlow.textContent = last.flowPcuPerHour.toFixed(1) + ' pcu/h';
    display.lastSampleNo.textContent = '#' + last.sampleNo;
    display.lastSampleWrap.style.display = '';
  }

  // ----------- Measurements Logic -----------
  function startGreen(){ haptic(60);
    if(state.running) return;
    state.running = true;
    state.startTs = nowSec();
    state.enableAt = state.startTs + (state.site.startDelaySec ?? 2);
    state.currentPCU = 0;
    state.currentCounts = { car: 0, lgv: 0, hgv: 0, cycle: 0 };
    state.actionLog = [];
    display.pcu.textContent = '0';
    display.timer.textContent = '00:00.00';

    document.body.classList.remove('idle');
    document.body.classList.add('counting');

    // vehicle buttons enable after delay in the tick loop
    btns.car.disabled = true; btns.lgv.disabled = true; btns.hgv.disabled = true; btns.cycle.disabled = true;

    state.tickHandle = setInterval(()=>{
      const tnow = nowSec();
      display.timer.textContent = fmtSeconds(tnow - state.startTs);
      const allow = tnow >= state.enableAt;
      btns.car.disabled = !allow;
      btns.lgv.disabled = !allow;
      btns.hgv.disabled = !allow;
      btns.cycle.disabled = !allow;
    }, 50);
  }

  function endSat(){ haptic(90);
    if(!state.running) return;
    state.running = false;
    const duration = Math.max(0, nowSec() - state.startTs);
    clearInterval(state.tickHandle); state.tickHandle = null;

    const sampleNo = state.samples.length + 1;
    const pcu = state.currentPCU;
    const rawSeconds = duration;
    const effSeconds = Math.max(0, rawSeconds - (state.site.startDelaySec ?? 2));
    const flow = effSeconds > 0 ? (pcu / effSeconds) * 3600 : 0;
    const {car, lgv, hgv, cycle} = state.currentCounts;

    state.samples.push({ sampleNo, pcu, seconds: effSeconds, flowPcuPerHour: flow, car, lgv, hgv, cycle });

    // reset for next
    state.currentPCU = 0;
    state.currentCounts = { car: 0, lgv: 0, hgv: 0, cycle: 0 };
    state.actionLog = [];
    display.pcu.textContent = '0';
    display.timer.textContent = '00:00.00';

    document.body.classList.remove('counting');
    document.body.classList.add('idle');

    updateLiveFlow();
    updateLastSampleSummary();
  }

  function incrementPCUBy(type, delta){ haptic(35);
    if(!state.running || nowSec() < state.enableAt) return;
    state.currentPCU = +(state.currentPCU + delta).toFixed(1);
    state.currentCounts[type] += 1;
    state.actionLog.push({ type, delta });
    display.pcu.textContent = String(state.currentPCU);
  }

  function undo(){
    if(state.running){
      const last = state.actionLog.pop();
      if(last){ haptic(40);
        state.currentPCU = Math.max(0, +(state.currentPCU - last.delta).toFixed(1));
        state.currentCounts[last.type] = Math.max(0, state.currentCounts[last.type] - 1);
        display.pcu.textContent = String(state.currentPCU);
      }
    } else if(state.samples.length > 0){
      // Undo last completed sample
      state.samples.pop();
      updateLiveFlow();
      updateLastSampleSummary();
      renderResults();
    }
  }

  function deleteLastSample(){ haptic(50);
    if(state.running) return; // avoid conflicts
    if(state.samples.length > 0){
      state.samples.pop();
      updateLiveFlow();
      updateLastSampleSummary();
      renderResults();
    }
  }

  function resetCurrent(){
    // Clears all recorded samples & results (keeps site info) — used from Results tab
    state.samples = [];
    state.currentPCU = 0;
    state.currentCounts = { car: 0, lgv: 0, hgv: 0, cycle: 0 };
    state.actionLog = [];
    display.pcu.textContent = '0';
    display.timer.textContent = '00:00.00';
    display.summary.innerHTML = '';
    display.resultsBody.innerHTML = '';
    updateLiveFlow();
    updateLastSampleSummary();
    setActiveTab('measure');
  }

  function updateLiveFlow(){
    const totalPCU = state.samples.reduce((a,b)=>a+b.pcu,0);
    const totalEffSec = state.samples.reduce((a,b)=>a+b.seconds,0); // effective seconds
    const flow = totalEffSec>0 ? (totalPCU/totalEffSec)*3600 : NaN;
    display.liveFlow.textContent = isFinite(flow) ? flow.toFixed(1) : '—';
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
    const totalEffSec = s.reduce((a,b)=>a+b.seconds,0);
    const flowTotal = totalEffSec>0 ? (totalPCU/totalEffSec)*3600 : 0;
    const meanOfRates = s.length>0 ? (s.reduce((a,b)=>a+b.flowPcuPerHour,0)/s.length) : 0;

    const header = siteHeader();
    const delay = state.site.startDelaySec;
    display.summary.innerHTML = `
      <div><strong>${header}</strong></div>
      <div style="margin-top:8px">
        Samples: <span class="mono">${s.length}</span> ·
        Total PCU: <span class="mono">${totalPCU}</span> ·
        Total Seconds (eff): <span class="mono">${totalEffSec.toFixed(2)}</span> ·
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
    lines.push(`"SATFlow v1.1 (mobile)"`);
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
    const totalEffSec = state.samples.reduce((a,b)=>a+b.seconds,0);
    const flowTotal = totalEffSec>0 ? (totalPCU/totalEffSec)*3600 : 0;
    lines.push("");
    lines.push(`"Lane Saturation Flow (pcu/h)",${flowTotal.toFixed(1)}`);
    downloadText(lines.join("\\r\\n"), suggestFileBase()+".csv", "text/csv");
  }

  function exportTXT(){
    const s = state.site;
    const lines = [];
    const push = t => lines.push(t + "\\r\\n");
    push("SATFlow v1.1 (mobile)");
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
    const totalEffSec = state.samples.reduce((a,b)=>a+b.seconds,0);
    const sumCar = state.samples.reduce((a,b)=>a+b.car,0);
    const sumLGV = state.samples.reduce((a,b)=>a+b.lgv,0);
    const sumHGV = state.samples.reduce((a,b)=>a+b.hgv,0);
    const sumCyc = state.samples.reduce((a,b)=>a+b.cycle,0);
    const flowTotal = totalEffSec>0 ? (totalPCU/totalEffSec)*3600 : 0;
    push(" " + "─".repeat(headerLine.length-1));
    const totalsRow = [
      "Totals:",
      totalPCU.toFixed(1),
      totalEffSec.toFixed(1),
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
    // tabs
    btns.tabBtns.forEach(b => { b.addEventListener('click', () => setActiveTab(b.dataset.tab)); });

    btns.startMeasurements.addEventListener('click', () => {
      readSite();
      const dh = document.getElementById('delay-hint');
      if(dh){ dh.textContent = `Counting starts ${state.site.startDelaySec}s after Green`; }
      setActiveTab('measure');
      updateLastSampleSummary();
    });

    btns.green.addEventListener('click', () => { if(!state.running) startGreen(); });
    btns.endOfSat.addEventListener('click', endSat);

    btns.car.addEventListener('click', ()=>incrementPCUBy('car',1));
    btns.lgv.addEventListener('click', ()=>incrementPCUBy('lgv',1.5));
    btns.hgv.addEventListener('click', ()=>incrementPCUBy('hgv',2));
    btns.cycle.addEventListener('click', ()=>incrementPCUBy('cycle',0.5));

    btns.endSurvey.addEventListener('click', () => { haptic(40); if(state.running) endSat(); renderResults(); setActiveTab('results'); });
    btns.deleteLast.addEventListener('click', deleteLastSample);

    btns.exportCSV.addEventListener('click', exportCSV);
    btns.exportTXT.addEventListener('click', exportTXT);
    btns.resetCurrentResults.addEventListener('click', resetCurrent);
    btns.resetSurvey.addEventListener('click', () => {
      siteForm.arm.value = '';
      state.site.arm = '';
      resetCurrent();
    });

    // keyboard helpers
    window.addEventListener('keydown', (e) => {
      if(tabs.measure.classList.contains('active')){
        if(e.code === 'Space'){
          e.preventDefault();
          (state.running ? btns.endOfSat : btns.green).click();
        } else if(e.key === '+' || e.key === '1' || e.key.toLowerCase()==='c'){
          e.preventDefault(); if(!btns.car.disabled) btns.car.click();
        } else if(e.key === '2' || e.key.toLowerCase()==='l'){
          e.preventDefault(); if(!btns.lgv.disabled) btns.lgv.click();
        } else if(e.key === '3' || e.key.toLowerCase()==='h' || e.key.toLowerCase()==='b'){
          e.preventDefault(); if(!btns.hgv.disabled) btns.hgv.click();
        } else if(e.key === '4' || e.key.toLowerCase()==='y'){
          e.preventDefault(); if(!btns.cycle.disabled) btns.cycle.click();
        } else if(e.key.toLowerCase() === 'u'){
          e.preventDefault();
          // Undo last increment while counting, or last sample if idle
          if(state.running) {
            const evt = new Event('click'); // no-op; call function directly to avoid prevention
            undo();
          } else {
            undo();
          }
        }
      }
    });

    // Disable End Survey while counting for safety
    const updateSafety = () => { btns.endSurvey.disabled = document.body.classList.contains('counting'); };
    const mo = new MutationObserver(updateSafety);
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    updateSafety();
  }

  function init(){
    // restore settings
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
    document.body.classList.add('idle');
    loadToday();
    wire();
    setActiveTab('site');
  }

  init();
})();
