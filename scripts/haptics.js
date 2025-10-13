// scripts/haptics.js
import { state } from './state.js';
export function haptic(ms){try{if(state.settings?.haptics&&'vibrate'in navigator)navigator.vibrate(ms);}catch(e){}}
export function restoreSetting(toggleEl){
  try{const raw=localStorage.getItem('satflow_settings');if(raw){const p=JSON.parse(raw);if(typeof p.haptics==='boolean')state.settings.haptics=p.haptics;}}catch(e){}
  if(toggleEl){toggleEl.checked=!!state.settings.haptics;toggleEl.addEventListener('change',()=>{
    state.settings.haptics=!!toggleEl.checked;
    try{localStorage.setItem('satflow_settings',JSON.stringify(state.settings));}catch(e){}
  });}
}