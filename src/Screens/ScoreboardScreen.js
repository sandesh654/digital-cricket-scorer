// ScoreboardScreen.js — Full batting and bowling scorecard
// Shows during a live match when user taps "View Scorecard"
// Displays: batting card (runs, balls, 4s, 6s, SR, how out)
// and bowling card (overs, maidens, runs, wickets, economy)

import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, Share
} from 'react-native';

export default function ScoreboardScreen({ route }) {

  const {
    battingTeam,
    bowlingTeam,
    totalRuns,
    totalWickets,
    totalBalls,
    battingStats,
    bowlingStats,
    battingPlayers,
    bowlingPlayers,
  } = route.params;

  // ── CALCULATED VALUES ────────────────────────────────────────────────────
  // Convert total balls to overs display e.g. 73 = "12.1"
  const getOversDisplay = (balls) => {
    const overs = Math.floor(balls / 6);
    const rem   = balls % 6;
    return `${overs}.${rem}`;
  };

  // Strike rate = (runs / balls) * 100
  const getStrikeRate = (runs, balls) => {
    if (!balls) return '0.00';
    return ((runs / balls) * 100).toFixed(1);
  };

  // Economy rate = runs given / overs bowled
  const getEconomy = (runs, balls) => {
    if (!balls) return '0.00';
    return (runs / (balls / 6)).toFixed(2);
  };

  // ── SHARE SCORECARD ──────────────────────────────────────────────────────
  const handleShare = async () => {
    let text = `🏏 CricScore — Match Scorecard\n`;
    text += `${'─'.repeat(36)}\n`;
    text += `${battingTeam.name}: ${totalRuns}/${totalWickets} (${getOversDisplay(totalBalls)} ov)\n\n`;

    text += `BATTING\n${'─'.repeat(36)}\n`;
    battingPlayers
      .filter(p => battingStats[p.id]?.balls_faced > 0 || battingStats[p.id]?.is_batting === 1)
      .forEach(p => {
        const s = battingStats[p.id];
        text += `${p.name.padEnd(18)} ${String(s?.runs ?? 0).padStart(3)}  (${s?.balls_faced ?? 0}b)  SR: ${getStrikeRate(s?.runs ?? 0, s?.balls_faced ?? 0)}\n`;
        if (s?.how_out && s.how_out !== 'not out') text += `  ${s.how_out}\n`;
      });

    text += `\nBOWLING\n${'─'.repeat(36)}\n`;
    bowlingPlayers
      .filter(p => bowlingStats[p.id]?.balls_bowled > 0)
      .forEach(p => {
        const s = bowlingStats[p.id];
        text += `${p.name.padEnd(18)} ${getOversDisplay(s?.balls_bowled ?? 0)}ov  ${s?.runs_given ?? 0}r  ${s?.wickets ?? 0}w  Econ: ${getEconomy(s?.runs_given ?? 0, s?.balls_bowled ?? 0)}\n`;
      });

    text += `\nShared via CricScore 🏏`;

    try {
      await Share.share({ message: text, title: 'CricScore — Match Scorecard' });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // ── BATTING CARD ─────────────────────────────────────────────────────────
  const renderBattingCard = () => {
    // Only show batsmen who have batted (balls faced > 0 or currently batting)
    const batted = battingPlayers.filter(p =>
      battingStats[p.id]?.balls_faced > 0 ||
      battingStats[p.id]?.is_batting === 1
    );

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🏏 {battingTeam.name}</Text>
          <Text style={styles.cardScore}>
            {totalRuns}/{totalWickets} ({getOversDisplay(totalBalls)} ov)
          </Text>
        </View>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.col, styles.colWide, styles.headerText]}>Batter</Text>
          <Text style={[styles.col, styles.headerText]}>R</Text>
          <Text style={[styles.col, styles.headerText]}>B</Text>
          <Text style={[styles.col, styles.headerText]}>4s</Text>
          <Text style={[styles.col, styles.headerText]}>6s</Text>
          <Text style={[styles.col, styles.headerText]}>SR</Text>
        </View>

        {/* Batting rows */}
        {batted.map((player, index) => {
          const stats = battingStats[player.id];
          const isBatting = stats?.is_batting === 1;
          return (
            <View
              key={player.id}
              style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}
            >
              <View style={[styles.col, styles.colWide]}>
                <Text style={[styles.playerName, isBatting && styles.playerNameActive]}>
                  {player.name}{isBatting ? ' *' : ''}
                </Text>
                <Text style={styles.howOut}>
                  {stats?.how_out !== 'not out' ? stats?.how_out : 'not out'}
                </Text>
              </View>
              <Text style={[styles.col, styles.statText, isBatting && styles.statTextActive]}>
                {stats?.runs ?? 0}
              </Text>
              <Text style={[styles.col, styles.statText]}>{stats?.balls_faced ?? 0}</Text>
              <Text style={[styles.col, styles.statText]}>{stats?.fours ?? 0}</Text>
              <Text style={[styles.col, styles.statText]}>{stats?.sixes ?? 0}</Text>
              <Text style={[styles.col, styles.statText]}>
                {getStrikeRate(stats?.runs ?? 0, stats?.balls_faced ?? 0)}
              </Text>
            </View>
          );
        })}

        {/* Extras row */}
        <View style={styles.extrasRow}>
          <Text style={styles.extrasText}>Extras: {route.params.extras ?? 0}</Text>
          <Text style={styles.extrasText}>
            (Wd: {route.params.wides ?? 0}, NB: {route.params.noBalls ?? 0})
          </Text>
        </View>

      </View>
    );
  };

  // ── BOWLING CARD ─────────────────────────────────────────────────────────
  const renderBowlingCard = () => {
    // Only show bowlers who have bowled at least 1 ball
    const bowled = bowlingPlayers.filter(p =>
      bowlingStats[p.id]?.balls_bowled > 0 ||
      bowlingStats[p.id]?.is_bowling === 1
    );

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🎳 {bowlingTeam.name}</Text>
        </View>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.col, styles.colWide, styles.headerText]}>Bowler</Text>
          <Text style={[styles.col, styles.headerText]}>O</Text>
          <Text style={[styles.col, styles.headerText]}>M</Text>
          <Text style={[styles.col, styles.headerText]}>R</Text>
          <Text style={[styles.col, styles.headerText]}>W</Text>
          <Text style={[styles.col, styles.headerText]}>Econ</Text>
        </View>

        {/* Bowling rows */}
        {bowled.map((player, index) => {
          const stats = bowlingStats[player.id];
          const isBowling = stats?.is_bowling === 1;
          return (
            <View
              key={player.id}
              style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}
            >
              <Text style={[styles.col, styles.colWide, styles.playerName,
                isBowling && styles.playerNameActive]}>
                {player.name}{isBowling ? ' *' : ''}
              </Text>
              <Text style={[styles.col, styles.statText]}>
                {getOversDisplay(stats?.balls_bowled ?? 0)}
              </Text>
              <Text style={[styles.col, styles.statText]}>{stats?.maidens ?? 0}</Text>
              <Text style={[styles.col, styles.statText]}>{stats?.runs_given ?? 0}</Text>
              <Text style={[styles.col, styles.statText,
                (stats?.wickets ?? 0) > 0 && styles.wicketText]}>
                {stats?.wickets ?? 0}
              </Text>
              <Text style={[styles.col, styles.statText]}>
                {getEconomy(stats?.runs_given ?? 0, stats?.balls_bowled ?? 0)}
              </Text>
            </View>
          );
        })}

      </View>
    );
  };

  // ── MAIN RENDER ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Share button */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
          <Text style={styles.shareBtnText}>📤  Share Scorecard</Text>
        </TouchableOpacity>

        {renderBattingCard()}
        {renderBowlingCard()}
        <View style={styles.note}>
          <Text style={styles.noteText}>* Currently batting / bowling</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── STYLES ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  safe:   { flex:1, backgroundColor:'#F5F5F5' },
  scroll: { padding:16, paddingBottom:40 },

  shareBtn: {
    backgroundColor: '#FFC107', borderRadius: 12,
    padding: 14, alignItems: 'center', marginBottom: 16,
  },
  shareBtnText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },

  card: {
    backgroundColor:'#FFFFFF', borderRadius:14, marginBottom:16,
    overflow:'hidden',
    shadowColor:'#000', shadowOffset:{width:0,height:2},
    shadowOpacity:0.08, shadowRadius:4, elevation:3,
  },

  cardHeader: {
    backgroundColor:'#1D9E75', padding:14,
    flexDirection:'row', justifyContent:'space-between', alignItems:'center',
  },
  cardTitle: { fontSize:16, fontWeight:'bold', color:'#FFFFFF' },
  cardScore: { fontSize:14, color:'rgba(255,255,255,0.9)', fontWeight:'600' },

  tableHeader: {
    flexDirection:'row', backgroundColor:'#F0FAF6',
    paddingVertical:10, paddingHorizontal:14,
    borderBottomWidth:1, borderBottomColor:'#EEEEEE',
  },
  headerText: { fontSize:12, fontWeight:'bold', color:'#1D9E75', textAlign:'center' },

  tableRow: {
    flexDirection:'row', paddingVertical:10,
    paddingHorizontal:14, alignItems:'center',
  },
  tableRowAlt: { backgroundColor:'#FAFAFA' },

  col:     { flex:1, textAlign:'center' },
  colWide: { flex:3, textAlign:'left' },

  playerName:       { fontSize:13, fontWeight:'600', color:'#1A1A1A' },
  playerNameActive: { color:'#1D9E75' },

  howOut: { fontSize:11, color:'#888888', marginTop:2 },

  statText:       { fontSize:13, color:'#333333', textAlign:'center' },
  statTextActive: { fontWeight:'bold', color:'#1D9E75' },

  wicketText: { fontWeight:'bold', color:'#E24B4A' },

  extrasRow: {
    flexDirection:'row', justifyContent:'space-between',
    padding:12, backgroundColor:'#F9F9F9',
    borderTopWidth:1, borderTopColor:'#EEEEEE',
  },
  extrasText: { fontSize:12, color:'#888888' },

  note:     { alignItems:'center', marginTop:4 },
  noteText: { fontSize:12, color:'#AAAAAA', fontStyle:'italic' },
});