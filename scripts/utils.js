// scripts/utils.js
// Time and formatting helpers used across modules.

// nowSec() -> number
// Returns high-resolution current time in seconds.
export const nowSec = () => performance.now()/1000;

// pad(n, w) -> string
// Formats a number to 2 decimals and right-aligns to width w.
export const pad = (n,w)=>Number(n).toFixed(2).padStart(w,' ');

// padInt(n, w) -> string
// Right-aligns an integer (or string) to width w.
export const padInt = (n,w)=>String(n).padStart(w,' ');

// formatTime(sec) -> string "MM:SS.cc"
// Formats seconds as minutes:seconds.centiseconds for the timer display.
export function formatTime(sec){
  const m = Math.floor(sec/60);
  const s = (sec % 60).toFixed(2).padStart(5,'0');
  return `${m>0?m+':':''}${s}`;
}
