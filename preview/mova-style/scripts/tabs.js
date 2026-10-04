// scripts/tabs.js
import { state } from './state.js';
import { btns } from './dom.js';
export function setActiveTab(tab){
  state.tab=tab;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
  const dock=document.getElementById('dock');
  if(!dock)return;
  if(tab==='measure'){
    dock.classList.remove('controls-hidden');
    document.body.classList.add('dock-visible','idle');
    document.body.classList.remove('counting');
    btns.green.style.display='';
    btns.endSat.style.display='none';
    document.body.classList.toggle('has-samples', state.samples.length>0);
  }else{
    dock.classList.add('controls-hidden');
    document.body.classList.remove('dock-visible');
  }
}
