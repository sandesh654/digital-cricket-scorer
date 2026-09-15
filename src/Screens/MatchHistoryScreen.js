// MatchHistoryScreen.js — List of all completed matches
// Tap any match card to view the full scorecard for both innings
// Data is loaded from SQLite using getCompletedMatches()

import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  SafeAreaView, TouchableOpacity
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getCompletedMatches } from '../database/db';

export default function MatchHistoryScreen({ navigation }) {

  // List of all completed matches loaded from SQLite
  const [matches, setMatches] = useState([]);

  // ── LOAD MATCHES ───────────────────────────────────────────────────────────
  // useFocusEffect runs every time this screen comes into view
  // This ensures the list is always up to date
  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [])
  );

  const loadMatches = () => {
    try {
      // getCompletedMatches() fetches all matches with status = 'completed'
      // It also joins the teams table to get team1_name and team2_name
      const result = getCompletedMatches();
      setMatches(result);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  // ── RENDER EACH MATCH CARD ─────────────────────────────────────────────────
  const renderMatch = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.matchCard,
        index % 2 === 0 && styles.matchCardGreen
      ]}
      // Navigate to MatchDetail screen passing the match data
      onPress={() => navigation.navigate('MatchDetail', {
        matchId:   item.id,
        matchItem: item
      })}
      activeOpacity={0.8}
    >

      {/* ── TEAMS AND DATE ─────────────────────────────────────────────── */}
      <View style={styles.matchHeader}>
        <Text style={styles.matchTeams} numberOfLines={1}>
          {item.team1_name} vs {item.team2_name}
        </Text>
        <Text style={styles.matchDate}>
          {item.match_date ?? 'N/A'}
        </Text>
      </View>

      {/* ── RESULT ────────────────────────────────────────────────────── */}
      {item.result_summary ? (
        <View style={styles.resultRow}>
          <Text style={styles.resultEmoji}>🏆</Text>
          <Text style={styles.resultText} numberOfLines={2}>
            {item.result_summary}
          </Text>
        </View>
      ) : null}

      {/* ── MATCH META ────────────────────────────────────────────────── */}
      <View style={styles.matchMeta}>
        <Text style={styles.matchMetaText}>
          🏏 {item.total_overs} overs
        </Text>
        {item.venue ? (
          <Text style={styles.matchMetaText} numberOfLines={1}>
            📍 {item.venue}
          </Text>
        ) : null}
      </View>

      {/* ── TAP HINT ──────────────────────────────────────────────────── */}
      <Text style={styles.tapHint}>Tap to view full scorecard →</Text>

    </TouchableOpacity>
  );

  // ── EMPTY STATE ────────────────────────────────────────────────────────────
  // Shown when no completed matches exist yet
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>No Matches Yet</Text>
      <Text style={styles.emptySubtitle}>
        Completed matches will appear here after you finish scoring a match
      </Text>
      <TouchableOpacity
        style={styles.newMatchBtn}
        onPress={() => navigation.navigate('MatchSetup')}
        activeOpacity={0.8}
      >
        <Text style={styles.newMatchBtnText}>🏏  Start a New Match</Text>
      </TouchableOpacity>
    </View>
  );

  // ── MAIN RENDER ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMatch}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={
          matches.length > 0 ? (
            <Text style={styles.countText}>
              {matches.length} match{matches.length !== 1 ? 'es' : ''} played
            </Text>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  safe: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  list: {
    padding: 16,
    paddingBottom: 40,
  },

  // Match count text at top
  countText: {
    fontSize: 13,
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: 12,
  },

  // Match card
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },

  // Every other card gets a green left border
  matchCardGreen: {
    borderLeftWidth: 4,
    borderLeftColor: '#1D9E75',
  },

  // Teams row
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  matchTeams: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 8,
  },

  matchDate: {
    fontSize: 12,
    color: '#888888',
  },

  // Result row
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },

  resultEmoji: {
    fontSize: 16,
  },

  resultText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#085041',
    flex: 1,
  },

  // Meta row — overs and venue
  matchMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  matchMetaText: {
    fontSize: 12,
    color: '#888888',
    flex: 1,
  },

  // Tap hint at bottom of card
  tapHint: {
    fontSize: 11,
    color: '#1D9E75',
    textAlign: 'right',
    fontStyle: 'italic',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },

  newMatchBtn: {
    backgroundColor: '#1D9E75',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },

  newMatchBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

});