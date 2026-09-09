// MatchSummaryScreen.js — Final result screen shown when match ends
// Shows: match result, both team scorecards, and match details

import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, TouchableOpacity
} from 'react-native';
import { getInningsByMatch } from '../database/db';
import { useState, useEffect } from 'react';

export default function MatchSummaryScreen({ route, navigation }) {

  const { matchId, teamA, teamB, resultText } = route.params;

  // Innings data loaded from database
  const [innings, setInnings] = useState([]);

  // ── LOAD INNINGS DATA ──────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const data = getInningsByMatch(matchId);
      setInnings(data);
    } catch (error) {
      console.error('Error loading innings:', error);
    }
  }, []);

  // ── RENDER ONE INNINGS SUMMARY ─────────────────────────────────────────────
  const renderInningsSummary = (inning, index) => {
    if (!inning) return null;

    const overs = Math.floor(inning.total_balls / 6);
    const balls = inning.total_balls % 6;
    const oversDisplay = `${overs}.${balls}`;

    return (
      <View key={inning.id} style={styles.inningsCard}>
        <View style={styles.inningsHeader}>
          <Text style={styles.inningsTitle}>
            {index + 1}{index === 0 ? 'st' : 'nd'} Innings
          </Text>
        </View>

        {/* Score row */}
        <View style={styles.scoreRow}>
          <Text style={styles.inningsTeam}>
            {index === 0 ? teamA.name : teamB.name}
          </Text>
          <Text style={styles.inningsScore}>
            {inning.total_runs}/{inning.total_wickets}
          </Text>
        </View>

        {/* Details */}
        <View style={styles.inningsDetails}>
          <Text style={styles.inningsDetail}>
            Overs: {oversDisplay}
          </Text>
          <Text style={styles.inningsDetail}>
            Extras: {inning.extras ?? 0}
          </Text>
          <Text style={styles.inningsDetail}>
            Run Rate: {inning.total_balls > 0
              ? (inning.total_runs / (inning.total_balls / 6)).toFixed(2)
              : '0.00'}
          </Text>
        </View>
      </View>
    );
  };

  // ── MAIN RENDER ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── RESULT BANNER ──────────────────────────────────────────────── */}
        <View style={styles.resultBanner}>
          <Text style={styles.resultEmoji}>🏆</Text>
          <Text style={styles.resultTitle}>Match Result</Text>
          <Text style={styles.resultText}>{resultText}</Text>
        </View>

        {/* ── MATCH DETAILS ──────────────────────────────────────────────── */}
        <View style={styles.matchDetails}>
          <Text style={styles.matchDetailTitle}>Match Details</Text>
          <View style={styles.matchDetailRow}>
            <Text style={styles.matchDetailLabel}>Teams</Text>
            <Text style={styles.matchDetailValue}>
              {teamA.name} vs {teamB.name}
            </Text>
          </View>
        </View>

        {/* ── INNINGS SUMMARIES ───────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Innings Summary</Text>
        {innings.map((inning, index) => renderInningsSummary(inning, index))}

        {/* ── ACTION BUTTONS ──────────────────────────────────────────────── */}
        <View style={styles.buttons}>

          {/* View full scorecard */}
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => navigation.navigate('MatchHistory')}
            activeOpacity={0.8}
          >
            <Text style={styles.btnSecondaryText}>📋  Match History</Text>
          </TouchableOpacity>

          {/* Go home */}
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.8}
          >
            <Text style={styles.btnPrimaryText}>🏠  Back to Home</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  safe:   { flex:1, backgroundColor:'#F5F5F5' },
  scroll: { padding:20, paddingBottom:40 },

  // Result banner
  resultBanner: {
    backgroundColor:'#1D9E75', borderRadius:16,
    padding:28, alignItems:'center', marginBottom:20,
    shadowColor:'#1D9E75', shadowOffset:{width:0,height:4},
    shadowOpacity:0.3, shadowRadius:8, elevation:6,
  },
  resultEmoji: { fontSize:56, marginBottom:8 },
  resultTitle: { fontSize:16, color:'rgba(255,255,255,0.85)', fontWeight:'600', marginBottom:8 },
  resultText:  { fontSize:22, fontWeight:'bold', color:'#FFFFFF', textAlign:'center', lineHeight:30 },

  // Match details
  matchDetails: {
    backgroundColor:'#FFFFFF', borderRadius:14, padding:16, marginBottom:20,
    shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:3, elevation:2,
  },
  matchDetailTitle: { fontSize:14, fontWeight:'bold', color:'#1D9E75', marginBottom:10 },
  matchDetailRow:   { flexDirection:'row', justifyContent:'space-between', paddingVertical:6, borderBottomWidth:1, borderBottomColor:'#F0F0F0' },
  matchDetailLabel: { fontSize:13, color:'#888888' },
  matchDetailValue: { fontSize:13, fontWeight:'600', color:'#1A1A1A' },

  // Section title
  sectionTitle: { fontSize:16, fontWeight:'bold', color:'#1A1A1A', marginBottom:12 },

  // Innings card
  inningsCard: {
    backgroundColor:'#FFFFFF', borderRadius:14, marginBottom:14, overflow:'hidden',
    shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:3, elevation:2,
  },
  inningsHeader: { backgroundColor:'#E8F8F2', padding:10 },
  inningsTitle:  { fontSize:13, fontWeight:'bold', color:'#1D9E75' },
  scoreRow: {
    flexDirection:'row', justifyContent:'space-between',
    alignItems:'center', padding:16,
    borderBottomWidth:1, borderBottomColor:'#F0F0F0',
  },
  inningsTeam:  { fontSize:16, fontWeight:'bold', color:'#1A1A1A' },
  inningsScore: { fontSize:24, fontWeight:'bold', color:'#1D9E75' },
  inningsDetails: {
    flexDirection:'row', justifyContent:'space-between',
    padding:12, backgroundColor:'#FAFAFA',
  },
  inningsDetail: { fontSize:12, color:'#888888' },

  // Buttons
  buttons: { gap:12, marginTop:8 },
  btnPrimary: {
    backgroundColor:'#1D9E75', borderRadius:14,
    padding:16, alignItems:'center',
  },
  btnPrimaryText: { fontSize:16, fontWeight:'bold', color:'#FFFFFF' },
  btnSecondary: {
    backgroundColor:'#FFFFFF', borderRadius:14,
    padding:16, alignItems:'center',
    borderWidth:1.5, borderColor:'#1D9E75',
  },
  btnSecondaryText: { fontSize:16, fontWeight:'600', color:'#1D9E75' },
});