// TeamsScreen.js — Teams and Players management screen
// This screen allows users to:
// 1. View all existing teams
// 2. Create a new team
// 3. Tap a team to view and add players

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, Alert, TextInput, Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllTeams, createTeam, deleteTeam } from '../database/db';

export default function TeamsScreen({ navigation }) {

  // List of all teams fetched from SQLite
  const [teams, setTeams] = useState([]);

  // Controls whether the Create Team popup is visible
  const [modalVisible, setModalVisible] = useState(false);

  // Stores what the user types for the new team name
  const [teamName, setTeamName] = useState('');

  // Stores the optional home ground text
  const [homeGround, setHomeGround] = useState('');

  // ── LOAD TEAMS ─────────────────────────────────────────────────────────────
  // useFocusEffect runs every time this screen comes into focus
  // This ensures the list refreshes when we come back from adding players
  useFocusEffect(
    useCallback(() => {
      loadTeams();
    }, [])
  );

  const loadTeams = () => {
    try {
      // getAllTeams() fetches all teams from the SQLite teams table
      const result = getAllTeams();
      setTeams(result);
    } catch (error) {
      console.error('Error loading teams:', error);
      Alert.alert('Error', 'Could not load teams.');
    }
  };

  // ── CREATE TEAM ────────────────────────────────────────────────────────────
  const handleCreateTeam = () => {
    // Validate — team name cannot be empty
    if (!teamName.trim()) {
      Alert.alert('Error', 'Please enter a team name.');
      return;
    }

    try {
      // Save the new team to SQLite
      createTeam(teamName.trim(), homeGround.trim());

      // Reset the form fields
      setTeamName('');
      setHomeGround('');

      // Close the modal popup
      setModalVisible(false);

      // Reload the teams list to show the new team
      loadTeams();

      Alert.alert('Success', `Team "${teamName.trim()}" created!`);
    } catch (error) {
      console.error('Error creating team:', error);
      Alert.alert('Error', 'Could not create team. The team name may already exist.');
    }
  };

  // ── DELETE TEAM ────────────────────────────────────────────────────────────
  const handleDeleteTeam = (team) => {
    // Show a confirmation dialog before deleting
    Alert.alert(
      'Delete Team',
      `Are you sure you want to delete "${team.name}"? This will also delete all players in this team.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              deleteTeam(team.id);
              loadTeams(); // Refresh the list
            } catch (error) {
              Alert.alert('Error', 'Could not delete team.');
            }
          }
        }
      ]
    );
  };

  // ── RENDER EACH TEAM CARD ──────────────────────────────────────────────────
  const renderTeam = ({ item }) => (
    <TouchableOpacity
      style={styles.teamCard}
      onPress={() => navigation.navigate('Players', { team: item })}
      onLongPress={() => handleDeleteTeam(item)}
      activeOpacity={0.8}
    >
      <View style={styles.teamIcon}>
        <Text style={styles.teamIconText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.teamInfo}>
        <Text style={styles.teamName}>{item.name}</Text>
        <Text style={styles.teamGround}>
          {item.home_ground ? `📍 ${item.home_ground}` : '📍 No ground set'}
        </Text>
      </View>

      <Text style={styles.teamArrow}>›</Text>
    </TouchableOpacity>
  );

  // ── EMPTY STATE ────────────────────────────────────────────────────────────
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyTitle}>No Teams Yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the + button to create your first team
      </Text>
    </View>
  );

  // ── MAIN RENDER ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>

      {/* Teams list */}
      <FlatList
        data={teams}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTeam}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={
          teams.length > 0 ? (
            <Text style={styles.hint}>
              Tap a team to add players • Long press to delete
            </Text>
          ) : null
        }
        contentContainerStyle={styles.list}
      />

      {/* Floating + button to create a new team */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── CREATE TEAM MODAL ─────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>

            <Text style={styles.modalTitle}>Create New Team</Text>

            {/* Team name input */}
            <Text style={styles.inputLabel}>Team Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Kathmandu XI"
              value={teamName}
              onChangeText={setTeamName}
              maxLength={30}
              autoFocus={true}
            />

            {/* Home ground input */}
            <Text style={styles.inputLabel}>Home Ground (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mulpani Cricket Ground"
              value={homeGround}
              onChangeText={setHomeGround}
              maxLength={50}
            />

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setModalVisible(false);
                  setTeamName('');
                  setHomeGround('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.createBtn]}
                onPress={handleCreateTeam}
              >
                <Text style={styles.createBtnText}>Create Team</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

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
    paddingBottom: 100, // Space for the FAB button
  },

  hint: {
    fontSize: 12,
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: 12,
  },

  // Team card
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },

  // Circle with first letter of team name
  teamIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1D9E75',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  teamIconText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  teamInfo: {
    flex: 1,
  },

  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },

  teamGround: {
    fontSize: 13,
    color: '#888888',
  },

  teamArrow: {
    fontSize: 24,
    color: '#CCCCCC',
    fontWeight: 'bold',
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
  },

  // Floating action button
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1D9E75',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },

  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: -2,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  modalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 20,
    textAlign: 'center',
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 6,
  },

  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },

  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  cancelBtn: {
    backgroundColor: '#F0F0F0',
  },

  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555555',
  },

  createBtn: {
    backgroundColor: '#1D9E75',
  },

  createBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});