// scripts/results.js
// Rendering of results table, totals row, and last-sample summary.

import { state, hasSamples } from './state.js';
import { ui } from './dom.js';

// renderResults() -> void
// Paints the samples table and totals row. Also updates the lane flow summary.
export function renderResults(){
  const s = state.samples;
  ui.resultsBody.innerHTML = s.map(r=>`
    <tr>
      <td>${r.sampleNo}</td>
      <td>${r.pcu.toFixed(1)}</td>
      <td>${r.seconds.toFixed(2)}</td>
      <td>${r.flowPcuPerHour.toFixed(1)}</td>
      <td>${r.car}</td>
      <td>${r.lgv}</td>
      <td>${r.hgv}</td>
      <td>${r.cycle}</td>
    </tr>`).join('');

  const totalPCU = s.reduce((a,b)=>a+b.pcu,0);
  const totalEffSec = s.reduce((a,b)=>a+b.seconds,0);
  const sumCar = s.reduce((a,b)=>a+b.car,0);
  const sumLGV = s.reduce((a,b)=>a+b.lgv,0);
  const sumHGV = s.reduce((a,b)=>a+b.hgv,0);
  const sumCyc = s.reduce((a,b)=>a+b.cycle,0);
  const flowTotal = totalEffSec>0 ? (totalPCU/totalEffSec)*3600 : 0;

  ui.totalsRow.innerHTML =
    `<td><strong>Totals:</strong></td>
     <td><strong>${totalPCU.toFixed(1)}</strong></td>
     <td><strong>${totalEffSec.toFixed(1)}</strong></td>
     <td></td>
     <td><strong>${sumCar}</strong></td>
     <td><strong>${sumLGV}</strong></td>
     <td><strong>${sumHGV}</strong></td>
     <td><strong>${sumCyc}</strong></td>`;

  ui.summary.innerHTML = `Lane Saturation Flow (pcu/h): <strong>${flowTotal.toFixed(1)}</strong>`;
}

// updateLastSampleSummary() -> void
// Shows a small one-line summary of the most recent sample (when idle).
export function updateLastSampleSummary(){
  if(!hasSamples()){ ui.lastWrap.style.display = 'none'; return; }
  const last = state.samples[state.samples.length-1];
  ui.lastFlow.textContent = last.flowPcuPerHour.toFixed(1);
  ui.lastNo.textContent = last.sampleNo;
  ui.lastWrap.style.display = '';
}

// deleteLastSample() -> void
// Removes the last saved sample and repaints the results.
export function deleteLastSample(){
  if(state.running || !hasSamples()) return;
  state.samples.pop();
  renderResults();
  updateLastSampleSummary();
}
