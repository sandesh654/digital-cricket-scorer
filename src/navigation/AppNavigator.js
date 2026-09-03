// AppNavigator.js — Screen Navigation Setup
// This file controls how users move between screens in the app
// We use Stack Navigator which works like a stack of cards —
// each new screen slides on top, and going back removes it

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// ── IMPORT ALL SCREENS ───────────────────────────────────────────────────────
// Note: folder is called 'Screens' with capital S
import HomeScreen         from '../Screens/HomeScreen';
import TeamsScreen        from '../Screens/TeamsScreen';
import MatchSetupScreen   from '../Screens/MatchSetupScreen';
import ScoringScreen      from '../Screens/ScoringScreen';
import ScoreboardScreen   from '../Screens/ScoreboardScreen';
import MatchSummaryScreen from '../Screens/MatchSummaryScreen';
import MatchHistoryScreen from '../Screens/MatchHistoryScreen';
import PlayerStatsScreen  from '../Screens/PlayerStatsScreen';

// Create the stack navigator
const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1D9E75',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: '🏏 Cricket Scorer' }}
        />
        <Stack.Screen
          name="Teams"
          component={TeamsScreen}
          options={{ title: 'Teams & Players' }}
        />
        <Stack.Screen
          name="MatchSetup"
          component={MatchSetupScreen}
          options={{ title: 'New Match' }}
        />
        <Stack.Screen
          name="Scoring"
          component={ScoringScreen}
          options={{
            title: 'Live Scoring',
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="Scoreboard"
          component={ScoreboardScreen}
          options={{ title: 'Scorecard' }}
        />
        <Stack.Screen
          name="MatchSummary"
          component={MatchSummaryScreen}
          options={{
            title: 'Match Result',
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="MatchHistory"
          component={MatchHistoryScreen}
          options={{ title: 'Match History' }}
        />
        <Stack.Screen
          name="PlayerStats"
          component={PlayerStatsScreen}
          options={{ title: 'Player Statistics' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}