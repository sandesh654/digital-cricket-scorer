// AppNavigator.js — Screen Navigation Setup
// This file controls how users move between all screens in the app
// Stack Navigator works like a stack of cards — each new screen
// slides on top and going back removes it from the stack

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// ── IMPORT ALL SCREENS ───────────────────────────────────────────────────────
import HomeScreen         from '../Screens/HomeScreen';
import TeamsScreen        from '../Screens/TeamsScreen';
import PlayersScreen      from '../Screens/PlayersScreen';
import MatchSetupScreen   from '../Screens/MatchSetupScreen';
import ScoringScreen      from '../Screens/ScoringScreen';
import ScoreboardScreen   from '../Screens/ScoreboardScreen';
import MatchSummaryScreen from '../Screens/MatchSummaryScreen';
import MatchHistoryScreen from '../Screens/MatchHistoryScreen';
import MatchDetailScreen  from '../Screens/MatchDetailScreen';
import PlayerStatsScreen  from '../Screens/PlayerStatsScreen';
import WinProbabilityScreen from '../Screens/WinProbabilityScreen';
import TournamentsListScreen  from '../Screens/TournamentsListScreen';
import TournamentSetupScreen  from '../Screens/TournamentSetupScreen';
import TournamentHomeScreen   from '../Screens/TournamentHomeScreen';
import TournamentTossScreen   from '../Screens/TournamentTossScreen';

// Create the stack navigator instance
const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#1D9E75' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
        }}
      >

        {/* Home — first screen shown when app opens */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: '🏏 Cricket Scorer' }}
        />

        {/* Teams — list and create teams */}
        <Stack.Screen
          name="Teams"
          component={TeamsScreen}
          options={{ title: 'Teams & Players' }}
        />

        {/* Players — players for a specific team */}
        <Stack.Screen
          name="Players"
          component={PlayersScreen}
          options={({ route }) => ({
            title: route.params.team.name + ' — Players'
          })}
        />

        {/* Match Setup — configure a new match */}
        <Stack.Screen
          name="MatchSetup"
          component={MatchSetupScreen}
          options={{ title: 'New Match' }}
        />

        {/* Scoring — live ball-by-ball scoring */}
        <Stack.Screen
          name="Scoring"
          component={ScoringScreen}
          options={{
            title: 'Live Scoring',
            headerBackVisible: false,
          }}
        />

        {/* Scoreboard — batting and bowling cards during a live match */}
        <Stack.Screen
          name="Scoreboard"
          component={ScoreboardScreen}
          options={{ title: 'Scorecard' }}
        />

        {/* Match Summary — final result when match ends */}
        <Stack.Screen
          name="MatchSummary"
          component={MatchSummaryScreen}
          options={{
            title: 'Match Result',
            headerBackVisible: false,
          }}
        />

        {/* Match History — list of all completed matches */}
        <Stack.Screen
          name="MatchHistory"
          component={MatchHistoryScreen}
          options={{ title: 'Match History' }}
        />

        {/* Match Detail — full scorecard for a completed match */}
        <Stack.Screen
          name="MatchDetail"
          component={MatchDetailScreen}
          options={({ route }) => ({
            title: route.params.matchItem.team1_name +
                   ' vs ' +
                   route.params.matchItem.team2_name
          })}
        />

        {/* Player Stats — career statistics per player */}
        <Stack.Screen
          name="PlayerStats"
          component={PlayerStatsScreen}
          options={{ title: 'Player Statistics' }}
        />

        <Stack.Screen name="WinProbability" component={WinProbabilityScreen} options={{ title: 'Win Probability' }} />

          <Stack.Screen name="TournamentsList"  component={TournamentsListScreen}  options={{ title: 'Tournaments' }} />
<Stack.Screen name="TournamentSetup"  component={TournamentSetupScreen}  options={{ title: 'New Tournament' }} />
<Stack.Screen name="TournamentHome"   component={TournamentHomeScreen}   options={{ headerShown: false }} />
<Stack.Screen name="TournamentToss"   component={TournamentTossScreen}   options={{ title: 'Toss' }} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}