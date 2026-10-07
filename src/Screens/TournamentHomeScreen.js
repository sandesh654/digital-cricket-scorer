// src/Screens/TournamentHomeScreen.js
// Hub for a tournament: tabbed view of Group Stage (fixtures + points table)
// and Knockout (semi-finals + final bracket).

import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getTournamentById,
  getTournamentTeams,
  getTournamentMatches,
  createMatch,
  linkMatchToTournamentFixture,
  updateTournamentTeamStats,
  updateTournamentStatus,
  setKnockoutTeams,
} from '../database/db';

const GROUP_LETTERS = ['A', 'B', 'C', 'D'];
const TABS = ['Group Stage', 'Knockout'];

export default function TournamentHomeScreen({ route, navigation }) {
  const { tournamentId } = route.params;

  const [tab, setTab]             = useState(0);
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams]         = useState([]);
  const [fixtures, setFixtures]   = useState([]);

  const load = useCallback(() => {
    setTournament(getTournamentById(tournamentId));
    setTeams(getTournamentTeams(tournamentId));
    setFixtures(getTournamentMatches(tournamentId));
  }, [tournamentId]);

  useFocusEffect(load);

  if (!tournament) return null;

  // ── DATA HELPERS ───────────────────────────────────────────────────────────
  const groupFixtures  = fixtures.filter(f => f.stage === 'group');
  const semiFixtures   = fixtures.filter(f => f.stage === 'semi');
  const finalFixture   = fixtures.find(f  => f.stage === 'final');

  // teams grouped by group letter
  const groupedTeams = {};
  teams.forEach(t => {
    if (!groupedTeams[t.group_name]) groupedTeams[t.group_name] = [];
    groupedTeams[t.group_name].push(t);
  });

  // Check if all group matches are done
  const allGroupDone = groupFixtures.length > 0 &&
    groupFixtures.every(f => f.match_status === 'completed');

  // ── START A MATCH ──────────────────────────────────────────────────────────
  const startFixture = (fixture) => {
    if (fixture.team1_id === 0 || fixture.team2_id === 0) {
      Alert.alert('Not ready', 'Knockout teams are determined after the group stage ends.');
      return;
    }

    // Create a real match row
    const today = new Date().toISOString().slice(0, 10);
    const matchResult = createMatch(
      fixture.team1_id, fixture.team2_id,
      tournament.total_overs, '', today
    );
    const matchId = matchResult.lastInsertRowId;

    // Link it to the tournament fixture
    linkMatchToTournamentFixture(fixture.id, matchId);

    // Navigate to toss / setup — reuse existing NewMatch toss flow
    navigation.navigate('TournamentToss', {
      matchId,
      tournamentId,
      tournamentMatchId: fixture.id,
      team1: { id: fixture.team1_id, name: fixture.team1_name },
      team2: { id: fixture.team2_id, name: fixture.team2_name },
      totalOvers: tournament.total_overs,
      matchLabel: fixture.match_label,
    });
  };

  // ── ADVANCE TO KNOCKOUT ────────────────────────────────────────────────────
  const advanceToKnockout = () => {
    if (!allGroupDone) {
      Alert.alert('Group stage incomplete', 'All group matches must be completed first.');
      return;
    }

    Alert.alert(
      'Advance to Knockout?',
      'Top 2 teams from each group will proceed to the semi-finals.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Advance', onPress: () => {
            // Pick top team from each group (sorted by points desc already)
            const top = {};
            Object.entries(groupedTeams).forEach(([letter, arr]) => {
              const sorted = [...arr].sort((a, b) =>
                b.points - a.points || b.nrr - a.nrr
              );
              top[letter] = sorted;
            });

            const groupLetters = Object.keys(top).sort();
            // Semi 1: Group A 1st vs Group B 2nd
            // Semi 2: Group B 1st vs Group A 2nd
            if (semiFixtures.length >= 2 && groupLetters.length >= 2) {
              const [g1, g2] = groupLetters;
              setKnockoutTeams(
                semiFixtures[0].id,
                top[g1][0].team_id, top[g2][1]?.team_id ?? top[g2][0].team_id
              );
              setKnockoutTeams(
                semiFixtures[1].id,
                top[g2][0].team_id, top[g1][1]?.team_id ?? top[g1][0].team_id
              );
            }

            updateTournamentStatus(tournamentId, 'knockout');
            load();
            setTab(1);
          }
        }
      ]
    );
  };

  // ── RENDER FIXTURE CARD ────────────────────────────────────────────────────
  const renderFixture = (fixture) => {
    const isDone    = fixture.match_status === 'completed';
    const isLive    = fixture.match_status === 'live';
    const notStarted = !fixture.match_id;
    const isPlaceholder = fixture.team1_id === 0 || fixture.team2_id === 0;

    return (
      <View key={fixture.id} style={styles.fixtureCard}>
        <Text style={styles.fixtureLabel}>{fixture.match_label}</Text>

        <View style={styles.fixtureTeams}>
          <Text style={[styles.fixtureTeam, isDone && fixture.winner_id === fixture.team1_id && styles.fixtureWinner]}>
            {isPlaceholder ? 'TBD' : fixture.team1_name}
          </Text>
          <View style={styles.vsBox}>
            <Text style={styles.vsText}>{isDone ? 'vs' : 'vs'}</Text>
          </View>
          <Text style={[styles.fixtureTeam, styles.fixtureTeamRight, isDone && fixture.winner_id === fixture.team2_id && styles.fixtureWinner]}>
            {isPlaceholder ? 'TBD' : fixture.team2_name}
          </Text>
        </View>

        {isDone && (
          <Text style={styles.fixtureResult}>{fixture.result_summary}</Text>
        )}

        {isLive && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>🔴 LIVE</Text>
          </View>
        )}

        {notStarted && !isPlaceholder && (
          <TouchableOpacity style={styles.startBtn} onPress={() => startFixture(fixture)}>
            <Text style={styles.startBtnText}>▶  Start Match</Text>
          </TouchableOpacity>
        )}

        {notStarted && isPlaceholder && (
          <Text style={styles.tbaText}>Teams TBA after group stage</Text>
        )}
      </View>
    );
  };

  // ── RENDER POINTS TABLE ────────────────────────────────────────────────────
  const renderPointsTable = (letter, groupTeamList) => {
    const sorted = [...groupTeamList].sort((a, b) =>
      b.points - a.points || b.nrr - a.nrr
    );
    return (
      <View key={letter} style={styles.tableBlock}>
        <Text style={styles.groupHeading}>Group {letter}</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.col, styles.colWide, styles.thText]}>Team</Text>
          <Text style={[styles.col, styles.thText]}>P</Text>
          <Text style={[styles.col, styles.thText]}>W</Text>
          <Text style={[styles.col, styles.thText]}>L</Text>
          <Text style={[styles.col, styles.thText]}>Pts</Text>
        </View>
        {sorted.map((t, i) => (
          <View key={t.id} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
            <Text style={[styles.col, styles.colWide, styles.tdTeam]} numberOfLines={1}>
              {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : ''}{t.team_name}
            </Text>
            <Text style={[styles.col, styles.tdText]}>{t.played}</Text>
            <Text style={[styles.col, styles.tdText]}>{t.won}</Text>
            <Text style={[styles.col, styles.tdText]}>{t.lost}</Text>
            <Text style={[styles.col, styles.tdText, styles.tdPts]}>{t.points}</Text>
          </View>
        ))}
      </View>
    );
  };

  // ── MAIN RENDER ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerName}>{tournament.name}</Text>
        <Text style={styles.headerMeta}>
          {tournament.total_overs} overs  •  {tournament.num_groups} groups
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((label, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.tab, tab === i && styles.tabActive]}
            onPress={() => setTab(i)}
          >
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── GROUP STAGE TAB ─────────────────────────────────────────── */}
        {tab === 0 && (
          <>
            {/* Points tables */}
            {Object.entries(groupedTeams).sort().map(([letter, arr]) =>
              renderPointsTable(letter, arr)
            )}

            {/* Fixtures */}
            <Text style={styles.sectionHeading}>Fixtures</Text>
            {groupFixtures.map(renderFixture)}

            {/* Advance to Knockout button */}
            {tournament.status === 'group' && (
              <TouchableOpacity
                style={[styles.advanceBtn, !allGroupDone && styles.advanceBtnDisabled]}
                onPress={advanceToKnockout}
                activeOpacity={allGroupDone ? 0.8 : 1}
              >
                <Text style={styles.advanceBtnText}>
                  {allGroupDone ? '⚡  Advance to Knockout' : '⚡  Complete all group matches first'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── KNOCKOUT TAB ────────────────────────────────────────────── */}
        {tab === 1 && (
          <>
            {tournament.status === 'group' ? (
              <View style={styles.knockoutLocked}>
                <Text style={styles.knockoutLockedIcon}>🔒</Text>
                <Text style={styles.knockoutLockedText}>
                  Complete the group stage to unlock the knockout bracket.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionHeading}>Semi-Finals</Text>
                {semiFixtures.map(renderFixture)}

                <Text style={styles.sectionHeading}>Final</Text>
                {finalFixture && renderFixture(finalFixture)}
              </>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },

  header: {
    backgroundColor: '#1D9E75',
    padding: 20,
    paddingTop: 14,
  },
  headerName: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  headerMeta: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  tab: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  tabActive:     { borderBottomColor: '#1D9E75' },
  tabText:       { fontSize: 14, fontWeight: '600', color: '#888888' },
  tabTextActive: { color: '#1D9E75' },

  scroll: { padding: 16 },

  // Points table
  tableBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  groupHeading: {
    fontSize: 13, fontWeight: 'bold', color: '#FFFFFF',
    backgroundColor: '#1A5276', padding: 10, paddingHorizontal: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F0FAF6',
    paddingVertical: 8, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  tableRowAlt:  { backgroundColor: '#FAFAFA' },
  col:          { flex: 1, textAlign: 'center' },
  colWide:      { flex: 3, textAlign: 'left' },
  thText:       { fontSize: 11, fontWeight: 'bold', color: '#1D9E75', textAlign: 'center' },
  tdText:       { fontSize: 13, color: '#333333', textAlign: 'center' },
  tdTeam:       { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  tdPts:        { fontWeight: 'bold', color: '#1D9E75' },

  sectionHeading: {
    fontSize: 14, fontWeight: 'bold', color: '#1A5276',
    marginBottom: 10, marginTop: 4,
  },

  // Fixture card
  fixtureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  fixtureLabel: { fontSize: 11, color: '#888888', marginBottom: 10, fontWeight: '600' },
  fixtureTeams: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  fixtureTeam:  { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#1A1A1A' },
  fixtureTeamRight: { textAlign: 'right' },
  fixtureWinner:    { color: '#1D9E75' },
  vsBox:  { paddingHorizontal: 12 },
  vsText: { fontSize: 12, color: '#888888', fontWeight: '600' },

  fixtureResult: { fontSize: 12, color: '#555555', fontStyle: 'italic', textAlign: 'center', marginBottom: 4 },

  liveBadge: { alignSelf: 'center', backgroundColor: '#FFE4E4', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  liveBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#E24B4A' },

  startBtn: {
    backgroundColor: '#1D9E75', borderRadius: 10,
    padding: 12, alignItems: 'center', marginTop: 4,
  },
  startBtnText: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },

  tbaText: { fontSize: 12, color: '#AAAAAA', textAlign: 'center', fontStyle: 'italic' },

  advanceBtn: {
    backgroundColor: '#7F77DD', borderRadius: 14,
    padding: 16, alignItems: 'center', marginTop: 8,
    shadowColor: '#7F77DD',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 5, elevation: 4,
  },
  advanceBtnDisabled: { backgroundColor: '#CCCCCC', shadowOpacity: 0 },
  advanceBtnText: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },

  knockoutLocked: { alignItems: 'center', paddingTop: 60 },
  knockoutLockedIcon: { fontSize: 48, marginBottom: 16 },
  knockoutLockedText: { fontSize: 15, color: '#888888', textAlign: 'center', lineHeight: 22 },
});