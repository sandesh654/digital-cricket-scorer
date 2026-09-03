// HomeScreen.js — Main menu of the Cricket Scorer app
// This is the first screen users see when they open the app
// It has 3 main buttons to navigate to different parts of the app

import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image } from 'react-native';

export default function HomeScreen({ navigation }) {

  // navigation.navigate() moves to a different screen
  // The name must match exactly what is in AppNavigator.js

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* ── APP LOGO / HEADER ─────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.logo}>🏏</Text>
          <Text style={styles.appName}>Cricket Scorer</Text>
          <Text style={styles.tagline}>
            Simple scoring for local matches
          </Text>
        </View>

        {/* ── MAIN BUTTONS ──────────────────────────────────────────── */}
        <View style={styles.buttonContainer}>

          {/* New Match button — navigates to MatchSetup screen */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => navigation.navigate('MatchSetup')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>🆕</Text>
            <View style={styles.buttonText}>
              <Text style={styles.buttonTitle}>New Match</Text>
              <Text style={styles.buttonSubtitle}>Start scoring a match</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* Match History button — navigates to MatchHistory screen */}
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('MatchHistory')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>📋</Text>
            <View style={styles.buttonText}>
              <Text style={[styles.buttonTitle, styles.darkText]}>
                Match History
              </Text>
              <Text style={styles.buttonSubtitleDark}>
                View past matches
              </Text>
            </View>
            <Text style={[styles.arrow, styles.darkArrow]}>›</Text>
          </TouchableOpacity>

          {/* Teams button — navigates to Teams screen */}
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('Teams')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>👥</Text>
            <View style={styles.buttonText}>
              <Text style={[styles.buttonTitle, styles.darkText]}>
                Teams & Players
              </Text>
              <Text style={styles.buttonSubtitleDark}>
                Manage your teams
              </Text>
            </View>
            <Text style={[styles.arrow, styles.darkArrow]}>›</Text>
          </TouchableOpacity>

        </View>

        {/* ── FOOTER ────────────────────────────────────────────────── */}
        <Text style={styles.footer}>
          BSc Computer Science FYP — DMU 2026
        </Text>

      </View>
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // SafeAreaView ensures content is not hidden behind phone notch
  safe: {
    flex: 1,
    backgroundColor: '#1D9E75',
  },

  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },

  // Header section with logo and title
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 72,
    marginBottom: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1D9E75',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
  },

  // Button container
  buttonContainer: {
    flex: 1,
    gap: 16,
  },

  // Base button style shared by all buttons
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Green button for New Match (most important action)
  primaryButton: {
    backgroundColor: '#1D9E75',
  },

  // White button for secondary actions
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  buttonIcon: {
    fontSize: 32,
    marginRight: 16,
  },

  buttonText: {
    flex: 1,
  },

  buttonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },

  darkText: {
    color: '#1A1A1A',
  },

  buttonSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },

  buttonSubtitleDark: {
    fontSize: 13,
    color: '#888888',
  },

  arrow: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  darkArrow: {
    color: '#CCCCCC',
  },

  // Footer text at bottom of screen
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#AAAAAA',
    marginTop: 24,
  },
});