// scripts/state.js
export const state = {
  tab:'site',
  running:false,
  startTime:0,
  delaySec:2,
  counterStart:0,
  totalPCU:0,
  car:0, lgv:0, hgv:0, cyc:0,
  samples:[],
  site:{},
  settings:{haptics:true}
};
export function hasSamples(){ return state.samples.length>0; }
export function resetRunTallies(){
  state.totalPCU=0; state.car=0; state.lgv=0; state.hgv=0; state.cyc=0; state.counterStart=0;
}