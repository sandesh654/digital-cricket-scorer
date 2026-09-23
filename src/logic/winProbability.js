// winProbability.js — Win Probability Calculator
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

export const calculateWinProbability = ({
  runsScored,       // runs scored so far in 2nd innings
  wicketsFallen,    // wickets fallen in 2nd innings
  ballsBowled,      // legal balls bowled in 2nd innings
  target,           // target score (1st innings total + 1)
  totalOvers,       // total overs in the match
}) => {

  // ── VALIDATION ──────────────────────────────────────────────────────────────
  // Return 50/50 if match has not started yet
  if (ballsBowled === 0 || !target) return 50;

  const totalBalls    = totalOvers * 6;
  const ballsRemaining = totalBalls - ballsBowled;
  const runsNeeded    = target - runsScored;
  const wicketsLeft   = 10 - wicketsFallen;

  // ── CHECK WIN/LOSS CONDITIONS ────────────────────────────────────────────────
  // Batting team has won
  if (runsScored >= target) return 100;

  // All out or no balls remaining — batting team lost
  if (wicketsFallen >= 10 || ballsRemaining <= 0) return 0;

  // ── CALCULATE KEY METRICS ───────────────────────────────────────────────────
  // Current run rate — runs per over scored so far
  const currentRR = runsScored / (ballsBowled / 6);

  // Required run rate — runs per over needed to win
  const requiredRR = runsNeeded / (ballsRemaining / 6);

  // Run rate ratio — how does current RR compare to required RR
  // Greater than 1 means batting team is ahead of required rate
  const rrRatio = currentRR / requiredRR;

  // Wicket resource factor — more wickets remaining = better position
  // Ranges from 0 (all out) to 1 (no wickets lost)
  const wicketFactor = wicketsLeft / 10;

  // Balls remaining factor — more balls remaining = more opportunity
  // Ranges from 0 (no balls left) to 1 (full innings remaining)
  const ballsFactor = ballsRemaining / totalBalls;

  // ── CALCULATE BASE PROBABILITY ───────────────────────────────────────────────
  // Start with run rate comparison as the primary factor
  // sigmoid function converts ratio to probability-like value
  let baseProbability = sigmoid(rrRatio - 1, 3);

  // ── APPLY WICKET PENALTY ────────────────────────────────────────────────────
  // Fewer wickets = lower win probability
  // This penalty increases as more wickets fall
  const wicketPenalty = (1 - wicketFactor) * 0.3;
  baseProbability = baseProbability - wicketPenalty;

  // ── APPLY MATCH PHASE FACTOR ─────────────────────────────────────────────────
  // In early overs — result is more uncertain, pull toward 50%
  // In death overs — result is more certain, move away from 50%
  const progressFactor = ballsBowled / totalBalls;

  // Early in innings: blend toward 50% (high uncertainty)
  // Late in innings: blend toward extreme values (low uncertainty)
  baseProbability = blend(baseProbability, 0.5, 1 - progressFactor * 0.6);

  // ── CLAMP TO 0-100 RANGE ─────────────────────────────────────────────────────
  const probability = Math.max(2, Math.min(98, baseProbability * 100));

  return Math.round(probability);
};

// ── HELPER: SIGMOID FUNCTION ──────────────────────────────────────────────────
// Converts a ratio to a smooth 0-1 probability curve
// steepness controls how quickly probability changes
const sigmoid = (x, steepness = 2) => {
  return 1 / (1 + Math.exp(-steepness * x));
};

// ── HELPER: BLEND TWO VALUES ──────────────────────────────────────────────────
// Blends value a toward value b by factor t (0 = no blend, 1 = full blend)
const blend = (a, b, t) => {
  return a * (1 - t) + b * t;
};

// ── GET PROBABILITY DESCRIPTION ───────────────────────────────────────────────
// Returns a human-readable description of the current match situation
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

// ── GET COLOUR FOR PROBABILITY BAR ────────────────────────────────────────────
// Returns a colour based on the batting team's win probability
export const getProbabilityColour = (probability) => {
  if (probability >= 65) return '#1D9E75'; // green — batting team winning
  if (probability >= 45) return '#F0A500'; // amber — close match
  return '#E24B4A';                         // red — batting team losing
};