// src/Screens/TournamentTossScreen.js
// Toss screen for tournament matches. After toss, navigates to ScoringScreen.
// When the match completes the tournament points table is updated automatically.

import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert,
} from 'react-native';
import {
  startMatch,
  createInnings,
  updateTournamentTeamStats,
  updateTournamentStatus,
  getTournamentMatches,
} from '../database/db';

export default function TournamentTossScreen({ route, navigation }) {
  const {
    matchId, tournamentId, tournamentMatchId,
    team1, team2, totalOvers, matchLabel,
  } = route.params;

  const [tossWinner, setTossWinner] = useState(null);  // team object
  const [decision, setDecision]     = useState(null);  // 'bat' | 'bowl'

  const handleStart = () => {
    if (!tossWinner || !decision) {
      Alert.alert('Toss incomplete', 'Select who won the toss and their decision.');
      return;
    }

    const battingTeam = decision === 'bat' ? tossWinner
      : tossWinner.id === team1.id ? team2 : team1;
    const bowlingTeam = battingTeam.id === team1.id ? team2 : team1;

    startMatch(matchId, tossWinner.id, decision);
    const inningsResult = createInnings(matchId, battingTeam.id, bowlingTeam.id, 1);

    navigation.replace('Scoring', {
      matchId,
      inningsId:    inningsResult.lastInsertRowId,
      battingTeam,
      bowlingTeam,
      totalOvers,
      teamA: team1,
      teamB: team2,
      inningsNumber: 1,
      // Pass tournament context so MatchSummary can update points
      tournamentId,
      tournamentMatchId,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.banner}>
          <Text style={styles.bannerLabel}>{matchLabel}</Text>
          <Text style={styles.bannerTeams}>{team1.name}  vs  {team2.name}</Text>
          <Text style={styles.bannerOvers}>{totalOvers} overs</Text>
        </View>

        <Text style={styles.sectionLabel}>Who won the toss?</Text>
        <View style={styles.row}>
          {[team1, team2].map(team => (
            <TouchableOpacity
              key={team.id}
              style={[styles.teamBtn, tossWinner?.id === team.id && styles.teamBtnActive]}
              onPress={() => setTossWinner(team)}
            >
              <Text style={[styles.teamBtnText, tossWinner?.id === team.id && styles.teamBtnTextActive]}>
                {team.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tossWinner && (
          <>
            <Text style={styles.sectionLabel}>{tossWinner.name} chose to…</Text>
            <View style={styles.row}>
              {['bat', 'bowl'].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.decisionBtn, decision === opt && styles.decisionBtnActive]}
                  onPress={() => setDecision(opt)}
                >
                  <Text style={[styles.decisionText, decision === opt && styles.decisionTextActive]}>
                    {opt === 'bat' ? '🏏  Bat' : '🎳  Bowl'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.startBtn, (!tossWinner || !decision) && styles.startBtnDisabled]}
          onPress={handleStart}
          activeOpacity={tossWinner && decision ? 0.8 : 1}
        >
          <Text style={styles.startBtnText}>▶  Start Match</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#F5F5F5' },
  container: { flex: 1, padding: 20 },

  banner: {
    backgroundColor: '#1D9E75', borderRadius: 16,
    padding: 20, alignItems: 'center', marginBottom: 28,
  },
  bannerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 6, fontWeight: '600' },
  bannerTeams: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  bannerOvers: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#555555', marginBottom: 12 },

  row: { flexDirection: 'row', gap: 12, marginBottom: 24 },

  teamBtn: {
    flex: 1, padding: 16, borderRadius: 12,
    backgroundColor: '#FFFFFF', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#DDDDDD',
  },
  teamBtnActive:     { backgroundColor: '#E8F8F2', borderColor: '#1D9E75' },
  teamBtnText:       { fontSize: 14, fontWeight: '600', color: '#555555' },
  teamBtnTextActive: { color: '#1D9E75' },

  decisionBtn: {
    flex: 1, padding: 16, borderRadius: 12,
    backgroundColor: '#FFFFFF', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#DDDDDD',
  },
  decisionBtnActive:   { backgroundColor: '#FFF8E8', borderColor: '#F0A500' },
  decisionText:        { fontSize: 16, fontWeight: 'bold', color: '#555555' },
  decisionTextActive:  { color: '#F0A500' },

  startBtn: {
    backgroundColor: '#1D9E75', borderRadius: 14,
    padding: 18, alignItems: 'center', marginTop: 'auto',
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 5,
  },
  startBtnDisabled: { backgroundColor: '#CCCCCC', shadowOpacity: 0 },
  startBtnText:     { fontSize: 17, fontWeight: 'bold', color: '#FFFFFF' },
});