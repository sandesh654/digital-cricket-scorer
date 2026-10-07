// MatchDetailScreen.js — Full scorecard for a completed match
// Shows both innings batting and bowling cards
// Loaded from SQLite using the match ID
// UPDATED: Added Player Performance Ratings

import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, ActivityIndicator, TouchableOpacity
} from 'react-native';
import {
  getInningsByMatch,
  getBattingScorecard,
  getBowlingScorecard,
  getMatchById,
} from '../database/db';
import {
  analyseMatch,
  getRatingColour,
  getRatingStars,
} from '../services/playerRatings';

export default function MatchDetailScreen({ route, navigation }) {

  const { matchId, matchItem } = route.params;

  const [match, setMatch]     = useState(null);
  const [innings, setInnings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Batting and bowling stats per innings
  // keyed by innings id
  const [battingData, setBattingData]   = useState({});
  const [bowlingData, setBowlingData]   = useState({});

  // ── PLAYER RATINGS STATE ───────────────────────────────────────────────────
  const [aiRatings, setAiRatings] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState(null);

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

  // ── PLAYER RATINGS ─────────────────────────────────────────────────────────
  const handlePlayerRatings = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiRatings(null);

    try {
      const matchInfo = {
        team1Name:     matchItem.team1_name,
        team2Name:     matchItem.team2_name,
        totalOvers:    matchItem.total_overs,
        resultSummary: matchItem.result_summary,
      };
      const result = await analyseMatch(matchInfo, innings, battingData, bowlingData);
      setAiRatings(result);
    } catch (err) {
      console.error('Ratings error:', err);
      setAiError('Could not generate ratings. Please try again.');
    } finally {
      setAiLoading(false);
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

  // ── RENDER PLAYER RATINGS ──────────────────────────────────────────────────
  const renderRatings = () => {
    if (aiLoading) {
      return (
        <View style={styles.ratingsLoadingBox}>
          <ActivityIndicator size="large" color="#8E44AD" />
          <Text style={styles.ratingsLoadingText}>Calculating player ratings…</Text>
        </View>
      );
    }

    if (aiError) {
      return (
        <View style={styles.ratingsErrorBox}>
          <Text style={styles.ratingsErrorText}>⚠️  {aiError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handlePlayerRatings}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!aiRatings) return null;

    const renderCard = (player, type) => {
      const colour = getRatingColour(player.rating);
      const stars  = getRatingStars(player.rating);
      return (
        <View key={`${type}-${player.playerId}`} style={styles.ratingCard}>
          <View style={styles.ratingLeft}>
            <Text style={styles.ratingName}>{player.playerName}</Text>
            <Text style={styles.ratingStars}>{stars}</Text>
            <Text style={styles.ratingComment}>{player.comment}</Text>
          </View>
          <View style={[styles.ratingBadge, { backgroundColor: colour }]}>
            <Text style={styles.ratingNumber}>{player.rating.toFixed(1)}</Text>
          </View>
        </View>
      );
    };

    return (
      <View style={styles.ratingsSection}>
        <View style={styles.ratingsSectionHeader}>
          <Text style={styles.ratingsSectionTitle}>⭐ Player Ratings</Text>
          <Text style={styles.ratingsSectionSubtitle}>Based on match performance</Text>
        </View>

        {aiRatings.battingRatings.length > 0 && (
          <View style={styles.ratingsGroup}>
            <Text style={styles.ratingsGroupLabel}>🏏 BATTING</Text>
            {aiRatings.battingRatings.map(p => renderCard(p, 'bat'))}
          </View>
        )}

        {aiRatings.bowlingRatings.length > 0 && (
          <View style={styles.ratingsGroup}>
            <Text style={styles.ratingsGroupLabel}>🎳 BOWLING</Text>
            {aiRatings.bowlingRatings.map(p => renderCard(p, 'bowl'))}
          </View>
        )}

        <View style={styles.legend}>
          {[
            { colour: '#1D9E75', label: '8–10  Excellent' },
            { colour: '#F0A500', label: '6–7.9  Good' },
            { colour: '#1A5276', label: '4–5.9  Average' },
            { colour: '#E24B4A', label: '0–3.9  Poor' },
          ].map(({ colour, label }) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colour }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

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

        {/* ── WIN PROBABILITY BUTTON (only if 2nd innings exists) ─────────── */}
        {innings.length >= 2 && (
          <TouchableOpacity
            style={styles.winProbBtn}
            onPress={() => navigation.navigate('WinProbability', {
              inningsId:       innings[1].id,
              target:          innings[0].total_runs + 1,
              totalOvers:      matchItem.total_overs,
              battingTeamName: matchItem.team2_name,
              bowlingTeamName: matchItem.team1_name,
            })}
            activeOpacity={0.8}
          >
            <Text style={styles.winProbBtnText}>📈  View Win Probability</Text>
          </TouchableOpacity>
        )}

        {/* ── PLAYER RATINGS BUTTON ────────────────────────────────────────── */}
        {!aiRatings && !aiLoading && (
          <TouchableOpacity
            style={styles.ratingsBtn}
            onPress={handlePlayerRatings}
            activeOpacity={0.8}
          >
            <Text style={styles.ratingsBtnText}>⭐  Get Player Ratings</Text>
          </TouchableOpacity>
        )}

        {/* ── RATINGS DISPLAY ──────────────────────────────────────────────── */}
        {renderRatings()}

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
    marginBottom:16,
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

  // Win Probability button
  winProbBtn: {
    backgroundColor: '#F0A500',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#F0A500',
    shadowOffset: { width:0, height:3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  winProbBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Player Ratings button
  ratingsBtn: {
    backgroundColor: '#8E44AD',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#8E44AD',
    shadowOffset: { width:0, height:3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  ratingsBtnText: { fontSize:16, fontWeight:'bold', color:'#FFFFFF' },

  // Ratings loading
  ratingsLoadingBox: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  ratingsLoadingText: { marginTop:12, fontSize:15, fontWeight:'600', color:'#8E44AD' },

  // Ratings error
  ratingsErrorBox: {
    backgroundColor: '#FFF3F3',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E24B4A',
  },
  ratingsErrorText: { color:'#E24B4A', fontSize:13, marginBottom:12 },
  retryBtn: {
    backgroundColor: '#E24B4A',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  retryBtnText: { color:'#FFF', fontWeight:'bold', fontSize:13 },

  // Ratings section
  ratingsSection: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#8E44AD', shadowOpacity: 0.12, shadowRadius: 6,
  },
  ratingsSectionHeader: {
    backgroundColor: '#8E44AD',
    padding: 14,
  },
  ratingsSectionTitle:    { color:'#FFF', fontSize:16, fontWeight:'bold' },
  ratingsSectionSubtitle: { color:'rgba(255,255,255,0.7)', fontSize:12, marginTop:2 },

  ratingsGroup: { paddingHorizontal:14, paddingTop:12, paddingBottom:4 },
  ratingsGroupLabel: {
    fontSize:12, fontWeight:'800', color:'#888',
    letterSpacing:1, marginBottom:10,
  },

  // Individual rating card
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  ratingLeft:    { flex:1, marginRight:12 },
  ratingName:    { fontSize:14, fontWeight:'700', color:'#1A1A1A', marginBottom:2 },
  ratingStars:   { fontSize:14, color:'#F0A500', marginBottom:4 },
  ratingComment: { fontSize:12, color:'#555', fontStyle:'italic' },
  ratingBadge: {
    width:52, height:52, borderRadius:26,
    justifyContent:'center', alignItems:'center',
    shadowColor:'#000', shadowOpacity:0.15, shadowRadius:4, elevation:2,
  },
  ratingNumber: { color:'#FFF', fontSize:16, fontWeight:'bold' },

  // Legend
  legend: {
    flexDirection:'row', flexWrap:'wrap',
    paddingHorizontal:14, paddingBottom:14, gap:8,
  },
  legendItem: { flexDirection:'row', alignItems:'center', gap:5, minWidth:'45%' },
  legendDot:  { width:10, height:10, borderRadius:5 },
  legendText: { fontSize:11, color:'#777' },

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