// scripts/audio.js
let ctx=null;
function ensureCtx(){
  if(!ctx){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) return null;
    ctx=new AC();
  }
  return ctx;
}
export function click(){
  const audio=ensureCtx();
  if(!audio) return;
  if(audio.state==='suspended'){ audio.resume().then(()=>play(audio)).catch(()=>{}); } else { play(audio); }
}
function play(audio){
  const t=audio.currentTime;
  const o=audio.createOscillator();
  const g=audio.createGain();
  o.type='square'; o.frequency.setValueAtTime(800,t);
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(0.2,t+0.005);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.06);
  o.connect(g).connect(audio.destination);
  o.start(t); o.stop(t+0.07);
}
