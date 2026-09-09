// AppNavigator.js — Screen Navigation Setup
// This file controls how users move between all screens in the app
// Stack Navigator works like a stack of cards — each new screen
// slides on top and going back removes it from the stack

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// ── IMPORT ALL SCREENS ───────────────────────────────────────────────────────
// Note: folder is called 'Screens' with capital S
import HomeScreen         from '../Screens/HomeScreen';
import TeamsScreen        from '../Screens/TeamsScreen';
import PlayersScreen      from '../Screens/PlayersScreen';
import MatchSetupScreen   from '../Screens/MatchSetupScreen';
import ScoringScreen      from '../Screens/ScoringScreen';
import ScoreboardScreen   from '../Screens/ScoreboardScreen';
import MatchSummaryScreen from '../Screens/MatchSummaryScreen';
import MatchHistoryScreen from '../Screens/MatchHistoryScreen';
import PlayerStatsScreen  from '../Screens/PlayerStatsScreen';

// Create the stack navigator instance
const Stack = createNativeStackNavigator();

// ── APP NAVIGATOR COMPONENT ──────────────────────────────────────────────────
export default function AppNavigator() {
  return (
    // NavigationContainer is the root wrapper — every app needs exactly one
    <NavigationContainer>

      <Stack.Navigator
        // HomeScreen is the first screen shown when the app opens
        initialRouteName="Home"

        // Default header style applied to ALL screens
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1D9E75', // Green header
          },
          headerTintColor: '#FFFFFF',   // White back arrow and title
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
        }}
      >

        {/* ── HOME ─────────────────────────────────────────────────────── */}
        {/* First screen shown when app opens */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: '🏏 Cricket Scorer' }}
        />

        {/* ── TEAMS ────────────────────────────────────────────────────── */}
        {/* List of all teams — create and manage teams */}
        <Stack.Screen
          name="Teams"
          component={TeamsScreen}
          options={{ title: 'Teams & Players' }}
        />

        {/* ── PLAYERS ──────────────────────────────────────────────────── */}
        {/* Players for a specific team — title shows the team name */}
        <Stack.Screen
          name="Players"
          component={PlayersScreen}
          options={({ route }) => ({
            title: route.params.team.name + ' — Players'
          })}
        />

        {/* ── MATCH SETUP ──────────────────────────────────────────────── */}
        {/* Configure a new match before it starts */}
        <Stack.Screen
          name="MatchSetup"
          component={MatchSetupScreen}
          options={{ title: 'New Match' }}
        />

        {/* ── SCORING ──────────────────────────────────────────────────── */}
        {/* Live ball-by-ball scoring — most important screen */}
        <Stack.Screen
          name="Scoring"
          component={ScoringScreen}
          options={{
            title: 'Live Scoring',
            // Prevent accidental back navigation during a live match
            headerBackVisible: false,
          }}
        />

        {/* ── SCOREBOARD ───────────────────────────────────────────────── */}
        {/* Full batting and bowling scorecard for current match */}
        <Stack.Screen
          name="Scoreboard"
          component={ScoreboardScreen}
          options={{ title: 'Scorecard' }}
        />

        {/* ── MATCH SUMMARY ────────────────────────────────────────────── */}
        {/* Final result screen shown when match ends */}
        <Stack.Screen
          name="MatchSummary"
          component={MatchSummaryScreen}
          options={{
            title: 'Match Result',
            // Cannot go back after match is completed
            headerBackVisible: false,
          }}
        />

        {/* ── MATCH HISTORY ────────────────────────────────────────────── */}
        {/* List of all completed past matches */}
        <Stack.Screen
          name="MatchHistory"
          component={MatchHistoryScreen}
          options={{ title: 'Match History' }}
        />

        {/* ── PLAYER STATS ─────────────────────────────────────────────── */}
        {/* Career batting and bowling statistics per player */}
        <Stack.Screen
          name="PlayerStats"
          component={PlayerStatsScreen}
          options={{ title: 'Player Statistics' }}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}