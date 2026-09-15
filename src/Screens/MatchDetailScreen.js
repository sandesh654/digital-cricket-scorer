// MatchDetailScreen.js — Full scorecard for a completed match
// Shows both innings batting and bowling cards
// Loaded from SQLite using the match ID

import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, ActivityIndicator
} from 'react-native';
import {
  getInningsByMatch,
  getBattingScorecard,
  getBowlingScorecard,
  getMatchById,
} from '../database/db';

export default function MatchDetailScreen({ route }) {

  const { matchId, matchItem } = route.params;

  const [match, setMatch]     = useState(null);
  const [innings, setInnings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Batting and bowling stats per innings
  // keyed by innings id
  const [battingData, setBattingData]   = useState({});
  const [bowlingData, setBowlingData]   = useState({});

  // ── LOAD ALL DATA ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadMatchData();
  }, []);

  const loadMatchData = () => {
    try {
      // Load match details
      const matchData = getMatchById(matchId);
      setMatch(matchData);

      // Load both innings
      const inningsData = getInningsByMatch(matchId);
      setInnings(inningsData);

      // Load batting and bowling scorecards for each innings
      const bData = {};
      const bowlData = {};

      inningsData.forEach(innings => {
        bData[innings.id]    = getBattingScorecard(innings.id);
        bowlData[innings.id] = getBowlingScorecard(innings.id);
      });

      setBattingData(bData);
      setBowlingData(bowlData);

    } catch (error) {
      console.error('Error loading match detail:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── HELPERS ────────────────────────────────────────────────────────────────
  const getOversDisplay = (balls) => {
    if (!balls) return '0.0';
    return `${Math.floor(balls / 6)}.${balls % 6}`;
  };

  const getStrikeRate = (runs, balls) => {
    if (!balls) return '0.0';
    return ((runs / balls) * 100).toFixed(1);
  };

  const getEconomy = (runs, balls) => {
    if (!balls) return '0.00';
    return (runs / (balls / 6)).toFixed(2);
  };

  // ── LOADING STATE ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1D9E75" />
        <Text style={styles.loadingText}>Loading scorecard...</Text>
      </View>
    );
  }

  // ── RENDER ONE INNINGS ─────────────────────────────────────────────────────
  const renderInnings = (inning, index) => {
    const batting = battingData[inning.id] || [];
    const bowling = bowlingData[inning.id] || [];

    const ordinal = index === 0 ? '1st' : '2nd';
    const overs   = getOversDisplay(inning.total_balls);

    return (
      <View key={inning.id} style={styles.inningsBlock}>

        {/* Innings header */}
        <View style={styles.inningsHeader}>
          <Text style={styles.inningsTitle}>
            {ordinal} Innings
          </Text>
          <Text style={styles.inningsScore}>
            {inning.total_runs}/{inning.total_wickets}
            {'  '}({overs} ov)
          </Text>
        </View>

        {/* Extras */}
        <Text style={styles.extrasText}>
          Extras: {inning.extras ?? 0}
          {'  '}(Wd: {inning.wides ?? 0}, NB: {inning.no_balls ?? 0})
        </Text>

        {/* ── BATTING CARD ────────────────────────────────────────────────── */}
        <Text style={styles.cardLabel}>🏏 Batting</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col, styles.colWide, styles.headerText]}>Batter</Text>
            <Text style={[styles.col, styles.headerText]}>R</Text>
            <Text style={[styles.col, styles.headerText]}>B</Text>
            <Text style={[styles.col, styles.headerText]}>4s</Text>
            <Text style={[styles.col, styles.headerText]}>6s</Text>
            <Text style={[styles.col, styles.headerText]}>SR</Text>
          </View>

          {batting.map((row, i) => (
            <View
              key={row.id}
              style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}
            >
              <View style={[styles.col, styles.colWide]}>
                <Text style={styles.playerName}>{row.player_name}</Text>
                <Text style={styles.howOut}>{row.how_out ?? 'not out'}</Text>
              </View>
              <Text style={[styles.col, styles.statText, styles.statBold]}>
                {row.runs ?? 0}
              </Text>
              <Text style={[styles.col, styles.statText]}>
                {row.balls_faced ?? 0}
              </Text>
              <Text style={[styles.col, styles.statText]}>
                {row.fours ?? 0}
              </Text>
              <Text style={[styles.col, styles.statText]}>
                {row.sixes ?? 0}
              </Text>
              <Text style={[styles.col, styles.statText]}>
                {getStrikeRate(row.runs ?? 0, row.balls_faced ?? 0)}
              </Text>
            </View>
          ))}

          {batting.length === 0 && (
            <Text style={styles.noData}>No batting data</Text>
          )}
        </View>

        {/* ── BOWLING CARD ────────────────────────────────────────────────── */}
        <Text style={styles.cardLabel}>🎳 Bowling</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col, styles.colWide, styles.headerText]}>Bowler</Text>
            <Text style={[styles.col, styles.headerText]}>O</Text>
            <Text style={[styles.col, styles.headerText]}>M</Text>
            <Text style={[styles.col, styles.headerText]}>R</Text>
            <Text style={[styles.col, styles.headerText]}>W</Text>
            <Text style={[styles.col, styles.headerText]}>Econ</Text>
          </View>

          {bowling.map((row, i) => (
            <View
              key={row.id}
              style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}
            >
              <Text style={[styles.col, styles.colWide, styles.playerName]}>
                {row.player_name}
              </Text>
              <Text style={[styles.col, styles.statText]}>
                {getOversDisplay(row.balls_bowled ?? 0)}
              </Text>
              <Text style={[styles.col, styles.statText]}>
                {row.maidens ?? 0}
              </Text>
              <Text style={[styles.col, styles.statText]}>
                {row.runs_given ?? 0}
              </Text>
              <Text style={[styles.col, styles.statText, (row.wickets ?? 0) > 0 && styles.wicketText]}>
                {row.wickets ?? 0}
              </Text>
              <Text style={[styles.col, styles.statText]}>
                {getEconomy(row.runs_given ?? 0, row.balls_bowled ?? 0)}
              </Text>
            </View>
          ))}

          {bowling.length === 0 && (
            <Text style={styles.noData}>No bowling data</Text>
          )}
        </View>

      </View>
    );
  };

  // ── MAIN RENDER ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Match result banner */}
        <View style={styles.resultBanner}>
          <Text style={styles.resultEmoji}>🏆</Text>
          <Text style={styles.resultTeams}>
            {matchItem.team1_name} vs {matchItem.team2_name}
          </Text>
          <Text style={styles.resultText}>
            {matchItem.result_summary}
          </Text>
          {matchItem.venue ? (
            <Text style={styles.resultMeta}>
              📍 {matchItem.venue}  •  🏏 {matchItem.total_overs} overs
            </Text>
          ) : (
            <Text style={styles.resultMeta}>
              🏏 {matchItem.total_overs} overs
            </Text>
          )}
        </View>

        {/* Both innings scorecards */}
        {innings.map((inning, index) => renderInnings(inning, index))}

        <View style={styles.bottomSpacer} />

      </ScrollView>
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  safe:    { flex:1, backgroundColor:'#F5F5F5' },
  scroll:  { padding:16, paddingBottom:40 },
  loading: { flex:1, justifyContent:'center', alignItems:'center' },
  loadingText: { marginTop:12, color:'#888888', fontSize:15 },

  // Result banner
  resultBanner: {
    backgroundColor:'#1D9E75',
    borderRadius:16,
    padding:20,
    alignItems:'center',
    marginBottom:20,
    shadowColor:'#1D9E75',
    shadowOffset:{ width:0, height:4 },
    shadowOpacity:0.3,
    shadowRadius:8,
    elevation:6,
  },
  resultEmoji: { fontSize:40, marginBottom:8 },
  resultTeams: { fontSize:16, fontWeight:'bold', color:'#FFFFFF', marginBottom:6 },
  resultText:  { fontSize:18, fontWeight:'bold', color:'#FFFFFF', textAlign:'center', marginBottom:6 },
  resultMeta:  { fontSize:12, color:'rgba(255,255,255,0.8)' },

  // Innings block
  inningsBlock: {
    backgroundColor:'#FFFFFF',
    borderRadius:14,
    marginBottom:16,
    overflow:'hidden',
    shadowColor:'#000',
    shadowOffset:{ width:0, height:2 },
    shadowOpacity:0.06,
    shadowRadius:4,
    elevation:3,
  },

  inningsHeader: {
    backgroundColor:'#1D9E75',
    padding:14,
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
  },
  inningsTitle: { fontSize:14, fontWeight:'bold', color:'#FFFFFF' },
  inningsScore: { fontSize:20, fontWeight:'bold', color:'#FFFFFF' },

  extrasText: {
    fontSize:12,
    color:'#888888',
    padding:10,
    paddingHorizontal:14,
    borderBottomWidth:1,
    borderBottomColor:'#F0F0F0',
  },

  cardLabel: {
    fontSize:14,
    fontWeight:'bold',
    color:'#1A5276',
    padding:12,
    paddingHorizontal:14,
    backgroundColor:'#F0F8FF',
    borderBottomWidth:1,
    borderBottomColor:'#EEEEEE',
  },

  // Table
  table: { overflow:'hidden' },
  tableHeader: {
    flexDirection:'row',
    backgroundColor:'#F0FAF6',
    paddingVertical:8,
    paddingHorizontal:14,
    borderBottomWidth:1,
    borderBottomColor:'#EEEEEE',
  },
  headerText: { fontSize:11, fontWeight:'bold', color:'#1D9E75', textAlign:'center' },

  tableRow: {
    flexDirection:'row',
    paddingVertical:10,
    paddingHorizontal:14,
    alignItems:'center',
    borderBottomWidth:1,
    borderBottomColor:'#F5F5F5',
  },
  tableRowAlt: { backgroundColor:'#FAFAFA' },

  col:      { flex:1, textAlign:'center' },
  colWide:  { flex:3, textAlign:'left' },

  playerName: { fontSize:13, fontWeight:'600', color:'#1A1A1A' },
  howOut:     { fontSize:11, color:'#888888', marginTop:2 },

  statText:   { fontSize:12, color:'#333333', textAlign:'center' },
  statBold:   { fontWeight:'bold', color:'#1D9E75' },
  wicketText: { fontWeight:'bold', color:'#E24B4A' },

  noData: {
    textAlign:'center',
    padding:16,
    color:'#AAAAAA',
    fontStyle:'italic',
    fontSize:13,
  },

  bottomSpacer: { height:20 },
});