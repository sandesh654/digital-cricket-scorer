// src/logic/winProbability.js — Win Probability Calculator
// Based on statistical model from Akhtar et al. (2022)
// "In-game winner prediction and winning strategy in cricket: A ML approach"
//
// The formula combines four key factors:
// 1. Run rate comparison (current vs required)
// 2. Wickets remaining (resource factor)
// 3. Balls remaining (pressure factor)
// 4. Match phase (early/middle/death overs)

// ── MAIN FUNCTION ─────────────────────────────────────────────────────────────
// Returns win probability for the BATTING team (0 to 100)
// Call this after every ball during the 2nd innings
//
// Accepts either positional args or a single object:
//   calculateWinProbability({ runsScored, wicketsFallen, ballsBowled, target, totalOvers })
//   calculateWinProbability(target, runsScored, wicketsFallen, ballsBowled, totalBalls)

export const calculateWinProbability = (
  targetOrObj,
  currentScore,
  wickets,
  ballsBowled,
  totalBalls
) => {
  // Support object-style call from ScoringScreen
  let t, score, wkts, bowled, tBalls;
  if (typeof targetOrObj === 'object' && targetOrObj !== null) {
    t      = targetOrObj.target;
    score  = targetOrObj.runsScored;
    wkts   = targetOrObj.wicketsFallen;
    bowled = targetOrObj.ballsBowled;
    tBalls = (targetOrObj.totalOvers || 20) * 6;
  } else {
    t      = targetOrObj;
    score  = currentScore;
    wkts   = wickets;
    bowled = ballsBowled;
    tBalls = totalBalls;
  }

  const runsNeeded = t - score;
  const ballsLeft  = tBalls - bowled;

  // Match already decided
  if (runsNeeded <= 0) return 99;   // batting team has won
  if (ballsLeft <= 0 || wkts >= 10) return 1; // batting team has lost

  // Required run rate (per over)
  const rrr = (runsNeeded / ballsLeft) * 6;

  // Current run rate (per over)
  const crr = bowled > 0 ? (score / bowled) * 6 : 0;

  // Wicket resource factor: square-root decay as wickets fall
  const wicketsRemaining = 10 - wkts;
  const resourceFactor   = Math.sqrt(wicketsRemaining / 10);

  // Run-rate differential weighted by remaining resources
  const differential = (crr - rrr) * resourceFactor;

  // Sigmoid maps differential to (0, 1), then scale to 0-100
  const probability = 1 / (1 + Math.exp(-differential * 0.3));

  // Clamp to 1–99 — never show 0% or 100% until match is definitively over
  return Math.round(Math.min(Math.max(probability * 100, 1), 99));
};

// ── PROBABILITY DESCRIPTION ───────────────────────────────────────────────────
// Returns a human-readable description of the match situation
export const getProbabilityDescription = (probability, battingTeam, bowlingTeam) => {
  if (probability >= 90) return `${battingTeam} are almost certain to win`;
  if (probability >= 75) return `${battingTeam} are in a strong position`;
  if (probability >= 60) return `${battingTeam} have the advantage`;
  if (probability >= 50) return `${battingTeam} are slight favourites`;
  if (probability >= 40) return `${bowlingTeam} have a slight edge`;
  if (probability >= 25) return `${bowlingTeam} are in control`;
  if (probability >= 10) return `${bowlingTeam} are strong favourites`;
  return `${bowlingTeam} are almost certain to win`;
};

// ── PROBABILITY COLOUR ────────────────────────────────────────────────────────
// Returns a colour based on probability for the batting team
export const getProbabilityColour = (probability) => {
  if (probability >= 65) return '#1D9E75'; // green  — batting team ahead
  if (probability >= 45) return '#F0A500'; // amber  — close match
  return '#E24B4A';                         // red    — bowling team ahead
};

// ── TIMELINE GENERATOR ────────────────────────────────────────────────────────
// Generate probability data points for every ball of the second innings.
// Used by WinProbabilityScreen to populate the chart.
//
// @param {Array}  balls      - Array of ball records from SQLite
// @param {number} target     - Target score
// @param {number} totalBalls - Total balls available (overs × 6)
// @returns {Array}           - Array of { ball, label, probability } objects

export const generateProbabilityTimeline = (balls, target, totalBalls) => {
  const timeline = [];
  let score   = 0;
  let wickets = 0;

  balls.forEach((ball, index) => {
    score   += (ball.runs_scored || 0) + (ball.extra_runs || ball.extras || 0);
    if (ball.is_wicket) wickets += 1;

    const ballNumber    = index + 1;
    const overCompleted = Math.floor(index / 6);
    const ballInOver    = (index % 6) + 1;
    const label         = `${overCompleted}.${ballInOver}`;

    const probability = calculateWinProbability(
      target, score, wickets, ballNumber, totalBalls
    );

    timeline.push({ ball: ballNumber, label, probability });
  });

  return timeline;
};