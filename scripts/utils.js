// scripts/utils.js
export const nowSec=()=>performance.now()/1000;
export const pad=(n,w)=>Number(n).toFixed(2).padStart(w,' ');
export const padInt=(n,w)=>String(n).padStart(w,' ');
export function formatTime(sec){const m=Math.floor(sec/60);const s=(sec%60).toFixed(2).padStart(5,'0');return `${m>0?m+':':''}${s}`;}