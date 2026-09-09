// PlayersScreen.js — Players management for a specific team
// This screen allows users to:
// 1. View all players in a team
// 2. Add a new player with name, role, and jersey number
// 3. Delete a player by long pressing

import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, Alert, TextInput,
  Modal, ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getPlayersByTeam, createPlayer, deletePlayer } from '../database/db';

// Player roles available in cricket
// Each role has a name, emoji, and short code
const ROLES = [
  { label: 'Batsman',     emoji: '🏏', value: 'batsman'     },
  { label: 'Bowler',      emoji: '🎳', value: 'bowler'      },
  { label: 'All-Rounder', emoji: '⭐', value: 'allrounder'  },
  { label: 'Wicket Keeper', emoji: '🧤', value: 'wicketkeeper' },
];

export default function PlayersScreen({ route }) {

  // Get the team object passed from TeamsScreen
  const { team } = route.params;

  // List of players for this team
  const [players, setPlayers] = useState([]);

  // Controls whether the Add Player popup is visible
  const [modalVisible, setModalVisible] = useState(false);

  // Form fields for new player
  const [playerName, setPlayerName]     = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState('batsman');

  // ── LOAD PLAYERS ───────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      loadPlayers();
    }, [])
  );

  const loadPlayers = () => {
    try {
      // Fetch all players for this specific team from SQLite
      const result = getPlayersByTeam(team.id);
      setPlayers(result);
    } catch (error) {
      console.error('Error loading players:', error);
      Alert.alert('Error', 'Could not load players.');
    }
  };

  // ── ADD PLAYER ─────────────────────────────────────────────────────────────
  const handleAddPlayer = () => {
    // Validate — player name is required
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter a player name.');
      return;
    }

    // Validate jersey number if provided — must be a number
    if (jerseyNumber && isNaN(parseInt(jerseyNumber))) {
      Alert.alert('Error', 'Jersey number must be a number.');
      return;
    }

    try {
      // Save the new player to SQLite
      createPlayer(
        team.id,
        playerName.trim(),
        selectedRole,
        jerseyNumber ? parseInt(jerseyNumber) : null
      );

      // Reset form fields
      setPlayerName('');
      setJerseyNumber('');
      setSelectedRole('batsman');

      // Close modal and refresh list
      setModalVisible(false);
      loadPlayers();

    } catch (error) {
      console.error('Error adding player:', error);
      Alert.alert('Error', 'Could not add player.');
    }
  };

  // ── DELETE PLAYER ──────────────────────────────────────────────────────────
  const handleDeletePlayer = (player) => {
    Alert.alert(
      'Delete Player',
      `Remove "${player.name}" from ${team.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              deletePlayer(player.id);
              loadPlayers();
            } catch (error) {
              Alert.alert('Error', 'Could not delete player.');
            }
          }
        }
      ]
    );
  };

  // ── GET ROLE INFO ──────────────────────────────────────────────────────────
  // Returns the emoji and label for a player role
  const getRoleInfo = (roleValue) => {
    return ROLES.find(r => r.value === roleValue) || ROLES[0];
  };

  // ── RENDER EACH PLAYER CARD ────────────────────────────────────────────────
  const renderPlayer = ({ item, index }) => {
    const role = getRoleInfo(item.role);
    return (
      <TouchableOpacity
        style={styles.playerCard}
        onLongPress={() => handleDeletePlayer(item)}
        activeOpacity={0.8}
      >
        {/* Jersey number badge */}
        <View style={styles.jerseyBadge}>
          <Text style={styles.jerseyText}>
            {item.jersey_number ? `#${item.jersey_number}` : `${index + 1}`}
          </Text>
        </View>

        {/* Player info */}
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{item.name}</Text>
          <Text style={styles.playerRole}>
            {role.emoji} {role.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ── EMPTY STATE ────────────────────────────────────────────────────────────
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🏏</Text>
      <Text style={styles.emptyTitle}>No Players Yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the + button to add players to {team.name}
      </Text>
    </View>
  );

  // ── MAIN RENDER ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>

      {/* Team info banner at top */}
      <View style={styles.teamBanner}>
        <Text style={styles.teamBannerName}>{team.name}</Text>
        <Text style={styles.teamBannerCount}>
          {players.length} player{players.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Players list */}
      <FlatList
        data={players}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPlayer}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={
          players.length > 0 ? (
            <Text style={styles.hint}>Long press a player to delete</Text>
          ) : null
        }
        contentContainerStyle={styles.list}
      />

      {/* Floating + button to add player */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── ADD PLAYER MODAL ─────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>

              <Text style={styles.modalTitle}>Add Player to {team.name}</Text>

              {/* Player name */}
              <Text style={styles.inputLabel}>Player Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Rohit Paudel"
                value={playerName}
                onChangeText={setPlayerName}
                maxLength={40}
                autoFocus={true}
              />

              {/* Jersey number */}
              <Text style={styles.inputLabel}>Jersey Number (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 7"
                value={jerseyNumber}
                onChangeText={setJerseyNumber}
                keyboardType="number-pad"
                maxLength={3}
              />

              {/* Role selector */}
              <Text style={styles.inputLabel}>Player Role *</Text>
              <View style={styles.roleGrid}>
                {ROLES.map((role) => (
                  <TouchableOpacity
                    key={role.value}
                    style={[
                      styles.roleButton,
                      selectedRole === role.value && styles.roleButtonSelected
                    ]}
                    onPress={() => setSelectedRole(role.value)}
                  >
                    <Text style={styles.roleEmoji}>{role.emoji}</Text>
                    <Text style={[
                      styles.roleLabel,
                      selectedRole === role.value && styles.roleLabelSelected
                    ]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => {
                    setModalVisible(false);
                    setPlayerName('');
                    setJerseyNumber('');
                    setSelectedRole('batsman');
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.createBtn]}
                  onPress={handleAddPlayer}
                >
                  <Text style={styles.createBtnText}>Add Player</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
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

  // Green team info banner at top
  teamBanner: {
    backgroundColor: '#1D9E75',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  teamBannerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  teamBannerCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },

  list: {
    padding: 16,
    paddingBottom: 100,
  },

  hint: {
    fontSize: 12,
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: 12,
  },

  // Player card
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },

  // Jersey number circle
  jerseyBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F8F2',
    borderWidth: 1.5,
    borderColor: '#1D9E75',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  jerseyText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1D9E75',
  },

  playerInfo: {
    flex: 1,
  },

  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 3,
  },

  playerRole: {
    fontSize: 13,
    color: '#888888',
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

  // FAB button
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

  // Modal
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
    maxHeight: '90%',
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

  // Role selector grid — 2 columns
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },

  roleButton: {
    width: '47%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },

  roleButtonSelected: {
    borderColor: '#1D9E75',
    backgroundColor: '#E8F8F2',
  },

  roleEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },

  roleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
  },

  roleLabelSelected: {
    color: '#1D9E75',
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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