// scripts/export_csv.js
// CSV export including Totals row and overall lane flow.

import { state } from './state.js';

// exportCSV() -> void
// Generates and downloads a CSV file with all samples and a Totals row.
export function exportCSV(){
  const s = state.site;
  const lines = [];
  lines.push(`"SATFlow v1.5 (mobile, modular)"`);
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
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `${s.site || 'satflow'}_${s.arm || 'lane'}.csv`; a.click(); URL.revokeObjectURL(a.href);
}
