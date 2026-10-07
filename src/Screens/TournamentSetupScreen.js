// src/Screens/TournamentSetupScreen.js
// Create a new tournament: name, overs, number of groups, pick teams per group.

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert,
} from 'react-native';
import {
  getAllTeams,
  createTournament,
  addTeamToTournament,
  addTournamentMatch,
  updateTournamentStatus,
} from '../database/db';

const GROUP_LETTERS = ['A', 'B', 'C', 'D'];

// Generate round-robin fixtures within a group
const roundRobin = (teams) => {
  const fixtures = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      fixtures.push([teams[i], teams[j]]);
    }
  }
  return fixtures;
};

export default function TournamentSetupScreen({ navigation }) {
  const [name, setName]         = useState('');
  const [overs, setOvers]       = useState('20');
  const [numGroups, setNumGroups] = useState(2);

  // groupTeams[groupIndex] = array of team objects selected for that group
  const [groupTeams, setGroupTeams] = useState({ 0: [], 1: [], 2: [], 3: [] });

  const allTeams = getAllTeams();

  // Teams already assigned to any group
  const assignedIds = new Set(
    Object.values(groupTeams).flat().map(t => t.id)
  );

  const toggleTeam = (groupIdx, team) => {
    setGroupTeams(prev => {
      const current = prev[groupIdx] ?? [];
      const already = current.find(t => t.id === team.id);
      if (already) {
        return { ...prev, [groupIdx]: current.filter(t => t.id !== team.id) };
      }
      // Don't allow same team in two groups
      if (assignedIds.has(team.id)) {
        Alert.alert('Already assigned', `${team.name} is already in another group.`);
        return prev;
      }
      return { ...prev, [groupIdx]: [...current, team] };
    });
  };

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter a tournament name.');
      return;
    }
    const parsedOvers = parseInt(overs, 10);
    if (!parsedOvers || parsedOvers < 1) {
      Alert.alert('Invalid overs', 'Please enter a valid number of overs.');
      return;
    }

    // Validate: every group must have at least 2 teams
    for (let g = 0; g < numGroups; g++) {
      if ((groupTeams[g] ?? []).length < 2) {
        Alert.alert(
          'Not enough teams',
          `Group ${GROUP_LETTERS[g]} needs at least 2 teams.`
        );
        return;
      }
    }

    try {
      // 1. Create tournament row
      const result = createTournament(name.trim(), parsedOvers, numGroups);
      const tournamentId = result.lastInsertRowId;

      // 2. Register teams per group
      for (let g = 0; g < numGroups; g++) {
        const letter = GROUP_LETTERS[g];
        (groupTeams[g] ?? []).forEach(team => {
          addTeamToTournament(tournamentId, team.id, letter);
        });
      }

      // 3. Generate group stage fixtures
      for (let g = 0; g < numGroups; g++) {
        const letter = GROUP_LETTERS[g];
        const teams  = groupTeams[g] ?? [];
        const fixtures = roundRobin(teams);
        fixtures.forEach(([t1, t2], i) => {
          addTournamentMatch(
            tournamentId, t1.id, t2.id,
            'group', letter,
            `Group ${letter} — Match ${i + 1}`
          );
        });
      }

      // 4. Create knockout placeholder fixtures (semi-finals + final)
      // Semis: top team from each group cross-over (A1 vs B2, B1 vs A2)
      // We'll use placeholder team IDs (0) for now — filled in when group stage ends
      if (numGroups >= 2) {
        addTournamentMatch(tournamentId, 0, 0, 'semi', null, 'Semi-Final 1');
        addTournamentMatch(tournamentId, 0, 0, 'semi', null, 'Semi-Final 2');
      }
      addTournamentMatch(tournamentId, 0, 0, 'final', null, 'Final');

      // 5. Move tournament to group stage
      updateTournamentStatus(tournamentId, 'group');

      Alert.alert(
        '🏆 Tournament Created!',
        `${name.trim()} is ready. Fixtures have been generated.`,
        [{ text: 'View Tournament', onPress: () => {
          navigation.replace('TournamentHome', { tournamentId });
        }}]
      );

    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not create tournament. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── TOURNAMENT DETAILS ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tournament Details</Text>

          <Text style={styles.label}>Tournament Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. DMU Inter-School Cup 2025"
            placeholderTextColor="#AAAAAA"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Overs per innings</Text>
          <TextInput
            style={[styles.input, styles.inputSmall]}
            keyboardType="number-pad"
            placeholder="20"
            placeholderTextColor="#AAAAAA"
            value={overs}
            onChangeText={setOvers}
          />

          <Text style={styles.label}>Number of Groups</Text>
          <View style={styles.groupCountRow}>
            {[2, 3, 4].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.groupCountBtn, numGroups === n && styles.groupCountBtnActive]}
                onPress={() => setNumGroups(n)}
              >
                <Text style={[styles.groupCountText, numGroups === n && styles.groupCountTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── TEAM ASSIGNMENT ─────────────────────────────────────────── */}
        {Array.from({ length: numGroups }).map((_, g) => (
          <View key={g} style={styles.section}>
            <Text style={styles.sectionTitle}>Group {GROUP_LETTERS[g]} Teams</Text>
            <Text style={styles.sectionSubtitle}>
              {(groupTeams[g] ?? []).length} selected — minimum 2
            </Text>

            {allTeams.length === 0 ? (
              <Text style={styles.noTeams}>
                No teams found. Create teams first from the Teams screen.
              </Text>
            ) : (
              allTeams.map(team => {
                const inThisGroup   = !!(groupTeams[g] ?? []).find(t => t.id === team.id);
                const inOtherGroup  = !inThisGroup && assignedIds.has(team.id);
                return (
                  <TouchableOpacity
                    key={team.id}
                    style={[
                      styles.teamRow,
                      inThisGroup  && styles.teamRowSelected,
                      inOtherGroup && styles.teamRowDisabled,
                    ]}
                    onPress={() => !inOtherGroup && toggleTeam(g, team)}
                    activeOpacity={inOtherGroup ? 1 : 0.7}
                  >
                    <View style={[
                      styles.checkbox,
                      inThisGroup && styles.checkboxChecked,
                    ]}>
                      {inThisGroup && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.teamName, inOtherGroup && styles.teamNameDisabled]}>
                        {team.name}
                      </Text>
                      {inOtherGroup && (
                        <Text style={styles.assignedLabel}>
                          Assigned to Group {
                            GROUP_LETTERS[
                              Object.entries(groupTeams).find(([, arr]) =>
                                arr.find(t => t.id === team.id)
                              )?.[0]
                            ]
                          }
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ))}

        {/* ── CREATE BUTTON ───────────────────────────────────────────── */}
        <TouchableOpacity style={styles.createBtn} onPress={handleCreate} activeOpacity={0.8}>
          <Text style={styles.createBtnText}>🏆  Create Tournament & Generate Fixtures</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { padding: 16 },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle:    { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: '#888888', marginBottom: 12 },

  label: { fontSize: 13, fontWeight: '600', color: '#555555', marginBottom: 6, marginTop: 10 },

  input: {
    borderWidth: 1.5,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
  },
  inputSmall: { width: 100 },

  groupCountRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  groupCountBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#DDDDDD',
  },
  groupCountBtnActive: { backgroundColor: '#1D9E75', borderColor: '#1D9E75' },
  groupCountText:      { fontSize: 20, fontWeight: 'bold', color: '#555555' },
  groupCountTextActive:{ color: '#FFFFFF' },

  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
    gap: 12,
  },
  teamRowSelected: { backgroundColor: '#E8F8F2', borderColor: '#1D9E75' },
  teamRowDisabled: { opacity: 0.45 },

  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#1D9E75', borderColor: '#1D9E75' },
  checkMark: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },

  teamName:         { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  teamNameDisabled: { color: '#AAAAAA' },
  assignedLabel:    { fontSize: 11, color: '#F0A500', marginTop: 2 },

  noTeams: { color: '#AAAAAA', fontStyle: 'italic', textAlign: 'center', padding: 16 },

  createBtn: {
    backgroundColor: '#1D9E75',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  createBtnText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
});