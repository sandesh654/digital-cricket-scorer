// App.js — Main entry point of the Cricket Scorer application
// Initialises the database then hands control to AppNavigator

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initDatabase } from './src/database/db';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {

  // Tracks whether database has finished setting up
  const [dbReady, setDbReady] = useState(false);

  // Stores any error message if database fails
  const [dbError, setDbError] = useState(null);

  // Runs once when app first opens
  useEffect(() => {
    try {
      initDatabase();
      console.log('✅ Database initialised successfully');
      setDbReady(true);
    } catch (error) {
      console.error('❌ Database error:', error);
      setDbError(error.message);
    }
  }, []);

  // Show spinner while database is loading
  if (!dbReady && !dbError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D9E75" />
        <Text style={styles.loadingText}>Setting up Cricket Scorer...</Text>
      </View>
    );
  }

  // Show error if database failed
  if (dbError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>❌ Database Error</Text>
        <Text style={styles.errorText}>{dbError}</Text>
      </View>
    );
  }

  // Database is ready — load the full app with all screens
  return <AppNavigator />;
}

const styles = StyleSheet.create({
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
});