// scripts/utils.js
export const nowSec=()=>performance.now()/1000;
export const pad=(n,w)=>Number(n).toFixed(2).padStart(w,' ');
export const padInt=(n,w)=>String(n).padStart(w,' ');
export function formatTime(sec){const m=Math.floor(sec/60);const s=(sec%60).toFixed(2).padStart(5,'0');return `${m>0?m+':':''}${s}`;}
export function todayISO(){const d=new Date();const m=String(d.getMonth()+1).padStart(2,'0');const day=String(d.getDate()).padStart(2,'0');return `${d.getFullYear()}-${m}-${day}`;}
