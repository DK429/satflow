// scripts/haptics.js
// Haptic helper with iPhone-safe fallback (visual pulse).
// iOS Safari doesn't expose navigator.vibrate; we emulate feedback via a short button pulse.
import { state } from './state.js';

function supportsVibrate(){ try { return 'vibrate' in navigator; } catch(e){ return false; } }

// haptic(ms, el?) -> best-effort feedback
export function haptic(ms=40, el){
  if(!(state.settings?.haptics)) return;
  if(supportsVibrate()){
    try{ navigator.vibrate(ms); return; }catch(e){ /* fall through to pulse */ }
  }
  if(el){ // visual pulse fallback
    el.classList.add('pulse');
    setTimeout(()=>el.classList.remove('pulse'), 140);
  }
}

// restoreSetting(toggleEl) -> load + persist checkbox
export function restoreSetting(toggleEl){
  try{
    const raw=localStorage.getItem('satflow_settings');
    if(raw){ const p=JSON.parse(raw); if(typeof p.haptics==='boolean') state.settings.haptics=p.haptics; }
  }catch(e){}
  if(toggleEl){
    toggleEl.checked = !!state.settings.haptics;
    toggleEl.addEventListener('change', ()=>{
      state.settings.haptics = !!toggleEl.checked;
      try{ localStorage.setItem('satflow_settings', JSON.stringify(state.settings)); }catch(e){}
    });
  }
}

