// PlayerStatsScreen.js — Career statistics for all players
// Shows batting and bowling career stats for every player
// across all matches stored in the SQLite database

import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  SafeAreaView, TouchableOpacity, ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getAllTeams,
  getPlayersByTeam,
  getPlayerBattingStats,
  getPlayerBowlingStats
} from '../database/db';

export default function PlayerStatsScreen() {

  // All teams loaded from database
  const [teams, setTeams]               = useState([]);

  // Currently selected team to view stats for
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Players in the selected team
  const [players, setPlayers]           = useState([]);

  // Stats for each player — keyed by player id
  const [battingStats, setBattingStats] = useState({});
  const [bowlingStats, setBowlingStats] = useState({});

  // Which tab is active — 'batting' or 'bowling'
  const [activeTab, setActiveTab]       = useState('batting');

  // ── LOAD TEAMS ─────────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      loadTeams();
    }, [])
  );

  const loadTeams = () => {
    try {
      const result = getAllTeams();
      setTeams(result);
      // Auto-select first team if available
      if (result.length > 0 && !selectedTeam) {
        selectTeam(result[0]);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  // ── SELECT A TEAM ──────────────────────────────────────────────────────────
  const selectTeam = (team) => {
    setSelectedTeam(team);
    try {
      // Load all players for this team
      const teamPlayers = getPlayersByTeam(team.id);
      setPlayers(teamPlayers);

      // Load batting and bowling stats for each player
      const bStats = {};
      const bowlStats = {};

      teamPlayers.forEach(player => {
        bStats[player.id]    = getPlayerBattingStats(player.id);
        bowlStats[player.id] = getPlayerBowlingStats(player.id);
      });

      setBattingStats(bStats);
      setBowlingStats(bowlStats);
    } catch (error) {
      console.error('Error loading player stats:', error);
    }
  };

  // ── CALCULATED VALUES ──────────────────────────────────────────────────────

  // Batting average = total runs / times dismissed
  const getBattingAverage = (stats) => {
    if (!stats) return '0.00';
    const dismissed = (stats.innings || 0) - 1; // subtract not outs
    if (dismissed <= 0) return (stats.total_runs || 0).toFixed(2);
    return ((stats.total_runs || 0) / dismissed).toFixed(2);
  };

  // Batting strike rate = (runs / balls) * 100
  const getBattingSR = (stats) => {
    if (!stats || !stats.total_balls) return '0.00';
    return ((stats.total_runs / stats.total_balls) * 100).toFixed(1);
  };

  // Bowling average = runs given / wickets taken
  const getBowlingAverage = (stats) => {
    if (!stats || !stats.total_wickets) return '-';
    return (stats.total_runs_given / stats.total_wickets).toFixed(2);
  };

  // Bowling economy = runs given / overs bowled
  const getBowlingEconomy = (stats) => {
    if (!stats || !stats.total_balls) return '0.00';
    return (stats.total_runs_given / (stats.total_balls / 6)).toFixed(2);
  };

  // Overs display e.g. 73 balls = "12.1"
  const getOvers = (balls) => {
    if (!balls) return '0.0';
    return `${Math.floor(balls / 6)}.${balls % 6}`;
  };

  // ── RENDER BATTING STATS ───────────────────────────────────────────────────
  const renderBattingStats = () => (
    <View style={styles.statsCard}>

      {/* Table header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.col, styles.colWide, styles.headerText]}>Player</Text>
        <Text style={[styles.col, styles.headerText]}>Inn</Text>
        <Text style={[styles.col, styles.headerText]}>Runs</Text>
        <Text style={[styles.col, styles.headerText]}>HS</Text>
        <Text style={[styles.col, styles.headerText]}>Avg</Text>
        <Text style={[styles.col, styles.headerText]}>SR</Text>
        <Text style={[styles.col, styles.headerText]}>50s</Text>
        <Text style={[styles.col, styles.headerText]}>100s</Text>
      </View>

      {/* Player rows */}
      {players.map((player, index) => {
        const stats = battingStats[player.id];
        return (
          <View
            key={player.id}
            style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}
          >
            <View style={[styles.col, styles.colWide]}>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.playerRole}>{player.role}</Text>
            </View>
            <Text style={[styles.col, styles.statText]}>
              {stats?.innings ?? 0}
            </Text>
            <Text style={[styles.col, styles.statText, styles.statBold]}>
              {stats?.total_runs ?? 0}
            </Text>
            <Text style={[styles.col, styles.statText]}>
              {stats?.highest_score ?? 0}
            </Text>
            <Text style={[styles.col, styles.statText]}>
              {getBattingAverage(stats)}
            </Text>
            <Text style={[styles.col, styles.statText]}>
              {getBattingSR(stats)}
            </Text>
            <Text style={[styles.col, styles.statText]}>
              {stats?.fifties ?? 0}
            </Text>
            <Text style={[styles.col, styles.statText]}>
              {stats?.hundreds ?? 0}
            </Text>
          </View>
        );
      })}

      {players.length === 0 && (
        <Text style={styles.noData}>No players in this team</Text>
      )}

    </View>
  );

  // ── RENDER BOWLING STATS ───────────────────────────────────────────────────
  const renderBowlingStats = () => (
    <View style={styles.statsCard}>

      {/* Table header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.col, styles.colWide, styles.headerText]}>Player</Text>
        <Text style={[styles.col, styles.headerText]}>Inn</Text>
        <Text style={[styles.col, styles.headerText]}>Ov</Text>
        <Text style={[styles.col, styles.headerText]}>Runs</Text>
        <Text style={[styles.col, styles.headerText]}>Wkts</Text>
        <Text style={[styles.col, styles.headerText]}>Avg</Text>
        <Text style={[styles.col, styles.headerText]}>Econ</Text>
      </View>

      {/* Player rows */}
      {players.map((player, index) => {
        const stats = bowlingStats[player.id];
        return (
          <View
            key={player.id}
            style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}
          >
            <View style={[styles.col, styles.colWide]}>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.playerRole}>{player.role}</Text>
            </View>
            <Text style={[styles.col, styles.statText]}>
              {stats?.innings_bowled ?? 0}
            </Text>
            <Text style={[styles.col, styles.statText]}>
              {getOvers(stats?.total_balls ?? 0)}
            </Text>
            <Text style={[styles.col, styles.statText]}>
              {stats?.total_runs_given ?? 0}
            </Text>
            <Text style={[styles.col, styles.statText, styles.wicketText]}>
              {stats?.total_wickets ?? 0}
            </Text>
            <Text style={[styles.col, styles.statText]}>
              {getBowlingAverage(stats)}
            </Text>
            <Text style={[styles.col, styles.statText]}>
              {getBowlingEconomy(stats)}
            </Text>
          </View>
        );
      })}

      {players.length === 0 && (
        <Text style={styles.noData}>No players in this team</Text>
      )}

    </View>
  );

  // ── MAIN RENDER ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>

      {/* Team selector tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.teamTabs}
        contentContainerStyle={styles.teamTabsContent}
      >
        {teams.map(team => (
          <TouchableOpacity
            key={team.id}
            style={[
              styles.teamTab,
              selectedTeam?.id === team.id && styles.teamTabSelected
            ]}
            onPress={() => selectTeam(team)}
          >
            <Text style={[
              styles.teamTabText,
              selectedTeam?.id === team.id && styles.teamTabTextSelected
            ]}>
              {team.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Batting / Bowling tab switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'batting' && styles.tabActive]}
          onPress={() => setActiveTab('batting')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'batting' && styles.tabTextActive
          ]}>
            🏏 Batting
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bowling' && styles.tabActive]}
          onPress={() => setActiveTab('bowling')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'bowling' && styles.tabTextActive
          ]}>
            🎳 Bowling
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats table */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ScrollView>
          {activeTab === 'batting'
            ? renderBattingStats()
            : renderBowlingStats()
          }
        </ScrollView>
      </ScrollView>

      {/* Empty state if no teams */}
      {teams.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No Teams Found</Text>
          <Text style={styles.emptySubtitle}>
            Create teams and play matches to see statistics here
          </Text>
        </View>
      )}

    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  safe: { flex:1, backgroundColor:'#F5F5F5' },

  // Team selector tabs
  teamTabs: {
    backgroundColor:'#FFFFFF',
    borderBottomWidth:1,
    borderBottomColor:'#EEEEEE',
    maxHeight:56,
  },
  teamTabsContent: {
    paddingHorizontal:12,
    paddingVertical:10,
    gap:8,
  },
  teamTab: {
    paddingHorizontal:16,
    paddingVertical:8,
    borderRadius:20,
    backgroundColor:'#F0F0F0',
    borderWidth:1,
    borderColor:'#E0E0E0',
  },
  teamTabSelected: {
    backgroundColor:'#1D9E75',
    borderColor:'#1D9E75',
  },
  teamTabText:         { fontSize:13, fontWeight:'600', color:'#555555' },
  teamTabTextSelected: { color:'#FFFFFF' },

  // Batting/Bowling tab switcher
  tabSwitcher: {
    flexDirection:'row',
    backgroundColor:'#FFFFFF',
    padding:12,
    gap:10,
    borderBottomWidth:1,
    borderBottomColor:'#EEEEEE',
  },
  tab: {
    flex:1, padding:10, borderRadius:10,
    alignItems:'center', backgroundColor:'#F5F5F5',
    borderWidth:1, borderColor:'#E0E0E0',
  },
  tabActive:     { backgroundColor:'#1D9E75', borderColor:'#1D9E75' },
  tabText:       { fontSize:14, fontWeight:'600', color:'#555555' },
  tabTextActive: { color:'#FFFFFF' },

  // Stats card
  statsCard: {
    backgroundColor:'#FFFFFF',
    margin:12,
    borderRadius:14,
    overflow:'hidden',
    shadowColor:'#000',
    shadowOffset:{ width:0, height:2 },
    shadowOpacity:0.08,
    shadowRadius:4,
    elevation:3,
    minWidth:600,
  },

  // Table
  tableHeader: {
    flexDirection:'row',
    backgroundColor:'#1D9E75',
    paddingVertical:12,
    paddingHorizontal:12,
  },
  headerText: {
    fontSize:11,
    fontWeight:'bold',
    color:'#FFFFFF',
    textAlign:'center',
  },
  tableRow: {
    flexDirection:'row',
    paddingVertical:12,
    paddingHorizontal:12,
    alignItems:'center',
    borderBottomWidth:1,
    borderBottomColor:'#F0F0F0',
  },
  tableRowAlt: { backgroundColor:'#FAFAFA' },

  col:     { flex:1, textAlign:'center' },
  colWide: { flex:2.5, textAlign:'left' },

  playerName: { fontSize:13, fontWeight:'600', color:'#1A1A1A' },
  playerRole: { fontSize:11, color:'#888888', marginTop:2 },

  statText:   { fontSize:12, color:'#333333', textAlign:'center' },
  statBold:   { fontWeight:'bold', color:'#1D9E75' },
  wicketText: { fontWeight:'bold', color:'#E24B4A' },

  noData: {
    textAlign:'center',
    padding:20,
    color:'#AAAAAA',
    fontStyle:'italic',
  },

  // Empty state
  emptyContainer: {
    flex:1, alignItems:'center',
    justifyContent:'center', padding:40,
  },
  emptyIcon:     { fontSize:64, marginBottom:16 },
  emptyTitle:    { fontSize:22, fontWeight:'bold', color:'#1A1A1A', marginBottom:8 },
  emptySubtitle: { fontSize:14, color:'#888888', textAlign:'center', lineHeight:22 },
});