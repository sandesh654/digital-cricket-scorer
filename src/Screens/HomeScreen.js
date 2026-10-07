// HomeScreen.js — Main menu of the Cricket Scorer app
// This is the first screen users see when they open the app
// UPDATED: Shows a "Resume Match" button when a live match is found in the DB

import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getLiveMatches, getCurrentInnings, getInningsByMatch } from '../database/db';

export default function HomeScreen({ navigation }) {

  const [liveMatch, setLiveMatch] = useState(null);

  // Re-check for a live match every time the user lands on this screen
  useFocusEffect(
    useCallback(() => {
      try {
        const live = getLiveMatches();
        setLiveMatch(live && live.length > 0 ? live[0] : null);
      } catch (e) {
        setLiveMatch(null);
      }
    }, [])
  );

  // ── RESUME MATCH ───────────────────────────────────────────────────────────
  const handleResumeMatch = () => {
    if (!liveMatch) return;
    try {
      // Find the current (incomplete) innings
      const currentInnings = getCurrentInnings(liveMatch.id);
      if (!currentInnings) return;

      const teamA = { id: liveMatch.team1_id, name: liveMatch.team1_name };
      const teamB = { id: liveMatch.team2_id, name: liveMatch.team2_name };

      const battingTeam = {
        id:   currentInnings.batting_team_id,
        name: currentInnings.batting_team_id === teamA.id ? teamA.name : teamB.name,
      };
      const bowlingTeam = {
        id:   currentInnings.bowling_team_id,
        name: currentInnings.bowling_team_id === teamA.id ? teamA.name : teamB.name,
      };

      // For 2nd innings, get the 1st innings total to set the target
      let target = null;
      if (currentInnings.innings_number === 2) {
        const allInnings = getInningsByMatch(liveMatch.id);
        const first = allInnings.find(i => i.innings_number === 1);
        if (first) target = first.total_runs + 1;
      }

      navigation.navigate('Scoring', {
        matchId:       liveMatch.id,
        inningsId:     currentInnings.id,
        battingTeam,
        bowlingTeam,
        totalOvers:    liveMatch.total_overs,
        teamA,
        teamB,
        tossWinner:    { id: liveMatch.toss_winner_id, name: liveMatch.toss_winner_name },
        tossDecision:  liveMatch.toss_decision,
        inningsNumber: currentInnings.innings_number,
        target,
        resuming: true,
      });
    } catch (e) {
      console.error('Resume error:', e);
    }
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* ── APP LOGO / HEADER ─────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.logo}>🏏</Text>
          <Text style={styles.appName}>Cricket Scorer</Text>
          <Text style={styles.tagline}>Simple scoring for local matches</Text>
        </View>

        {/* ── RESUME MATCH (amber banner — only visible when a live match exists) */}
        {liveMatch && (
          <TouchableOpacity
            style={styles.resumeButton}
            onPress={handleResumeMatch}
            activeOpacity={0.8}
          >
            <Text style={styles.resumeIcon}>▶️</Text>
            <View style={styles.buttonText}>
              <Text style={styles.resumeTitle}>Resume Match</Text>
              <Text style={styles.resumeSubtitle}>
                {liveMatch.team1_name} vs {liveMatch.team2_name}
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── MAIN BUTTONS ──────────────────────────────────────────────────── */}
        <View style={styles.buttonContainer}>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => navigation.navigate('MatchSetup')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>🆕</Text>
            <View style={styles.buttonText}>
              <Text style={styles.buttonTitle}>New Match</Text>
              <Text style={styles.buttonSubtitle}>Start scoring a match</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('MatchHistory')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>📋</Text>
            <View style={styles.buttonText}>
              <Text style={[styles.buttonTitle, styles.darkText]}>Match History</Text>
              <Text style={styles.buttonSubtitleDark}>View past matches</Text>
            </View>
            <Text style={[styles.arrow, styles.darkArrow]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('Teams')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>👥</Text>
            <View style={styles.buttonText}>
              <Text style={[styles.buttonTitle, styles.darkText]}>Teams & Players</Text>
              <Text style={styles.buttonSubtitleDark}>Manage your teams</Text>
            </View>
            <Text style={[styles.arrow, styles.darkArrow]}>›</Text>
          </TouchableOpacity>

          {/* ── TOURNAMENTS ─────────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.button, styles.tournamentButton]}
            onPress={() => navigation.navigate('TournamentsList')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>🏆</Text>
            <View style={styles.buttonText}>
              <Text style={styles.buttonTitle}>Tournaments</Text>
              <Text style={styles.buttonSubtitle}>Group stage &amp; knockout</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

        </View>

        {/* ── FOOTER ────────────────────────────────────────────────────────── */}
        <Text style={styles.footer}>BSc Computer Science FYP — DMU 2026</Text>

      </View>
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  safe: {
    flex: 1,
    backgroundColor: '#1D9E75',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 72,
    marginBottom: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1D9E75',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
  },

  // ── Amber Resume button ────────────────────────────────────────────────────
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#F0A500',
    marginBottom: 16,
    shadowColor: '#F0A500',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  resumeIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  resumeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  resumeSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },

  buttonContainer: {
    flex: 1,
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#1D9E75',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tournamentButton: {
    backgroundColor: '#7F77DD',
    shadowColor: '#7F77DD',
    shadowOpacity: 0.35,
  },
  buttonIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  buttonText: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  darkText: {
    color: '#1A1A1A',
  },
  buttonSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  buttonSubtitleDark: {
    fontSize: 13,
    color: '#888888',
  },
  arrow: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  darkArrow: {
    color: '#CCCCCC',
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#AAAAAA',
    marginTop: 24,
  },
});