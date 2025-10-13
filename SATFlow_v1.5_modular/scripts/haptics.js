// scripts/haptics.js
// Safe haptic feedback; gated by settings and feature detection.

import { state } from './state.js';

// haptic(ms) -> void
// Vibrates for ms milliseconds if enabled and supported.
export function haptic(ms){
  try{ if(state.settings?.haptics && 'vibrate' in navigator) navigator.vibrate(ms); }catch(e){}
}

// restoreSetting(toggleEl) -> void
// Restores haptic setting from localStorage and wires the checkbox toggle.
export function restoreSetting(toggleEl){
  try{
    const raw = localStorage.getItem('satflow_settings');
    if(raw){
      const parsed = JSON.parse(raw);
      if(typeof parsed.haptics === 'boolean') state.settings.haptics = parsed.haptics;
    }
  }catch(e){}
  if(toggleEl){
    toggleEl.checked = !!state.settings.haptics;
    toggleEl.addEventListener('change', ()=>{
      state.settings.haptics = !!toggleEl.checked;
      try{ localStorage.setItem('satflow_settings', JSON.stringify(state.settings)); }catch(e){}
    });
  }
}
