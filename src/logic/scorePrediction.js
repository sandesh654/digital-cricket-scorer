// src/logic/scorePrediction.js — 1st Innings Score Predictor
//
// Predicts the likely final score during the 1st innings using:
//   1. Current run rate projected forward
//   2. Wicket-based resource adjustment (teams lose runs as wickets fall)
//   3. Phase adjustment (death overs typically score faster)
//
// Returns a { low, mid, high } range so we show e.g. "Projected: 145–165"

// Resource table: how much of the remaining batting resource is left
// based on wickets fallen. Derived from Duckworth-Lewis resource values.
const RESOURCE_BY_WICKETS = [1.0, 0.92, 0.83, 0.74, 0.64, 0.53, 0.42, 0.31, 0.20, 0.10, 0.0];

// Phase multipliers — overs 1-6 (powerplay), 7-15 (middle), 16-20 (death)
const getPhaseMultiplier = (currentOver, totalOvers) => {
  const progressPct = currentOver / totalOvers;
  if (progressPct < 0.3)  return 0.92; // powerplay: tend to be cautious
  if (progressPct < 0.75) return 1.0;  // middle overs: baseline
  return 1.12;                          // death overs: batting team accelerates
};

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
// @param {number} currentRuns     - Runs scored so far
// @param {number} currentWickets  - Wickets fallen so far
// @param {number} ballsBowled     - Legal balls bowled so far
// @param {number} totalOvers      - Match overs (e.g. 20)
//
// @returns {{ low: number, mid: number, high: number } | null}
//   null if not enough balls have been bowled to make a meaningful prediction

export const predictFinalScore = (currentRuns, currentWickets, ballsBowled, totalOvers) => {
  const totalBalls = totalOvers * 6;

  // Need at least 1 over before predicting
  if (ballsBowled < 6) return null;

  const ballsRemaining = totalBalls - ballsBowled;
  if (ballsRemaining <= 0) return null;

  // Current run rate per ball
  const crpb = currentRuns / ballsBowled;

  // Resource factor: how much batting resource is left
  const wicketsClipped  = Math.min(Math.max(currentWickets, 0), 10);
  const resourceFactor  = RESOURCE_BY_WICKETS[wicketsClipped];

  // Phase multiplier
  const currentOver       = Math.floor(ballsBowled / 6);
  const phaseMultiplier   = getPhaseMultiplier(currentOver, totalOvers);

  // Base projected additional runs
  const projectedExtra = crpb * ballsRemaining * resourceFactor * phaseMultiplier;

  const mid  = Math.round(currentRuns + projectedExtra);
  const low  = Math.round(currentRuns + projectedExtra * 0.88);
  const high = Math.round(currentRuns + projectedExtra * 1.12);

  return { low, mid, high };
};

// ── DISPLAY HELPER ────────────────────────────────────────────────────────────
// Returns a string like "158" or null if too early to predict
export const getPredictionDisplay = (currentRuns, currentWickets, ballsBowled, totalOvers) => {
  const pred = predictFinalScore(currentRuns, currentWickets, ballsBowled, totalOvers);
  if (!pred) return null;
  return `${pred.mid}`;
};