// scripts/measure.js
import { state, resetRunTallies } from './state.js';
import { nowSec, formatTime } from './utils.js';
import { btns, ui, toggleVeh } from './dom.js';
import { haptic } from './haptics.js';
import { renderResults, updateLastSampleSummary } from './results.js';

let rafId=null;
function tick(){
  if(!state.running) return;
  const elapsed=nowSec()-state.startTime;
  ui.timer.textContent=formatTime(elapsed);
  rafId=requestAnimationFrame(tick);
}

export function startGreen(){
  if(state.running) return;
  haptic(60);
  state.running=true;
  state.startTime=nowSec();
  resetRunTallies();
  ui.pcu.textContent='0';
  btns.green.style.display='none';
  btns.endSat.style.display='';
  document.body.classList.add('counting');
  document.body.classList.remove('idle');
  toggleVeh(true);
  setTimeout(()=>{
    if(state.running){
      state.counterStart=nowSec();
      toggleVeh(false);
    }
  }, state.delaySec*1000);
  tick();
}

export function endSat(){
  if(!state.running) return;
  haptic(90);
  state.running=false;
  if(rafId){ cancelAnimationFrame(rafId); rafId=null; }
  const totalSec=nowSec()-state.startTime;
  const effSeconds=Math.max(0,totalSec-state.delaySec);
  const pcu=state.totalPCU;
  const flow=effSeconds>0 ? (pcu/effSeconds)*3600 : 0;
  const sampleNo=state.samples.length+1;
  state.samples.push({ sampleNo, pcu, seconds: effSeconds, flowPcuPerHour: flow,
                       car: state.car, lgv: state.lgv, hgv: state.hgv, cycle: state.cyc });
  resetRunTallies();
  btns.green.style.display='';
  btns.endSat.style.display='none';
  toggleVeh(true);
  document.body.classList.remove('counting');
  document.body.classList.add('idle');
  renderResults();
  updateLastSampleSummary();
  ui.timer.textContent='00:00.00';
  ui.pcu.textContent='0';
}

export function incrementPCUBy(type, delta){
  haptic(35);
  if(!state.running || !state.counterStart || nowSec() < state.counterStart) return;
  state.totalPCU=+(state.totalPCU+delta).toFixed(1);
  state[type]=(state[type]||0)+1;
  ui.pcu.textContent=state.totalPCU.toFixed(1);
  const eff=nowSec()-state.counterStart;
  if(eff>0){ ui.liveFlow.textContent=((state.totalPCU/eff)*3600).toFixed(0); }
}