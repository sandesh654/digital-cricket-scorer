// ScoringScreen.js — Live ball-by-ball scoring screen
// This is the most important screen in the app
// Includes Win Probability Calculator (Akhtar et al., 2022)
// UPDATED: Added resume match support — reads DB state when resuming = true
// UPDATED: Added score prediction banner for 1st innings

import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, Modal
} from 'react-native';
import {
  getPlayersByTeam,
  recordBall,
  updateInningsTotals,
  upsertBattingScorecard,
  upsertBowlingScorecard,
  completeInnings,
  createInnings,
  completeMatch,
  getInningsById,
  getBattingScorecard,
  getBowlingScorecard,
} from '../database/db';
import {
  calculateWinProbability,
  getProbabilityDescription,
  getProbabilityColour,
} from '../logic/winProbability';
import { getPredictionDisplay } from '../logic/scorePrediction';

export default function ScoringScreen({ route, navigation }) {

  const {
    matchId, inningsId, battingTeam, bowlingTeam,
    totalOvers, teamA, teamB, inningsNumber,
    resuming,       // true when coming from Resume Match button
  } = route.params;

  // ── INNINGS TOTALS ──────────────────────────────────────────────────────────
  const [totalRuns, setTotalRuns]       = useState(0);
  const [totalWickets, setTotalWickets] = useState(0);
  const [totalBalls, setTotalBalls]     = useState(0);
  const [extras, setExtras]             = useState(0);
  const [wides, setWides]               = useState(0);
  const [noBalls, setNoBalls]           = useState(0);
  const [target, setTarget]             = useState(null);

  // ── CURRENT PLAYERS ─────────────────────────────────────────────────────────
  const [striker, setStriker]           = useState(null);
  const [nonStriker, setNonStriker]     = useState(null);
  const [currentBowler, setCurrentBowler] = useState(null);

  // ── PLAYERS LISTS ───────────────────────────────────────────────────────────
  const [battingPlayers, setBattingPlayers] = useState([]);
  const [bowlingPlayers, setBowlingPlayers] = useState([]);

  // ── SCORECARDS ──────────────────────────────────────────────────────────────
  const [battingStats, setBattingStats] = useState({});
  const [bowlingStats, setBowlingStats] = useState({});

  // ── OVER TRACKING ───────────────────────────────────────────────────────────
  const [ballsInOver, setBallsInOver]           = useState(0);
  const [currentOverBalls, setCurrentOverBalls] = useState([]);

  // ── UI STATE ────────────────────────────────────────────────────────────────
  const [modalType, setModalType]   = useState(null);
  const [wicketType, setWicketType] = useState('bowled');
  const [inningsOver, setInningsOver] = useState(false);

  // ── SCORE PREDICTION (1st innings only) ────────────────────────────────────
  const prediction = inningsNumber === 1
    ? getPredictionDisplay(totalRuns, totalWickets, totalBalls, totalOvers)
    : null;

  // ── INITIALISE ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (resuming) {
      loadPlayersForResume();
    } else {
      loadPlayers();
      if (inningsNumber === 2 && route.params.target) {
        setTarget(route.params.target);
      }
    }
  }, []);

  // Normal start — initialise blank stats then ask to select players
  const loadPlayers = () => {
    const batting = getPlayersByTeam(battingTeam.id);
    const bowling = getPlayersByTeam(bowlingTeam.id);
    setBattingPlayers(batting);
    setBowlingPlayers(bowling);

    const bStats = {};
    batting.forEach(p => {
      bStats[p.id] = { runs:0, balls_faced:0, fours:0, sixes:0, how_out:'not out', is_batting:0 };
    });
    setBattingStats(bStats);

    const bowlStats = {};
    bowling.forEach(p => {
      bowlStats[p.id] = { balls_bowled:0, runs_given:0, wickets:0, maidens:0, wides:0, no_balls:0, is_bowling:0 };
    });
    setBowlingStats(bowlStats);
    setModalType('selectStriker');
  };

  // Resume — restore innings totals and scorecard stats from SQLite
  const loadPlayersForResume = () => {
    try {
      // Load player lists (same as normal)
      const batting = getPlayersByTeam(battingTeam.id);
      const bowling = getPlayersByTeam(bowlingTeam.id);
      setBattingPlayers(batting);
      setBowlingPlayers(bowling);

      // ── Restore innings totals from the innings row ──────────────────────
      const savedInnings = getInningsById(inningsId);
      if (savedInnings) {
        setTotalRuns(savedInnings.total_runs     ?? 0);
        setTotalWickets(savedInnings.total_wickets ?? 0);
        setTotalBalls(savedInnings.total_balls   ?? 0);
        setExtras(savedInnings.extras            ?? 0);
        setWides(savedInnings.wides              ?? 0);
        setNoBalls(savedInnings.no_balls         ?? 0);

        // balls currently in the partial over
        const ballsIntoCurrentOver = (savedInnings.total_balls ?? 0) % 6;
        setBallsInOver(ballsIntoCurrentOver);
      }

      // ── Set target for 2nd innings ───────────────────────────────────────
      if (inningsNumber === 2 && route.params.target) {
        setTarget(route.params.target);
      }

      // ── Restore batting stats from batting_scorecards table ──────────────
      const savedBatting = getBattingScorecard(inningsId);
      const bStats = {};
      // First fill with zeros for every player
      batting.forEach(p => {
        bStats[p.id] = { runs:0, balls_faced:0, fours:0, sixes:0, how_out:'not out', is_batting:0 };
      });
      // Then overwrite with saved values for anyone who has batted
      savedBatting.forEach(row => {
        bStats[row.player_id] = {
          runs:        row.runs        ?? 0,
          balls_faced: row.balls_faced ?? 0,
          fours:       row.fours       ?? 0,
          sixes:       row.sixes       ?? 0,
          how_out:     row.how_out     ?? 'not out',
          is_batting:  row.is_batting  ?? 0,
        };
      });
      setBattingStats(bStats);

      // ── Restore bowling stats from bowling_scorecards table ──────────────
      const savedBowling = getBowlingScorecard(inningsId);
      const bowlStats = {};
      bowling.forEach(p => {
        bowlStats[p.id] = { balls_bowled:0, runs_given:0, wickets:0, maidens:0, wides:0, no_balls:0, is_bowling:0 };
      });
      savedBowling.forEach(row => {
        bowlStats[row.player_id] = {
          balls_bowled: row.balls_bowled ?? 0,
          runs_given:   row.runs_given   ?? 0,
          wickets:      row.wickets      ?? 0,
          maidens:      row.maidens      ?? 0,
          wides:        row.wides        ?? 0,
          no_balls:     row.no_balls     ?? 0,
          is_bowling:   row.is_bowling   ?? 0,
        };
      });
      setBowlingStats(bowlStats);

      // ── Ask user to re-select the current batsmen and bowler ────────────
      // We don't try to auto-detect who is on strike — too complex to infer.
      // Just open the striker modal and they tap in within seconds.
      setModalType('selectStriker');

    } catch (error) {
      console.error('Error restoring match state:', error);
      // Fall back to normal load so the app doesn't freeze
      loadPlayers();
    }
  };

  // ── DISPLAY HELPERS ─────────────────────────────────────────────────────────
  const getOversDisplay = (balls) => `${Math.floor(balls/6)}.${balls%6}`;

  const getRunRate = () => {
    if (totalBalls === 0) return '0.00';
    return (totalRuns / (totalBalls / 6)).toFixed(2);
  };

  const getRequiredRate = () => {
    if (!target || inningsNumber !== 2) return null;
    const runsNeeded = target - totalRuns;
    const ballsRemaining = (totalOvers * 6) - totalBalls;
    if (ballsRemaining <= 0) return '---';
    return (runsNeeded / (ballsRemaining / 6)).toFixed(2);
  };

  // ── WIN PROBABILITY ─────────────────────────────────────────────────────────
  const getWinProb = () => {
    if (!target || inningsNumber !== 2) return null;
    return calculateWinProbability({
      runsScored:    totalRuns,
      wicketsFallen: totalWickets,
      ballsBowled:   totalBalls,
      target,
      totalOvers,
    });
  };

  // ── RECORD A BALL ───────────────────────────────────────────────────────────
  const handleBall = (runsScored, extraType = null, isWicket = false) => {
    if (!striker || !currentBowler) {
      Alert.alert('Select Players', 'Please select batsmen and bowler first.');
      return;
    }
    if (inningsOver) return;

    const isLegal   = extraType !== 'wide' && extraType !== 'noball';
    const extraRuns = (extraType === 'wide' || extraType === 'noball') ? 1 : 0;
    const ballRuns  = runsScored + extraRuns;

    const newTotalRuns    = totalRuns + ballRuns;
    const newExtras       = extras + extraRuns;
    const newWides        = extraType === 'wide'   ? wides + 1   : wides;
    const newNoBalls      = extraType === 'noball' ? noBalls + 1 : noBalls;
    const newTotalBalls   = isLegal ? totalBalls + 1 : totalBalls;
    const newBallsInOver  = isLegal ? ballsInOver + 1 : ballsInOver;
    const newTotalWickets = isWicket ? totalWickets + 1 : totalWickets;

    // Update batting stats
    const newBattingStats = { ...battingStats };
    if (striker && isLegal) {
      const s = { ...newBattingStats[striker.id] };
      s.balls_faced += 1;
      if (!extraType) {
        s.runs += runsScored;
        if (runsScored === 4) s.fours += 1;
        if (runsScored === 6) s.sixes += 1;
      }
      if (isWicket) s.how_out = wicketType;
      newBattingStats[striker.id] = s;
    }

    // Update bowling stats
    const newBowlingStats = { ...bowlingStats };
    if (currentBowler) {
      const b = { ...newBowlingStats[currentBowler.id] };
      if (isLegal) b.balls_bowled += 1;
      b.runs_given += ballRuns;
      if (isWicket && extraType !== 'wide') b.wickets += 1;
      if (extraType === 'wide')   b.wides += 1;
      if (extraType === 'noball') b.no_balls += 1;
      newBowlingStats[currentBowler.id] = b;
    }

    // Save to database
    const currentOver = Math.floor(newTotalBalls / 6);
    recordBall({
      innings_id:  inningsId,
      batsman_id:  striker.id,
      bowler_id:   currentBowler.id,
      over_number: currentOver,
      ball_number: newBallsInOver,
      runs_scored: runsScored,
      is_wicket:   isWicket ? 1 : 0,
      wicket_type: isWicket ? wicketType : null,
      extra_type:  extraType,
      extra_runs:  extraRuns,
      is_legal:    isLegal ? 1 : 0,
    });

    if (striker) {
      upsertBattingScorecard(inningsId, striker.id, { ...newBattingStats[striker.id], is_batting:1 });
    }
    if (currentBowler) {
      upsertBowlingScorecard(inningsId, currentBowler.id, { ...newBowlingStats[currentBowler.id], is_bowling:1 });
    }

    updateInningsTotals(inningsId, {
      total_runs: newTotalRuns, total_wickets: newTotalWickets,
      total_balls: newTotalBalls, extras: newExtras,
      wides: newWides, no_balls: newNoBalls, byes:0, leg_byes:0,
    });

    // Over ball display
    const overBall = runsScored === 0 && !extraType ? '•'
      : extraType === 'wide'   ? 'Wd'
      : extraType === 'noball' ? 'NB'
      : isWicket               ? 'W'
      : runsScored.toString();
    const newOverBalls = [...currentOverBalls, overBall];

    // Swap strike on odd runs
    let newStriker    = striker;
    let newNonStriker = nonStriker;
    if (!extraType && runsScored % 2 !== 0) {
      newStriker    = nonStriker;
      newNonStriker = striker;
    }

    // Update state
    setTotalRuns(newTotalRuns);
    setTotalWickets(newTotalWickets);
    setTotalBalls(newTotalBalls);
    setExtras(newExtras);
    setWides(newWides);
    setNoBalls(newNoBalls);
    setBattingStats(newBattingStats);
    setBowlingStats(newBowlingStats);
    setCurrentOverBalls(newOverBalls);
    setStriker(newStriker);
    setNonStriker(newNonStriker);

    // Check innings end
    if (newTotalWickets >= 10) { handleInningsEnd(newTotalRuns, newTotalWickets, newTotalBalls); return; }
    if (inningsNumber === 2 && target && newTotalRuns >= target) { handleInningsEnd(newTotalRuns, newTotalWickets, newTotalBalls); return; }
    if (newTotalBalls >= totalOvers * 6) { handleInningsEnd(newTotalRuns, newTotalWickets, newTotalBalls); return; }

    // Over complete
    if (isLegal && newBallsInOver >= 6) {
      setBallsInOver(0);
      setCurrentOverBalls([]);
      setStriker(newNonStriker);
      setNonStriker(newStriker);
      setModalType('selectBowler');
      return;
    }
    setBallsInOver(newBallsInOver);
    if (isWicket) setModalType('selectStriker');
  };

  // ── INNINGS END ─────────────────────────────────────────────────────────────
  const handleInningsEnd = (runs, wickets, balls) => {
    setInningsOver(true);
    completeInnings(inningsId);

    if (inningsNumber === 1) {
      Alert.alert(
        'End of Innings',
        `${battingTeam.name} scored ${runs}/${wickets} in ${getOversDisplay(balls)} overs.\n\n${bowlingTeam.name} needs ${runs + 1} runs to win.`,
        [{ text: 'Start 2nd Innings', onPress: () => startSecondInnings(runs) }]
      );
    } else {
      let resultText = '';
      if (runs >= (target || 0)) {
        const wicketsRemaining = 10 - wickets;
        resultText = `${battingTeam.name} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}!`;
        completeMatch(matchId, battingTeam.id, resultText);
      } else {
        const runMargin = (target || 0) - runs - 1;
        resultText = `${bowlingTeam.name} won by ${runMargin} run${runMargin !== 1 ? 's' : ''}!`;
        completeMatch(matchId, bowlingTeam.id, resultText);
      }
      navigation.navigate('MatchSummary', { matchId, teamA, teamB, resultText });
    }
  };

  const startSecondInnings = (firstInningsRuns) => {
    const newInningsResult = createInnings(matchId, bowlingTeam.id, battingTeam.id, 2);
    navigation.replace('Scoring', {
      matchId,
      inningsId:    newInningsResult.lastInsertRowId,
      battingTeam:  bowlingTeam,
      bowlingTeam:  battingTeam,
      totalOvers, teamA, teamB,
      inningsNumber: 2,
      target: firstInningsRuns + 1,
    });
  };

  const WICKET_TYPES = ['Bowled','Caught','LBW','Run Out','Stumped','Hit Wicket','Retired'];

  // ── MAIN RENDER ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView>

        {/* ── SCORE HEADER ─────────────────────────────────────────────── */}
        <View style={styles.scoreHeader}>
          <View style={styles.scoreMain}>
            <Text style={styles.scoreTeam}>{battingTeam.name}</Text>
            <Text style={styles.scoreRuns}>{totalRuns}/{totalWickets}</Text>
            <Text style={styles.scoreOvers}>
              {getOversDisplay(totalBalls)} ov  |  RR: {getRunRate()}
            </Text>
          </View>

          {target && (
            <View style={styles.targetBox}>
              <Text style={styles.targetLabel}>Target</Text>
              <Text style={styles.targetRuns}>{target}</Text>
              <Text style={styles.targetNeeded}>
                Need {Math.max(0, target - totalRuns)} off{' '}
                {Math.max(0, (totalOvers * 6) - totalBalls)} balls
              </Text>
              <Text style={styles.targetRRR}>RRR: {getRequiredRate()}</Text>
            </View>
          )}
        </View>

        {/* ── SCORE PREDICTION BANNER (1st innings only, after 1 over) ─── */}
        {inningsNumber === 1 && prediction && (
          <View style={styles.predictionBanner}>
            <Text style={styles.predictionIcon}>🔮</Text>
            <View style={styles.predictionTextGroup}>
              <Text style={styles.predictionLabel}>Projected Score</Text>
              <Text style={styles.predictionValue}>{prediction}</Text>
            </View>
          </View>
        )}

        {/* ── WIN PROBABILITY BAR (2nd innings only) ───────────────────── */}
        {target && inningsNumber === 2 && (() => {
          const prob        = getWinProb();
          const colour      = getProbabilityColour(prob);
          const description = getProbabilityDescription(
            prob, battingTeam.name, bowlingTeam.name
          );
          return (
            <View style={styles.probContainer}>
              <View style={styles.probLabels}>
                <Text style={styles.probTeamLabel}>{battingTeam.name}</Text>
                <Text style={styles.probTeamLabel}>{bowlingTeam.name}</Text>
              </View>
              <View style={styles.probBarBackground}>
                <View style={[styles.probBarFill, {
                  width: `${prob}%`,
                  backgroundColor: colour,
                }]} />
              </View>
              <View style={styles.probLabels}>
                <Text style={[styles.probPercent, { color: colour }]}>{prob}%</Text>
                <Text style={[styles.probPercent, { color:'#E24B4A' }]}>{100 - prob}%</Text>
              </View>
              <Text style={styles.probDescription}>{description}</Text>
            </View>
          );
        })()}

        {/* ── CURRENT OVER DISPLAY ──────────────────────────────────────── */}
        <View style={styles.overDisplay}>
          <Text style={styles.overLabel}>Over {Math.floor(totalBalls / 6) + 1}</Text>
          <View style={styles.overBalls}>
            {currentOverBalls.map((ball, i) => (
              <View key={i} style={[
                styles.overBall,
                ball === 'W'  && styles.overBallWicket,
                ball === 'Wd' && styles.overBallExtra,
                ball === 'NB' && styles.overBallExtra,
                ball === '4'  && styles.overBallFour,
                ball === '6'  && styles.overBallSix,
              ]}>
                <Text style={[
                  styles.overBallText,
                  (ball === 'W' || ball === '4' || ball === '6') && styles.overBallTextWhite
                ]}>{ball}</Text>
              </View>
            ))}
            {Array.from({ length: Math.max(0, 6 - currentOverBalls.length) }).map((_, i) => (
              <View key={`e-${i}`} style={[styles.overBall, styles.overBallEmpty]} />
            ))}
          </View>
        </View>

        {/* ── CURRENT PLAYERS ───────────────────────────────────────────── */}
        <View style={styles.playersRow}>
          <TouchableOpacity style={styles.playerBox} onPress={() => setModalType('selectStriker')}>
            <Text style={styles.playerRole}>🏏 Striker</Text>
            <Text style={styles.playerName}>{striker ? striker.name : 'Tap to select'}</Text>
            {striker && <Text style={styles.playerStats}>{battingStats[striker.id]?.runs ?? 0} ({battingStats[striker.id]?.balls_faced ?? 0})</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.playerBox} onPress={() => setModalType('selectNonStriker')}>
            <Text style={styles.playerRole}>🏃 Non-Striker</Text>
            <Text style={styles.playerName}>{nonStriker ? nonStriker.name : 'Tap to select'}</Text>
            {nonStriker && <Text style={styles.playerStats}>{battingStats[nonStriker.id]?.runs ?? 0} ({battingStats[nonStriker.id]?.balls_faced ?? 0})</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.playerBox, styles.bowlerBox]} onPress={() => setModalType('selectBowler')}>
            <Text style={styles.playerRole}>🎳 Bowler</Text>
            <Text style={styles.playerName}>{currentBowler ? currentBowler.name : 'Tap to select'}</Text>
            {currentBowler && (
              <Text style={styles.playerStats}>
                {Math.floor((bowlingStats[currentBowler.id]?.balls_bowled ?? 0) / 6)}-
                {(bowlingStats[currentBowler.id]?.balls_bowled ?? 0) % 6}-
                {bowlingStats[currentBowler.id]?.runs_given ?? 0}-
                {bowlingStats[currentBowler.id]?.wickets ?? 0}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── SCORING BUTTONS ───────────────────────────────────────────── */}
        <View style={styles.scoringSection}>

          <Text style={styles.scoringLabel}>Runs</Text>
          <View style={styles.runsRow}>
            {[0, 1, 2, 3, 4, 6].map(runs => (
              <TouchableOpacity key={runs}
                style={[styles.runBtn, runs === 4 && styles.runBtnFour, runs === 6 && styles.runBtnSix]}
                onPress={() => handleBall(runs)} activeOpacity={0.7}
              >
                <Text style={[styles.runBtnText, (runs === 4 || runs === 6) && styles.runBtnTextWhite]}>
                  {runs}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.scoringLabel}>Extras</Text>
          <View style={styles.extrasRow}>
            <TouchableOpacity style={[styles.extraBtn, styles.extraBtnWide]} onPress={() => handleBall(0, 'wide')}>
              <Text style={styles.extraBtnText}>Wide</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.extraBtn, styles.extraBtnNB]} onPress={() => handleBall(0, 'noball')}>
              <Text style={styles.extraBtnText}>No Ball</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.extraBtn, styles.extraBtnBye]} onPress={() => handleBall(1, 'bye')}>
              <Text style={styles.extraBtnText}>Bye</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.extraBtn, styles.extraBtnLB]} onPress={() => handleBall(1, 'legbye')}>
              <Text style={styles.extraBtnText}>Leg Bye</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.wicketBtn} onPress={() => setModalType('wicket')} activeOpacity={0.8}>
            <Text style={styles.wicketBtnText}>🔴  WICKET</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.scorecardBtn}
            onPress={() => navigation.navigate('Scoreboard', {
              inningsId, battingTeam, bowlingTeam,
              totalRuns, totalWickets, totalBalls,
              battingStats, bowlingStats,
              battingPlayers, bowlingPlayers,
              extras, wides, noBalls,
            })}
          >
            <Text style={styles.scorecardBtnText}>📊  View Scorecard</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* ── MODALS ──────────────────────────────────────────────────────── */}

      {/* Wicket */}
      <Modal visible={modalType === 'wicket'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>How Out?</Text>
            {WICKET_TYPES.map(type => (
              <TouchableOpacity key={type}
                style={[styles.modalOption, wicketType === type.toLowerCase() && styles.modalOptionSelected]}
                onPress={() => { setWicketType(type.toLowerCase()); setModalType(null); handleBall(0, null, true); }}
              >
                <Text style={[styles.modalOptionText, wicketType === type.toLowerCase() && styles.modalOptionTextSelected]}>{type}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalType(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Select striker */}
      <Modal visible={modalType === 'selectStriker'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Striker</Text>
            {battingPlayers
              .filter(p => p.id !== nonStriker?.id && battingStats[p.id]?.how_out === 'not out')
              .map(player => (
                <TouchableOpacity key={player.id} style={styles.modalOption}
                  onPress={() => {
                    setStriker(player);
                    const bs = { ...battingStats };
                    if (bs[player.id]) bs[player.id].is_batting = 1;
                    setBattingStats(bs);
                    setModalType(null);
                  }}
                >
                  <Text style={styles.modalOptionText}>
                    {player.name}
                    {battingStats[player.id]?.balls_faced > 0
                      ? `  (${battingStats[player.id].runs} off ${battingStats[player.id].balls_faced})`
                      : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalType(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Select non-striker */}
      <Modal visible={modalType === 'selectNonStriker'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Non-Striker</Text>
            {battingPlayers
              .filter(p => p.id !== striker?.id && battingStats[p.id]?.how_out === 'not out')
              .map(player => (
                <TouchableOpacity key={player.id} style={styles.modalOption}
                  onPress={() => {
                    setNonStriker(player);
                    const bs = { ...battingStats };
                    if (bs[player.id]) bs[player.id].is_batting = 1;
                    setBattingStats(bs);
                    setModalType(null);
                  }}
                >
                  <Text style={styles.modalOptionText}>
                    {player.name}
                    {battingStats[player.id]?.balls_faced > 0
                      ? `  (${battingStats[player.id].runs} off ${battingStats[player.id].balls_faced})`
                      : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalType(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Select bowler */}
      <Modal visible={modalType === 'selectBowler'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Bowler</Text>
            {bowlingPlayers.map(player => (
              <TouchableOpacity key={player.id} style={styles.modalOption}
                onPress={() => {
                  if (currentBowler) {
                    const bs = { ...bowlingStats };
                    bs[currentBowler.id].is_bowling = 0;
                    setBowlingStats(bs);
                  }
                  setCurrentBowler(player);
                  const bs = { ...bowlingStats };
                  if (bs[player.id]) bs[player.id].is_bowling = 1;
                  setBowlingStats(bs);
                  setModalType(null);
                }}
              >
                <Text style={styles.modalOptionText}>
                  {player.name}
                  {bowlingStats[player.id]?.balls_bowled > 0
                    ? `  (${Math.floor(bowlingStats[player.id].balls_bowled/6)}-${bowlingStats[player.id].balls_bowled%6} ov, ${bowlingStats[player.id].runs_given} runs)`
                    : ''}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalType(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor:'#F0F0F0' },

  // Score header
  scoreHeader: { backgroundColor:'#1D9E75', padding:20, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  scoreMain:   { flex:1 },
  scoreTeam:   { fontSize:14, color:'rgba(255,255,255,0.85)', fontWeight:'600', marginBottom:4 },
  scoreRuns:   { fontSize:48, fontWeight:'bold', color:'#FFFFFF', lineHeight:54 },
  scoreOvers:  { fontSize:14, color:'rgba(255,255,255,0.85)', marginTop:4 },

  // Target box
  targetBox:    { backgroundColor:'rgba(0,0,0,0.2)', borderRadius:12, padding:12, alignItems:'center', minWidth:110 },
  targetLabel:  { fontSize:11, color:'rgba(255,255,255,0.8)', fontWeight:'600' },
  targetRuns:   { fontSize:28, fontWeight:'bold', color:'#FFFFFF' },
  targetNeeded: { fontSize:11, color:'rgba(255,255,255,0.85)', textAlign:'center', marginTop:2 },
  targetRRR:    { fontSize:12, color:'#FFD700', fontWeight:'bold', marginTop:2 },

  // Score prediction banner
  predictionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A5276',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  predictionIcon: { fontSize: 20 },
  predictionTextGroup: { flex: 1 },
  predictionLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', letterSpacing: 0.5 },
  predictionValue: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },

  // Win probability bar
  probContainer: { backgroundColor:'#FFFFFF', paddingHorizontal:16, paddingVertical:10, borderBottomWidth:1, borderBottomColor:'#EEEEEE' },
  probLabels:    { flexDirection:'row', justifyContent:'space-between', marginBottom:4 },
  probTeamLabel: { fontSize:11, fontWeight:'600', color:'#555555' },
  probBarBackground: { height:10, backgroundColor:'#E24B4A', borderRadius:5, overflow:'hidden', marginBottom:4 },
  probBarFill:   { height:'100%', borderRadius:5 },
  probPercent:   { fontSize:13, fontWeight:'bold' },
  probDescription:{ fontSize:12, color:'#555555', textAlign:'center', marginTop:4, fontStyle:'italic' },

  // Over display
  overDisplay: { backgroundColor:'#FFFFFF', padding:14, flexDirection:'row', alignItems:'center', borderBottomWidth:1, borderBottomColor:'#EEEEEE' },
  overLabel:   { fontSize:13, fontWeight:'bold', color:'#888888', marginRight:12 },
  overBalls:   { flexDirection:'row', gap:6 },
  overBall:         { width:32, height:32, borderRadius:16, backgroundColor:'#F0F0F0', borderWidth:1, borderColor:'#DDDDDD', justifyContent:'center', alignItems:'center' },
  overBallEmpty:    { borderStyle:'dashed', borderColor:'#CCCCCC' },
  overBallWicket:   { backgroundColor:'#E24B4A', borderColor:'#E24B4A' },
  overBallExtra:    { backgroundColor:'#F0A500', borderColor:'#F0A500' },
  overBallFour:     { backgroundColor:'#1A5276', borderColor:'#1A5276' },
  overBallSix:      { backgroundColor:'#7F77DD', borderColor:'#7F77DD' },
  overBallText:     { fontSize:11, fontWeight:'bold', color:'#555555' },
  overBallTextWhite:{ color:'#FFFFFF' },

  // Players row
  playersRow: { flexDirection:'row', gap:8, padding:12, backgroundColor:'#FFFFFF', marginTop:8 },
  playerBox:  { flex:1, backgroundColor:'#F8F8F8', borderRadius:10, padding:10, alignItems:'center', borderWidth:1, borderColor:'#EEEEEE' },
  bowlerBox:  { backgroundColor:'#FFF8E8', borderColor:'#F0A500' },
  playerRole: { fontSize:11, color:'#888888', marginBottom:4 },
  playerName: { fontSize:13, fontWeight:'bold', color:'#1A1A1A', textAlign:'center' },
  playerStats:{ fontSize:11, color:'#1D9E75', marginTop:3 },

  // Scoring
  scoringSection: { padding:16, gap:12 },
  scoringLabel:   { fontSize:13, fontWeight:'600', color:'#555555', marginBottom:4 },

  runsRow: { flexDirection:'row', gap:10, justifyContent:'space-between' },
  runBtn:  { flex:1, aspectRatio:1, borderRadius:12, backgroundColor:'#FFFFFF', justifyContent:'center', alignItems:'center', borderWidth:1.5, borderColor:'#DDDDDD', shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.08, shadowRadius:2, elevation:2 },
  runBtnFour:      { backgroundColor:'#1A5276', borderColor:'#1A5276' },
  runBtnSix:       { backgroundColor:'#7F77DD', borderColor:'#7F77DD' },
  runBtnText:      { fontSize:24, fontWeight:'bold', color:'#1A1A1A' },
  runBtnTextWhite: { color:'#FFFFFF' },

  extrasRow:    { flexDirection:'row', gap:8 },
  extraBtn:     { flex:1, padding:12, borderRadius:10, alignItems:'center', justifyContent:'center' },
  extraBtnWide: { backgroundColor:'#FFF3CD', borderWidth:1, borderColor:'#F0A500' },
  extraBtnNB:   { backgroundColor:'#FFE4E4', borderWidth:1, borderColor:'#E24B4A' },
  extraBtnBye:  { backgroundColor:'#E8F4F8', borderWidth:1, borderColor:'#1A5276' },
  extraBtnLB:   { backgroundColor:'#F0EEF8', borderWidth:1, borderColor:'#7F77DD' },
  extraBtnText: { fontSize:13, fontWeight:'bold', color:'#333333' },

  wicketBtn:     { backgroundColor:'#E24B4A', borderRadius:12, padding:18, alignItems:'center', shadowColor:'#E24B4A', shadowOffset:{width:0,height:3}, shadowOpacity:0.4, shadowRadius:5, elevation:5 },
  wicketBtnText: { fontSize:20, fontWeight:'bold', color:'#FFFFFF', letterSpacing:1 },

  scorecardBtn:     { backgroundColor:'#FFFFFF', borderRadius:12, padding:14, alignItems:'center', borderWidth:1.5, borderColor:'#1D9E75' },
  scorecardBtnText: { fontSize:15, fontWeight:'600', color:'#1D9E75' },

  // Modals
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  modalBox:     { backgroundColor:'#FFFFFF', borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, paddingBottom:40, maxHeight:'80%' },
  modalTitle:   { fontSize:18, fontWeight:'bold', color:'#1A1A1A', marginBottom:16, textAlign:'center' },
  modalOption:  { padding:14, borderRadius:10, backgroundColor:'#F5F5F5', marginBottom:8, alignItems:'center' },
  modalOptionSelected:     { backgroundColor:'#E8F8F2', borderWidth:1.5, borderColor:'#1D9E75' },
  modalOptionText:         { fontSize:15, fontWeight:'600', color:'#1A1A1A' },
  modalOptionTextSelected: { color:'#1D9E75' },
  modalCancel:     { padding:14, alignItems:'center', marginTop:4 },
  modalCancelText: { fontSize:15, color:'#888888', fontWeight:'600' },
});