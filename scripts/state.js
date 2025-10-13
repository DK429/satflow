// scripts/state.js
// Global application state and helpers.

export const state = {
  tab: 'site',
  running: false,
  startTime: 0,
  delaySec: 2,
  counterStart: 0,  // when counting becomes valid (start + delay)
  totalPCU: 0,
  // per-run tallies
  car: 0, lgv: 0, hgv: 0, cyc: 0,
  samples: [],      // { sampleNo, pcu, seconds, flowPcuPerHour, car, lgv, hgv, cycle }
  site: {},         // site header fields
  settings: { haptics: true }
};

// hasSamples() -> boolean
// Returns true if there is at least one completed sample.
export function hasSamples(){ return state.samples.length > 0; }

// resetRunTallies() -> void
// Clears the transient per-run counters.
export function resetRunTallies(){
  state.totalPCU = 0;
  state.car = 0; state.lgv = 0; state.hgv = 0; state.cyc = 0;
  state.counterStart = 0;
}
