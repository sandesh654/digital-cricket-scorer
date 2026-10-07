// src/Screens/WinProbabilityScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getBallsByInnings } from '../database/db';
import {
  generateProbabilityTimeline,
  getProbabilityDescription,
  getProbabilityColour,
} from '../logic/winProbability';

const screenWidth = Dimensions.get('window').width;

export default function WinProbabilityScreen({ route }) {
  const { inningsId, target, totalOvers, battingTeamName, bowlingTeamName } =
    route.params;

  const [loading, setLoading]   = useState(true);
  const [timeline, setTimeline] = useState([]);
  const [finalProb, setFinalProb] = useState(null);
  const [stats, setStats]       = useState(null);
  const [error, setError]       = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const balls = await getBallsByInnings(inningsId);
      if (!balls || balls.length === 0) {
        setError('No ball data available for this innings.');
        setLoading(false);
        return;
      }

      const totalBalls = totalOvers * 6;
      const data = generateProbabilityTimeline(balls, target, totalBalls);
      setTimeline(data);
      setFinalProb(data[data.length - 1]?.probability ?? null);

      // ── COMPUTE KEY STATS ────────────────────────────────────────────────
      // Partnership (current unbroken run sequence from last wicket ball)
      let partnershipRuns  = 0;
      let partnershipBalls = 0;
      let wicketSeen       = false;
      for (let i = balls.length - 1; i >= 0; i--) {
        if (balls[i].is_wicket && i !== balls.length - 1) { break; }
        if (!balls[i].is_wicket || i === balls.length - 1) {
          partnershipRuns  += (balls[i].runs_scored || 0) + (balls[i].extra_runs || 0);
          partnershipBalls += balls[i].is_legal !== 0 ? 1 : 0;
        }
      }

      // Last 10 overs
      const last10Start = Math.max(0, balls.length - 60);
      const last10Balls = balls.slice(last10Start);
      const last10Runs  = last10Balls.reduce((s, b) => s + (b.runs_scored || 0) + (b.extra_runs || 0), 0);
      const last10Wkts  = last10Balls.filter(b => b.is_wicket).length;

      // Last 5 overs
      const last5Start = Math.max(0, balls.length - 30);
      const last5Balls = balls.slice(last5Start);
      const last5Runs  = last5Balls.reduce((s, b) => s + (b.runs_scored || 0) + (b.extra_runs || 0), 0);
      const last5Wkts  = last5Balls.filter(b => b.is_wicket).length;

      // Powerplay (first 6 overs = first 36 legal balls approx)
      const ppBalls = balls.slice(0, Math.min(36, balls.length));
      const ppRuns  = ppBalls.reduce((s, b) => s + (b.runs_scored || 0) + (b.extra_runs || 0), 0);
      const ppWkts  = ppBalls.filter(b => b.is_wicket).length;
      const ppOvers = Math.min(6, Math.floor(balls.length / 6));

      setStats({
        partnership: { runs: partnershipRuns, balls: partnershipBalls },
        last10: { runs: last10Runs, wickets: last10Wkts },
        last5:  { runs: last5Runs,  wickets: last5Wkts  },
        powerplay: { runs: ppRuns,  wickets: ppWkts, overs: ppOvers },
      });

      setLoading(false);
    } catch (err) {
      console.error('WinProbabilityScreen error:', err);
      setError('Could not load win probability data.');
      setLoading(false);
    }
  };

  const buildChartData = () => {
    if (timeline.length === 0) return null;
    const step    = Math.max(1, Math.floor(timeline.length / 20));
    const sampled = timeline.filter((_, i) => i % step === 0 || i === timeline.length - 1);
    return {
      labels: sampled.map((p) => p.label),
      datasets: [
        {
          data: sampled.map((p) => parseFloat(p.probability.toFixed(1))),
          color: (opacity = 1) => `rgba(29, 158, 117, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: sampled.map(() => 50),
          color: (opacity = 1) => `rgba(180, 180, 180, ${opacity})`,
          strokeWidth: 1,
          withDots: false,
        },
      ],
    };
  };

  const chartData = buildChartData();

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color="#1D9E75" />
        <Text style={styles.loadingText}>Calculating win probability…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centred}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const battingProb  = finalProb ?? 50;
  const bowlingProb  = 100 - battingProb;
  const probDesc     = getProbabilityDescription(battingProb, battingTeamName, bowlingTeamName);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Win Probability</Text>
        <Text style={styles.subtitle}>
          {battingTeamName} chasing {target} off {totalOvers} overs
        </Text>
      </View>

      {/* ── CRICBUZZ-STYLE PROBABILITY BAR ─────────────────────────────── */}
      <View style={styles.probCard}>
        {/* Team labels */}
        <View style={styles.probTeamRow}>
          <Text style={styles.probTeamName}>{battingTeamName}</Text>
          <Text style={styles.probTeamName}>{bowlingTeamName}</Text>
        </View>

        {/* Two-colour bar */}
        <View style={styles.probBarOuter}>
          <View style={[styles.probBarLeft,  { flex: battingProb }]} />
          <View style={[styles.probBarRight, { flex: bowlingProb }]} />
        </View>

        {/* Percentages */}
        <View style={styles.probTeamRow}>
          <Text style={[styles.probPct, { color: '#1D9E75' }]}>{battingProb}%</Text>
          <Text style={[styles.probPct, { color: '#E24B4A' }]}>{bowlingProb}%</Text>
        </View>

        {/* Description */}
        <Text style={styles.probDesc}>{probDesc}</Text>
      </View>

      {/* ── KEY STATS ──────────────────────────────────────────────────── */}
      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>KEY STATS</Text>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Partnership</Text>
            <Text style={styles.statValue}>
              {stats.partnership.runs}({stats.partnership.balls})
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Last 10 overs</Text>
            <Text style={styles.statValue}>
              {stats.last10.runs} runs, {stats.last10.wickets} wicket{stats.last10.wickets !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Last 5 overs</Text>
            <Text style={styles.statValue}>
              {stats.last5.runs} runs, {stats.last5.wickets} wicket{stats.last5.wickets !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Powerplay</Text>
            <Text style={styles.statValue}>
              0.1 – {stats.powerplay.overs}.0 overs, {stats.powerplay.runs} runs
            </Text>
          </View>
        </View>
      )}

      {/* ── PROBABILITY CHART ──────────────────────────────────────────── */}
      {chartData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Probability over innings</Text>
          <Text style={styles.chartSubtitle}>Grey line = 50% (even match)</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 32}
            height={240}
            yAxisSuffix="%"
            fromZero
            chartConfig={{
              backgroundColor:         '#FFFFFF',
              backgroundGradientFrom:  '#FFFFFF',
              backgroundGradientTo:    '#F5F5F5',
              decimalPlaces: 0,
              color:      (opacity = 1) => `rgba(29, 158, 117, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 8 },
              propsForDots: { r: '3', strokeWidth: '1', stroke: '#1D9E75' },
            }}
            bezier
            style={styles.chart}
            withHorizontalLabels
            withVerticalLabels
            segments={5}
            yLabelsOffset={8}
          />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#1D9E75' }]} />
              <Text style={styles.legendText}>{battingTeamName}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#BBBBBB' }]} />
              <Text style={styles.legendText}>50% line</Text>
            </View>
          </View>
          <Text style={styles.xAxisLabel}>Over.Ball</Text>
        </View>
      )}

      {/* ── OVER-BY-OVER TABLE ─────────────────────────────────────────── */}
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>Over-by-over</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.headerCell]}>Over</Text>
          <Text style={[styles.tableCell, styles.headerCell, styles.wide]}>
            {battingTeamName} win %
          </Text>
          <Text style={[styles.tableCell, styles.headerCell, styles.wide]}>
            {bowlingTeamName} win %
          </Text>
        </View>
        {timeline
          .filter((_, i) => (i + 1) % 6 === 0 || i === timeline.length - 1)
          .map((point, i) => (
            <View
              key={i}
              style={[styles.tableRow, i % 2 === 0 && styles.tableRowShaded]}
            >
              <Text style={styles.tableCell}>{point.label}</Text>
              <Text style={[styles.tableCell, styles.wide, { color: '#1D9E75', fontWeight: '600' }]}>
                {point.probability.toFixed(0)}%
              </Text>
              <Text style={[styles.tableCell, styles.wide, { color: '#E24B4A', fontWeight: '600' }]}>
                {(100 - point.probability).toFixed(0)}%
              </Text>
            </View>
          ))}
      </View>

      <Text style={styles.footnote}>
        Algorithm adapted from Akhtar et al. (2022). Calculated on-device.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content:   { padding: 16, paddingBottom: 40 },
  centred:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#555', fontSize: 15 },
  errorText:   { color: '#E24B4A', fontSize: 15, textAlign: 'center' },

  // Header
  header:   { backgroundColor: '#1D9E75', borderRadius: 10, padding: 16, marginBottom: 16 },
  title:    { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#A7EDCF', fontSize: 14, marginTop: 4 },

  // Cricbuzz-style probability bar card
  probCard: {
    backgroundColor: '#FFF', borderRadius: 10, padding: 16,
    marginBottom: 16, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
  },
  probTeamRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  probTeamName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  probBarOuter: {
    flexDirection: 'row', height: 12, borderRadius: 6,
    overflow: 'hidden', marginBottom: 8,
  },
  probBarLeft:  { backgroundColor: '#1D9E75' },
  probBarRight: { backgroundColor: '#E24B4A' },
  probPct: { fontSize: 18, fontWeight: 'bold' },
  probDesc: {
    textAlign: 'center', fontSize: 13, color: '#555',
    fontStyle: 'italic', marginTop: 10,
  },

  // Key stats card
  statsCard: {
    backgroundColor: '#FFF', borderRadius: 10, padding: 16,
    marginBottom: 16, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 13, fontWeight: '800', color: '#888',
    letterSpacing: 1, marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10,
  },
  statLabel: { fontSize: 14, color: '#1A1A1A', fontWeight: '600' },
  statValue: { fontSize: 14, color: '#555' },
  divider:   { height: 1, backgroundColor: '#F0F0F0' },

  // Chart
  chartContainer: {
    backgroundColor: '#FFF', borderRadius: 10, padding: 12,
    marginBottom: 16, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
  },
  chartTitle:    { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 2 },
  chartSubtitle: { fontSize: 12, color: '#888', marginBottom: 8 },
  chart:         { borderRadius: 8 },
  xAxisLabel:    { textAlign: 'center', fontSize: 11, color: '#888', marginTop: 4 },
  legendRow:     { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:     { width: 10, height: 10, borderRadius: 5 },
  legendText:    { fontSize: 12, color: '#555' },

  // Over-by-over table
  tableContainer: {
    backgroundColor: '#FFF', borderRadius: 10, padding: 12,
    marginBottom: 16, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
  },
  tableTitle: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 8 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#1D9E75',
    borderRadius: 6, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 4,
  },
  tableRow:       { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4 },
  tableRowShaded: { backgroundColor: '#F9F9F9' },
  tableCell:      { flex: 1, fontSize: 13, color: '#333' },
  headerCell:     { color: '#FFF', fontWeight: '700' },
  wide:           { flex: 2 },

  footnote: {
    fontSize: 11, color: '#AAA',
    textAlign: 'center', fontStyle: 'italic', marginTop: 8,
  },
});