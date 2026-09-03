// App.js — Main entry point of the Cricket Scorer application
// This file runs first when the app starts on the phone
// It initialises the SQLite database and sets up screen navigation

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initDatabase } from './src/database/db';

export default function App() {

  // dbReady tracks whether the database has finished setting up
  // We show a loading screen until the database is ready
  const [dbReady, setDbReady] = useState(false);

  // dbError stores any error message if the database fails to load
  const [dbError, setDbError] = useState(null);

  // useEffect runs once when the app first opens (the [] means run only once)
  useEffect(() => {
    try {
      // Initialise the database — this creates all our tables if they
      // don't already exist (teams, players, matches, innings, balls, etc.)
      initDatabase();

      // Log to terminal so we can confirm it worked during development
      console.log('✅ Cricket Scorer database initialised successfully');

      // Mark the database as ready so the app can proceed
      setDbReady(true);

    } catch (error) {
      // If something goes wrong, store the error message so we can display it
      console.error('❌ Database initialisation failed:', error);
      setDbError(error.message);
    }
  }, []);

  // ── LOADING SCREEN ──────────────────────────────────────────────────────────
  // Show a loading spinner while the database is being set up
  if (!dbReady && !dbError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D9E75" />
        <Text style={styles.loadingText}>Setting up Cricket Scorer...</Text>
      </View>
    );
  }

  // ── ERROR SCREEN ────────────────────────────────────────────────────────────
  // Show an error message if the database failed to initialise
  if (dbError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>❌ Database Error</Text>
        <Text style={styles.errorText}>{dbError}</Text>
      </View>
    );
  }

  // ── MAIN APP ────────────────────────────────────────────────────────────────
  // Database is ready — show the app
  // Later we will replace this with our AppNavigator (screen navigation)
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏏 Cricket Scorer</Text>
      <Text style={styles.subtitle}>Database ready!</Text>
      <Text style={styles.hint}>
        Next step: build the navigation and screens
      </Text>
    </View>
  );
}

// ── STYLES ───────────────────────────────────────────────────────────────────
// StyleSheet.create() works like CSS for React Native components
const styles = StyleSheet.create({

  // Loading screen — centred spinner
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#888888',
  },

  // Error screen — red warning
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E24B4A',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
  },

  // Main app screen
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1D9E75',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#444444',
    marginBottom: 16,
  },
  hint: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});