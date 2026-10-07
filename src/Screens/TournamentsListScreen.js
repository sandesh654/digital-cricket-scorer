// src/Screens/TournamentsListScreen.js
// Lists all tournaments. Tap to open, or create a new one.

import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  FlatList, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllTournaments } from '../database/db';

const STATUS_LABEL = {
  setup:    { label: 'Setup',      color: '#F0A500' },
  group:    { label: 'Group Stage', color: '#1A5276' },
  knockout: { label: 'Knockout',   color: '#7F77DD' },
  completed:{ label: 'Completed',  color: '#1D9E75' },
};

export default function TournamentsListScreen({ navigation }) {
  const [tournaments, setTournaments] = useState([]);

  useFocusEffect(
    useCallback(() => {
      setTournaments(getAllTournaments());
    }, [])
  );

  const renderItem = ({ item }) => {
    const s = STATUS_LABEL[item.status] ?? { label: item.status, color: '#888' };
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('TournamentHome', { tournamentId: item.id })}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardMeta}>
            {item.total_overs} overs  •  {item.num_groups} group{item.num_groups > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: s.color }]}>
          <Text style={styles.statusText}>{s.label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={tournaments}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.newBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('TournamentSetup')}
          >
            <Text style={styles.newBtnText}>＋  Create Tournament</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyTitle}>No tournaments yet</Text>
            <Text style={styles.emptySubtitle}>Tap "Create Tournament" to get started</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  list: { padding: 16, paddingBottom: 40 },

  newBtn: {
    backgroundColor: '#1D9E75',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  newBtnText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLeft: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 },
  cardMeta: { fontSize: 12, color: '#888888' },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginLeft: 12,
  },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon:     { fontSize: 56, marginBottom: 16 },
  emptyTitle:    { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#888888', textAlign: 'center' },
});