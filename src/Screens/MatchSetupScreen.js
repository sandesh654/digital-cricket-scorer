// MatchSetupScreen.js — Configure a new match before it starts
// This screen allows users to:
// 1. Select Team A and Team B
// 2. Set number of overs
// 3. Enter venue and date
// 4. Choose toss winner and decision
// 5. Start the match

import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, TextInput
} from 'react-native';
import { getAllTeams, createMatch, createInnings, startMatch } from '../database/db';

// Available over options for the match
const OVER_OPTIONS = [5, 10, 15, 20, 25, 50];

export default function MatchSetupScreen({ navigation }) {

  // All teams loaded from SQLite
  const [teams, setTeams] = useState([]);

  // Selected teams
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);

  // Match settings
  const [totalOvers, setTotalOvers]   = useState(20);
  const [venue, setVenue]             = useState('');
  const [matchDate, setMatchDate]     = useState(
    new Date().toLocaleDateString('en-GB') // Default to today
  );

  // Toss settings
  const [tossWinner, setTossWinner]   = useState(null); // team object
  const [tossDecision, setTossDecision] = useState('bat'); // 'bat' or 'field'

  // Which team selector is active — 'A', 'B', or null
  const [selectingTeam, setSelectingTeam] = useState(null);

  // ── LOAD TEAMS ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = () => {
    try {
      const result = getAllTeams();
      setTeams(result);

      // Show warning if fewer than 2 teams exist
      if (result.length < 2) {
        Alert.alert(
          'Not Enough Teams',
          'You need at least 2 teams to start a match. Please create teams first.',
          [{ text: 'Go to Teams', onPress: () => navigation.navigate('Teams') }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Could not load teams.');
    }
  };

  // ── START MATCH ────────────────────────────────────────────────────────────
  const handleStartMatch = () => {

    // Validate all required fields
    if (!teamA) {
      Alert.alert('Error', 'Please select Team A.'); return;
    }
    if (!teamB) {
      Alert.alert('Error', 'Please select Team B.'); return;
    }
    if (teamA.id === teamB.id) {
      Alert.alert('Error', 'Team A and Team B must be different teams.'); return;
    }
    if (!tossWinner) {
      Alert.alert('Error', 'Please select the toss winner.'); return;
    }

    try {
      // Step 1 — Create the match record in SQLite
      const matchResult = createMatch(
        teamA.id,
        teamB.id,
        totalOvers,
        venue.trim(),
        matchDate
      );
      const matchId = matchResult.lastInsertRowId;

      // Step 2 — Update match with toss information
      startMatch(matchId, tossWinner.id, tossDecision);

      // Step 3 — Determine which team bats first
      // If toss winner chose to bat, they bat first
      // If toss winner chose to field, the other team bats first
      let battingTeam, bowlingTeam;
      if (tossDecision === 'bat') {
        battingTeam = tossWinner;
        bowlingTeam = tossWinner.id === teamA.id ? teamB : teamA;
      } else {
        bowlingTeam = tossWinner;
        battingTeam = tossWinner.id === teamA.id ? teamB : teamA;
      }

      // Step 4 — Create the first innings record
      const inningsResult = createInnings(
        matchId,
        battingTeam.id,
        bowlingTeam.id,
        1  // First innings
      );
      const inningsId = inningsResult.lastInsertRowId;

      // Step 5 — Navigate to the Scoring screen
      // Pass all necessary match information
      navigation.navigate('Scoring', {
        matchId,
        inningsId,
        battingTeam,
        bowlingTeam,
        totalOvers,
        teamA,
        teamB,
        tossWinner,
        tossDecision,
        inningsNumber: 1,
      });

    } catch (error) {
      console.error('Error starting match:', error);
      Alert.alert('Error', 'Could not start match. Please try again.');
    }
  };

  // ── TEAM SELECTOR ──────────────────────────────────────────────────────────
  // Shows a list of available teams to choose from
  const renderTeamSelector = () => {
    if (!selectingTeam) return null;

    // Filter out already selected teams
    const availableTeams = teams.filter(t => {
      if (selectingTeam === 'A') return t.id !== teamB?.id;
      if (selectingTeam === 'B') return t.id !== teamA?.id;
      return true;
    });

    return (
      <View style={styles.selectorOverlay}>
        <View style={styles.selectorBox}>
          <Text style={styles.selectorTitle}>
            Select {selectingTeam === 'A' ? 'Team A' : 'Team B'}
          </Text>
          {availableTeams.map(team => (
            <TouchableOpacity
              key={team.id}
              style={styles.selectorTeam}
              onPress={() => {
                if (selectingTeam === 'A') setTeamA(team);
                else setTeamB(team);
                // Reset toss if team changes
                setTossWinner(null);
                setSelectingTeam(null);
              }}
            >
              <View style={styles.selectorIcon}>
                <Text style={styles.selectorIconText}>
                  {team.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.selectorTeamName}>{team.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.selectorCancel}
            onPress={() => setSelectingTeam(null)}
          >
            <Text style={styles.selectorCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── MAIN RENDER ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── SECTION 1: SELECT TEAMS ─────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Select Teams</Text>

        <View style={styles.teamsRow}>

          {/* Team A selector */}
          <TouchableOpacity
            style={[styles.teamSlot, teamA && styles.teamSlotFilled]}
            onPress={() => setSelectingTeam('A')}
            activeOpacity={0.8}
          >
            {teamA ? (
              <>
                <View style={styles.teamSlotIcon}>
                  <Text style={styles.teamSlotIconText}>
                    {teamA.name.charAt(0)}
                  </Text>
                </View>
                <Text style={styles.teamSlotName}>{teamA.name}</Text>
                <Text style={styles.teamSlotLabel}>Team A</Text>
              </>
            ) : (
              <>
                <Text style={styles.teamSlotPlus}>+</Text>
                <Text style={styles.teamSlotEmpty}>Select Team A</Text>
              </>
            )}
          </TouchableOpacity>

          {/* VS divider */}
          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* Team B selector */}
          <TouchableOpacity
            style={[styles.teamSlot, teamB && styles.teamSlotFilled]}
            onPress={() => setSelectingTeam('B')}
            activeOpacity={0.8}
          >
            {teamB ? (
              <>
                <View style={styles.teamSlotIcon}>
                  <Text style={styles.teamSlotIconText}>
                    {teamB.name.charAt(0)}
                  </Text>
                </View>
                <Text style={styles.teamSlotName}>{teamB.name}</Text>
                <Text style={styles.teamSlotLabel}>Team B</Text>
              </>
            ) : (
              <>
                <Text style={styles.teamSlotPlus}>+</Text>
                <Text style={styles.teamSlotEmpty}>Select Team B</Text>
              </>
            )}
          </TouchableOpacity>

        </View>

        {/* ── SECTION 2: MATCH SETTINGS ───────────────────────────────── */}
        <Text style={styles.sectionTitle}>Match Settings</Text>

        {/* Overs selector */}
        <Text style={styles.fieldLabel}>Number of Overs</Text>
        <View style={styles.oversRow}>
          {OVER_OPTIONS.map(overs => (
            <TouchableOpacity
              key={overs}
              style={[
                styles.oversBtn,
                totalOvers === overs && styles.oversBtnSelected
              ]}
              onPress={() => setTotalOvers(overs)}
            >
              <Text style={[
                styles.oversBtnText,
                totalOvers === overs && styles.oversBtnTextSelected
              ]}>
                {overs}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Venue input */}
        <Text style={styles.fieldLabel}>Venue (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Mulpani Cricket Ground, Kathmandu"
          value={venue}
          onChangeText={setVenue}
          maxLength={60}
        />

        {/* Date input */}
        <Text style={styles.fieldLabel}>Match Date</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 09/09/2026"
          value={matchDate}
          onChangeText={setMatchDate}
          maxLength={12}
        />

        {/* ── SECTION 3: TOSS ─────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Toss</Text>

        {/* Toss winner — only show if both teams selected */}
        {teamA && teamB ? (
          <>
            <Text style={styles.fieldLabel}>Toss Winner</Text>
            <View style={styles.tossRow}>
              {[teamA, teamB].map(team => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.tossBtn,
                    tossWinner?.id === team.id && styles.tossBtnSelected
                  ]}
                  onPress={() => setTossWinner(team)}
                >
                  <Text style={[
                    styles.tossBtnText,
                    tossWinner?.id === team.id && styles.tossBtnTextSelected
                  ]}>
                    {team.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Toss decision — bat or field */}
            <Text style={styles.fieldLabel}>
              {tossWinner ? `${tossWinner.name} chose to...` : 'Toss decision'}
            </Text>
            <View style={styles.tossRow}>
              <TouchableOpacity
                style={[styles.tossBtn, tossDecision === 'bat' && styles.tossBtnSelected]}
                onPress={() => setTossDecision('bat')}
              >
                <Text style={[styles.tossBtnText, tossDecision === 'bat' && styles.tossBtnTextSelected]}>
                  🏏 Bat First
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tossBtn, tossDecision === 'field' && styles.tossBtnSelected]}
                onPress={() => setTossDecision('field')}
              >
                <Text style={[styles.tossBtnText, tossDecision === 'field' && styles.tossBtnTextSelected]}>
                  🎳 Field First
                </Text>
              </TouchableOpacity>
            </View>

            {/* Match summary preview */}
            {tossWinner && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>
                  {tossWinner.name} won the toss and chose to{' '}
                  <Text style={styles.summaryBold}>{tossDecision}</Text> first.
                </Text>
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryBold}>
                    {tossDecision === 'bat' ? tossWinner.name :
                      (tossWinner.id === teamA.id ? teamB.name : teamA.name)}
                  </Text>
                  {' '}will bat first in a{' '}
                  <Text style={styles.summaryBold}>{totalOvers}-over</Text> match.
                </Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.tossHint}>
            Select both teams first to configure the toss
          </Text>
        )}

        {/* ── START MATCH BUTTON ───────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.startBtn,
            (!teamA || !teamB || !tossWinner) && styles.startBtnDisabled
          ]}
          onPress={handleStartMatch}
          disabled={!teamA || !teamB || !tossWinner}
          activeOpacity={0.8}
        >
          <Text style={styles.startBtnText}>🏏  Start Match</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />

      </ScrollView>

      {/* Team selector overlay */}
      {renderTeamSelector()}

    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  safe: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  scroll: {
    padding: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 8,
    marginBottom: 14,
  },

  // Teams row
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },

  teamSlot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    minHeight: 110,
    justifyContent: 'center',
  },

  teamSlotFilled: {
    borderColor: '#1D9E75',
    borderStyle: 'solid',
    backgroundColor: '#E8F8F2',
  },

  teamSlotIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1D9E75',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  teamSlotIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  teamSlotName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
  },

  teamSlotLabel: {
    fontSize: 11,
    color: '#1D9E75',
    fontWeight: '600',
    marginTop: 3,
  },

  teamSlotPlus: {
    fontSize: 32,
    color: '#CCCCCC',
    marginBottom: 6,
  },

  teamSlotEmpty: {
    fontSize: 13,
    color: '#AAAAAA',
    textAlign: 'center',
  },

  vsContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1D9E75',
    justifyContent: 'center',
    alignItems: 'center',
  },

  vsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Overs
  oversRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },

  oversBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },

  oversBtnSelected: {
    borderColor: '#1D9E75',
    backgroundColor: '#1D9E75',
  },

  oversBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555555',
  },

  oversBtnTextSelected: {
    color: '#FFFFFF',
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },

  // Toss
  tossRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },

  tossBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },

  tossBtnSelected: {
    borderColor: '#1D9E75',
    backgroundColor: '#E8F8F2',
  },

  tossBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
  },

  tossBtnTextSelected: {
    color: '#1D9E75',
  },

  tossHint: {
    fontSize: 13,
    color: '#AAAAAA',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },

  // Match summary preview box
  summaryBox: {
    backgroundColor: '#E8F8F2',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1D9E75',
  },

  summaryText: {
    fontSize: 14,
    color: '#1A5C40',
    lineHeight: 22,
  },

  summaryBold: {
    fontWeight: 'bold',
    color: '#085041',
  },

  // Start match button
  startBtn: {
    backgroundColor: '#1D9E75',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },

  startBtnDisabled: {
    backgroundColor: '#AAAAAA',
    shadowOpacity: 0,
    elevation: 0,
  },

  startBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  bottomSpacer: {
    height: 40,
  },

  // Team selector overlay
  selectorOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  selectorBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },

  selectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },

  selectorTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginBottom: 10,
  },

  selectorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1D9E75',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  selectorIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  selectorTeamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  selectorCancel: {
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },

  selectorCancelText: {
    fontSize: 16,
    color: '#888888',
    fontWeight: '600',
  },
});