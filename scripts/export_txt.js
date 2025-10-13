// scripts/export_txt.js
// Fixed-width, line-by-line TXT export with CRLF line endings and Totals row.

import { state } from './state.js';
import { pad, padInt } from './utils.js';

// exportTXT() -> void
// Generates and downloads the TXT summary in monospaced columns.
export function exportTXT(){
  const s = state.site;
  const lines = [];
  const push = t => lines.push(t + "\r\n");
  push(`SATFlow v1.5.1 (mobile, modular)`);
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
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `${s.site || 'satflow'}_${s.arm || 'lane'}.txt`; a.click(); URL.revokeObjectURL(a.href);
}
