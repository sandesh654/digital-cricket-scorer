// src/services/claudeAnalysis.js — Local Player Performance Ratings
//
// Rates each player's performance using a cricket-specific algorithm.
// Runs fully on-device — no API key or internet connection required.
//
// Output format is identical to the Claude API version so MatchDetailScreen
// works without any changes.

// ── BATTING RATING ─────────────────────────────────────────────────────────────
// Factors: runs scored, strike rate, boundary contribution, how dismissed
const rateBatter = (row) => {
  const runs        = row.runs ?? 0;
  const ballsFaced  = row.balls_faced ?? 0;
  const fours       = row.fours ?? 0;
  const sixes       = row.sixes ?? 0;
  const howOut      = (row.how_out ?? 'not out').toLowerCase();

  // Base score from runs (0–6 points)
  let score = 0;
  if      (runs >= 100) score = 6.0;
  else if (runs >= 75)  score = 5.5;
  else if (runs >= 50)  score = 5.0;
  else if (runs >= 30)  score = 4.0;
  else if (runs >= 15)  score = 3.0;
  else if (runs >= 5)   score = 2.0;
  else                  score = 1.0;

  // Strike rate bonus/penalty (up to ±2 points)
  if (ballsFaced > 0) {
    const sr = (runs / ballsFaced) * 100;
    if      (sr >= 180) score += 2.0;
    else if (sr >= 140) score += 1.5;
    else if (sr >= 110) score += 1.0;
    else if (sr >= 80)  score += 0.5;
    else if (sr >= 60)  score += 0.0;
    else if (sr >= 40)  score -= 0.5;
    else                score -= 1.0;
  }

  // Boundary bonus (up to +1 point)
  const boundaryRuns = fours * 4 + sixes * 6;
  if (runs > 0) {
    const boundaryPct = boundaryRuns / runs;
    if      (sixes >= 3)       score += 0.5;
    if      (boundaryPct > 0.6) score += 0.5;
    else if (boundaryPct > 0.4) score += 0.3;
  }

  // Dismissal penalty
  if (howOut.includes('duck') || (runs === 0 && !howOut.includes('not out'))) {
    score = Math.max(score - 1.5, 0.5);
  }

  // Not out bonus
  if (howOut.includes('not out') && runs >= 20) score += 0.3;

  const rating = Math.min(Math.max(Math.round(score * 10) / 10, 1.0), 10.0);
  return rating;
};

const battingComment = (runs, ballsFaced, rating, howOut) => {
  const sr = ballsFaced > 0 ? (runs / ballsFaced) * 100 : 0;
  const notOut = (howOut ?? '').toLowerCase().includes('not out');

  if (runs >= 100)          return 'Magnificent century, dominated the attack';
  if (runs >= 75)           return 'Outstanding knock, nearly reached a century';
  if (runs >= 50 && sr > 130) return 'Explosive half-century, superb strike rate';
  if (runs >= 50)           return 'Solid fifty, valuable contribution to the team';
  if (runs >= 30 && notOut) return 'Useful cameo, held the innings together';
  if (runs >= 30 && sr > 120) return 'Brisk knock, kept the run rate healthy';
  if (runs >= 30)           return 'Decent contribution in the middle order';
  if (runs >= 15 && sr > 130) return 'Quick-fire innings, great impact per ball';
  if (runs >= 15)           return 'Modest innings, could have done more';
  if (runs >= 5)            return 'Brief stay at the crease, disappointing';
  if (runs === 0)           return 'Unlucky duck, did not trouble the scorers';
  return 'Below expectations, poor shot selection';
};

// ── BOWLING RATING ─────────────────────────────────────────────────────────────
// Factors: wickets, economy rate, overs bowled
const rateBowler = (row, totalOvers) => {
  const wickets    = row.wickets ?? 0;
  const runsGiven  = row.runs_given ?? 0;
  const ballsBowled = row.balls_bowled ?? 0;
  const oversBowled = ballsBowled / 6;

  if (oversBowled < 0.5) return { rating: 3.0, comment: 'Barely bowled, insufficient data' };

  const economy = runsGiven / oversBowled;

  // Base score from wickets (0–6 points)
  let score = 0;
  if      (wickets >= 5) score = 6.5;
  else if (wickets >= 4) score = 6.0;
  else if (wickets >= 3) score = 5.5;
  else if (wickets >= 2) score = 5.0;
  else if (wickets === 1) score = 4.0;
  else                    score = 2.5; // wicketless

  // Economy bonus/penalty (up to ±3 points)
  if      (economy <= 4)   score += 3.0;
  else if (economy <= 5)   score += 2.0;
  else if (economy <= 6)   score += 1.0;
  else if (economy <= 7)   score += 0.5;
  else if (economy <= 8)   score += 0.0;
  else if (economy <= 10)  score -= 0.5;
  else if (economy <= 12)  score -= 1.0;
  else                     score -= 2.0;

  // Workload bonus for bowling full quota
  const fullQuota = totalOvers ? oversBowled >= (totalOvers / 5 - 0.5) : false;
  if (fullQuota && wickets >= 1) score += 0.3;

  const rating = Math.min(Math.max(Math.round(score * 10) / 10, 1.0), 10.0);
  return { rating };
};

const bowlingComment = (wickets, economy, oversBowled) => {
  if (wickets >= 5)                          return 'Five-for! Demolished the batting lineup';
  if (wickets >= 4)                          return 'Four wickets, outstanding spell of bowling';
  if (wickets >= 3 && economy <= 6)          return 'Brilliant spell, three wickets and miserly';
  if (wickets >= 3)                          return 'Three wickets, made key breakthroughs';
  if (wickets >= 2 && economy <= 5)          return 'Excellent — two wickets and very economical';
  if (wickets >= 2)                          return 'Two important wickets for the team';
  if (wickets === 1 && economy <= 5)         return 'One wicket but kept batters under pressure';
  if (wickets === 1)                         return 'Picked up a wicket, decent enough spell';
  if (wickets === 0 && economy <= 5)         return 'Wicketless but extremely tight, no loose balls';
  if (wickets === 0 && economy <= 7)         return 'Went wicketless, average economy rate';
  return 'Expensive spell, batters dominated';
};

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
// Identical signature to the Claude API version.
// @param {object} matchInfo   - { team1Name, team2Name, totalOvers, resultSummary }
// @param {Array}  innings     - Array of innings objects from DB
// @param {object} battingData - { [inningsId]: [ batting scorecard rows ] }
// @param {object} bowlingData - { [inningsId]: [ bowling scorecard rows ] }
// @returns {{ battingRatings: PlayerRating[], bowlingRatings: PlayerRating[] }}

export const analyseMatch = async (matchInfo, innings, battingData, bowlingData) => {
  const totalOvers = matchInfo.totalOvers ?? 20;

  // Collect all batting rows across both innings
  const allBatting = [];
  innings.forEach(inn => {
    const rows = battingData[inn.id] ?? [];
    rows.forEach(row => {
      allBatting.push({ ...row, inningsId: inn.id });
    });
  });

  // Collect all bowling rows across both innings
  const allBowling = [];
  innings.forEach(inn => {
    const rows = bowlingData[inn.id] ?? [];
    rows.forEach(row => {
      allBowling.push({ ...row, inningsId: inn.id });
    });
  });

  // Rate batters
  const battingRatings = allBatting.map(row => {
    const rating  = rateBatter(row);
    const comment = battingComment(
      row.runs ?? 0,
      row.balls_faced ?? 0,
      rating,
      row.how_out,
    );
    return {
      playerId:   row.player_id ?? row.id,
      playerName: row.player_name,
      rating,
      comment,
    };
  });

  // Rate bowlers
  const bowlingRatings = allBowling.map(row => {
    const oversBowled = (row.balls_bowled ?? 0) / 6;
    const economy     = oversBowled > 0 ? (row.runs_given ?? 0) / oversBowled : 0;
    const { rating }  = rateBowler(row, totalOvers);
    const comment     = bowlingComment(row.wickets ?? 0, economy, oversBowled);
    return {
      playerId:   row.player_id ?? row.id,
      playerName: row.player_name,
      rating,
      comment,
    };
  });

  // Simulate a tiny async delay so the loading spinner shows (feels more alive)
  await new Promise(resolve => setTimeout(resolve, 600));

  return { battingRatings, bowlingRatings };
};

// ── RATING COLOUR HELPER ──────────────────────────────────────────────────────
export const getRatingColour = (rating) => {
  if (rating >= 8.0) return '#1D9E75'; // green  — excellent
  if (rating >= 6.0) return '#F0A500'; // amber  — good
  if (rating >= 4.0) return '#1A5276'; // blue   — average
  return '#E24B4A';                    // red    — poor
};

// ── STAR DISPLAY HELPER ───────────────────────────────────────────────────────
export const getRatingStars = (rating) => {
  const stars = Math.round(rating / 2);
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
};