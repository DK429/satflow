// scripts/export_csv.js
import { state } from './state.js';
import { APP_VERSION } from './version.js';
const csvCell = value => '"' + String(value ?? '').replace(/"/g, '""') + '"';
const csvRow = values => values.map(csvCell).join(',');
export function exportCSV(){
  const s=state.site;const lines=[];
  lines.push(csvRow([`SATFlow v${APP_VERSION} (mobile, modular)`]));
  lines.push(csvRow(['Site',s.site]));
  lines.push(csvRow(['Junction',s.junction]));
  lines.push(csvRow(['Arm/Lane',s.arm]));
  lines.push(csvRow(['Surveyor',s.surveyor]));
  lines.push(csvRow(['Date',s.date]));
  lines.push(csvRow(['Start-up Delay (s)',state.delaySec]));
  lines.push(csvRow(['Notes',s.notes]));
  lines.push("");
  lines.push("Sample,PCU,Seconds,Flow (pcu/h),Car,LGV,HGV,Cycle");
  for(const r of state.samples){
    lines.push(`${r.sampleNo},${r.pcu},${r.seconds.toFixed(2)},${r.flowPcuPerHour.toFixed(1)},${r.car},${r.lgv},${r.hgv},${r.cycle}`);
  }
  const totalPCU=state.samples.reduce((a,b)=>a+b.pcu,0);
  const totalEffSec=state.samples.reduce((a,b)=>a+b.seconds,0);
  const sumCar=state.samples.reduce((a,b)=>a+b.car,0);
  const sumLGV=state.samples.reduce((a,b)=>a+b.lgv,0);
  const sumHGV=state.samples.reduce((a,b)=>a+b.hgv,0);
  const sumCyc=state.samples.reduce((a,b)=>a+b.cycle,0);
  const flowTotal=totalEffSec>0?(totalPCU/totalEffSec)*3600:0;
  lines.push(`Totals,${totalPCU.toFixed(1)},${totalEffSec.toFixed(1)},,${sumCar},${sumLGV},${sumHGV},${sumCyc}`);
  lines.push(`"Lane Saturation Flow (pcu/h)",${flowTotal.toFixed(1)}`);
  const blob=new Blob([lines.join("\r\n")],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`${s.site||'satflow'}_${s.arm||'lane'}.csv`;a.click();URL.revokeObjectURL(a.href);
}
