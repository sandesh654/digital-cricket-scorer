import * as SQLite from 'expo-sqlite';

// Open the database
const db = SQLite.openDatabaseSync('cricket_scorer.db');

// ─── INITIALISE ALL TABLES ───────────────────────────────────────────────────
export const initDatabase = () => {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    -- Teams table
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      home_ground TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Players table
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'allrounder',
      jersey_number INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    -- Matches table
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team1_id INTEGER NOT NULL,
      team2_id INTEGER NOT NULL,
      toss_winner_id INTEGER,
      toss_decision TEXT,
      total_overs INTEGER NOT NULL DEFAULT 20,
      venue TEXT,
      match_date TEXT,
      status TEXT NOT NULL DEFAULT 'upcoming',
      winner_id INTEGER,
      result_summary TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (team1_id) REFERENCES teams(id),
      FOREIGN KEY (team2_id) REFERENCES teams(id)
    );

    -- Innings table
    CREATE TABLE IF NOT EXISTS innings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      batting_team_id INTEGER NOT NULL,
      bowling_team_id INTEGER NOT NULL,
      innings_number INTEGER NOT NULL,
      total_runs INTEGER DEFAULT 0,
      total_wickets INTEGER DEFAULT 0,
      total_balls INTEGER DEFAULT 0,
      extras INTEGER DEFAULT 0,
      wides INTEGER DEFAULT 0,
      no_balls INTEGER DEFAULT 0,
      byes INTEGER DEFAULT 0,
      leg_byes INTEGER DEFAULT 0,
      is_completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (batting_team_id) REFERENCES teams(id),
      FOREIGN KEY (bowling_team_id) REFERENCES teams(id)
    );

    -- Balls table (ball-by-ball)
    CREATE TABLE IF NOT EXISTS balls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      innings_id INTEGER NOT NULL,
      batsman_id INTEGER NOT NULL,
      bowler_id INTEGER NOT NULL,
      over_number INTEGER NOT NULL,
      ball_number INTEGER NOT NULL,
      runs_scored INTEGER DEFAULT 0,
      is_wicket INTEGER DEFAULT 0,
      wicket_type TEXT,
      fielder_id INTEGER,
      extra_type TEXT,
      extra_runs INTEGER DEFAULT 0,
      is_legal INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (innings_id) REFERENCES innings(id) ON DELETE CASCADE,
      FOREIGN KEY (batsman_id) REFERENCES players(id),
      FOREIGN KEY (bowler_id) REFERENCES players(id)
    );

    -- Batting scorecards
    CREATE TABLE IF NOT EXISTS batting_scorecards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      innings_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      runs INTEGER DEFAULT 0,
      balls_faced INTEGER DEFAULT 0,
      fours INTEGER DEFAULT 0,
      sixes INTEGER DEFAULT 0,
      how_out TEXT DEFAULT 'not out',
      is_batting INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (innings_id) REFERENCES innings(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    -- Bowling scorecards
    CREATE TABLE IF NOT EXISTS bowling_scorecards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      innings_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      balls_bowled INTEGER DEFAULT 0,
      runs_given INTEGER DEFAULT 0,
      wickets INTEGER DEFAULT 0,
      maidens INTEGER DEFAULT 0,
      wides INTEGER DEFAULT 0,
      no_balls INTEGER DEFAULT 0,
      is_bowling INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (innings_id) REFERENCES innings(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id)
    );
  `);
};

// ─── TEAM QUERIES ─────────────────────────────────────────────────────────────

export const createTeam = (name, homeGround = '') => {
  return db.runSync(
    'INSERT INTO teams (name, home_ground) VALUES (?, ?)',
    [name, homeGround]
  );
};

export const getAllTeams = () => {
  return db.getAllSync('SELECT * FROM teams ORDER BY name ASC');
};

export const getTeamById = (teamId) => {
  return db.getFirstSync('SELECT * FROM teams WHERE id = ?', [teamId]);
};

export const deleteTeam = (teamId) => {
  return db.runSync('DELETE FROM teams WHERE id = ?', [teamId]);
};

// ─── PLAYER QUERIES ───────────────────────────────────────────────────────────

export const createPlayer = (teamId, name, role, jerseyNumber = null) => {
  return db.runSync(
    'INSERT INTO players (team_id, name, role, jersey_number) VALUES (?, ?, ?, ?)',
    [teamId, name, role, jerseyNumber]
  );
};

export const getPlayersByTeam = (teamId) => {
  return db.getAllSync(
    'SELECT * FROM players WHERE team_id = ? ORDER BY name ASC',
    [teamId]
  );
};

export const getPlayerById = (playerId) => {
  return db.getFirstSync('SELECT * FROM players WHERE id = ?', [playerId]);
};

export const deletePlayer = (playerId) => {
  return db.runSync('DELETE FROM players WHERE id = ?', [playerId]);
};

// ─── MATCH QUERIES ────────────────────────────────────────────────────────────

export const createMatch = (team1Id, team2Id, totalOvers, venue, matchDate) => {
  return db.runSync(
    `INSERT INTO matches (team1_id, team2_id, total_overs, venue, match_date, status)
     VALUES (?, ?, ?, ?, ?, 'upcoming')`,
    [team1Id, team2Id, totalOvers, venue, matchDate]
  );
};

export const startMatch = (matchId, tossWinnerId, tossDecision) => {
  db.runSync(
    `UPDATE matches SET toss_winner_id = ?, toss_decision = ?, status = 'live'
     WHERE id = ?`,
    [tossWinnerId, tossDecision, matchId]
  );
};

export const getAllMatches = () => {
  return db.getAllSync(`
    SELECT m.*,
      t1.name AS team1_name,
      t2.name AS team2_name,
      w.name  AS winner_name
    FROM matches m
    JOIN teams t1 ON m.team1_id = t1.id
    JOIN teams t2 ON m.team2_id = t2.id
    LEFT JOIN teams w ON m.winner_id = w.id
    ORDER BY m.created_at DESC
  `);
};

export const getMatchById = (matchId) => {
  return db.getFirstSync(`
    SELECT m.*,
      t1.name AS team1_name,
      t2.name AS team2_name,
      tw.name AS toss_winner_name,
      w.name  AS winner_name
    FROM matches m
    JOIN teams t1  ON m.team1_id      = t1.id
    JOIN teams t2  ON m.team2_id      = t2.id
    LEFT JOIN teams tw ON m.toss_winner_id = tw.id
    LEFT JOIN teams w  ON m.winner_id      = w.id
    WHERE m.id = ?
  `, [matchId]);
};

export const getCompletedMatches = () => {
  return db.getAllSync(`
    SELECT m.*,
      t1.name AS team1_name,
      t2.name AS team2_name,
      w.name  AS winner_name
    FROM matches m
    JOIN teams t1 ON m.team1_id = t1.id
    JOIN teams t2 ON m.team2_id = t2.id
    LEFT JOIN teams w ON m.winner_id = w.id
    WHERE m.status = 'completed'
    ORDER BY m.created_at DESC
  `);
};

export const completeMatch = (matchId, winnerId, resultSummary) => {
  db.runSync(
    `UPDATE matches SET status = 'completed', winner_id = ?, result_summary = ?
     WHERE id = ?`,
    [winnerId, resultSummary, matchId]
  );
};

// ─── INNINGS QUERIES ──────────────────────────────────────────────────────────

export const createInnings = (matchId, battingTeamId, bowlingTeamId, inningsNumber) => {
  return db.runSync(
    `INSERT INTO innings (match_id, batting_team_id, bowling_team_id, innings_number)
     VALUES (?, ?, ?, ?)`,
    [matchId, battingTeamId, bowlingTeamId, inningsNumber]
  );
};

export const getInningsByMatch = (matchId) => {
  return db.getAllSync(
    'SELECT * FROM innings WHERE match_id = ? ORDER BY innings_number ASC',
    [matchId]
  );
};

export const getCurrentInnings = (matchId) => {
  return db.getFirstSync(
    `SELECT * FROM innings WHERE match_id = ? AND is_completed = 0
     ORDER BY innings_number ASC LIMIT 1`,
    [matchId]
  );
};

export const getInningsById = (inningsId) => {
  return db.getFirstSync('SELECT * FROM innings WHERE id = ?', [inningsId]);
};

export const updateInningsTotals = (inningsId, updates) => {
  const {
    total_runs, total_wickets, total_balls,
    extras, wides, no_balls, byes, leg_byes
  } = updates;
  db.runSync(
    `UPDATE innings SET
       total_runs = ?, total_wickets = ?, total_balls = ?,
       extras = ?, wides = ?, no_balls = ?, byes = ?, leg_byes = ?
     WHERE id = ?`,
    [total_runs, total_wickets, total_balls,
     extras, wides, no_balls, byes, leg_byes,
     inningsId]
  );
};

export const completeInnings = (inningsId) => {
  db.runSync('UPDATE innings SET is_completed = 1 WHERE id = ?', [inningsId]);
};

// ─── BALL QUERIES ─────────────────────────────────────────────────────────────

export const recordBall = (ball) => {
  const {
    innings_id, batsman_id, bowler_id,
    over_number, ball_number,
    runs_scored = 0, is_wicket = 0, wicket_type = null, fielder_id = null,
    extra_type = null, extra_runs = 0, is_legal = 1
  } = ball;

  return db.runSync(
    `INSERT INTO balls
       (innings_id, batsman_id, bowler_id, over_number, ball_number,
        runs_scored, is_wicket, wicket_type, fielder_id,
        extra_type, extra_runs, is_legal)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [innings_id, batsman_id, bowler_id, over_number, ball_number,
     runs_scored, is_wicket ? 1 : 0, wicket_type, fielder_id,
     extra_type, extra_runs, is_legal ? 1 : 0]
  );
};

export const getBallsByInnings = (inningsId) => {
  return db.getAllSync(
    'SELECT * FROM balls WHERE innings_id = ? ORDER BY over_number, ball_number',
    [inningsId]
  );
};

// ─── BATTING SCORECARD QUERIES ────────────────────────────────────────────────

export const getBattingScorecard = (inningsId) => {
  return db.getAllSync(`
    SELECT bs.*, p.name AS player_name, p.jersey_number
    FROM batting_scorecards bs
    JOIN players p ON bs.player_id = p.id
    WHERE bs.innings_id = ?
    ORDER BY bs.id ASC
  `, [inningsId]);
};

export const upsertBattingScorecard = (inningsId, playerId, updates) => {
  const existing = db.getFirstSync(
    'SELECT * FROM batting_scorecards WHERE innings_id = ? AND player_id = ?',
    [inningsId, playerId]
  );

  if (existing) {
    db.runSync(
      `UPDATE batting_scorecards SET
         runs = ?, balls_faced = ?, fours = ?, sixes = ?,
         how_out = ?, is_batting = ?
       WHERE innings_id = ? AND player_id = ?`,
      [updates.runs, updates.balls_faced, updates.fours, updates.sixes,
       updates.how_out, updates.is_batting ? 1 : 0,
       inningsId, playerId]
    );
  } else {
    db.runSync(
      `INSERT INTO batting_scorecards
         (innings_id, player_id, runs, balls_faced, fours, sixes, how_out, is_batting)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [inningsId, playerId,
       updates.runs || 0, updates.balls_faced || 0,
       updates.fours || 0, updates.sixes || 0,
       updates.how_out || 'not out', updates.is_batting ? 1 : 0]
    );
  }
};

// ─── BOWLING SCORECARD QUERIES ────────────────────────────────────────────────

export const getBowlingScorecard = (inningsId) => {
  return db.getAllSync(`
    SELECT bs.*, p.name AS player_name, p.jersey_number
    FROM bowling_scorecards bs
    JOIN players p ON bs.player_id = p.id
    WHERE bs.innings_id = ?
    ORDER BY bs.id ASC
  `, [inningsId]);
};

export const upsertBowlingScorecard = (inningsId, playerId, updates) => {
  const existing = db.getFirstSync(
    'SELECT * FROM bowling_scorecards WHERE innings_id = ? AND player_id = ?',
    [inningsId, playerId]
  );

  if (existing) {
    db.runSync(
      `UPDATE bowling_scorecards SET
         balls_bowled = ?, runs_given = ?, wickets = ?,
         maidens = ?, wides = ?, no_balls = ?, is_bowling = ?
       WHERE innings_id = ? AND player_id = ?`,
      [updates.balls_bowled, updates.runs_given, updates.wickets,
       updates.maidens, updates.wides, updates.no_balls,
       updates.is_bowling ? 1 : 0,
       inningsId, playerId]
    );
  } else {
    db.runSync(
      `INSERT INTO bowling_scorecards
         (innings_id, player_id, balls_bowled, runs_given, wickets,
          maidens, wides, no_balls, is_bowling)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inningsId, playerId,
       updates.balls_bowled || 0, updates.runs_given || 0,
       updates.wickets || 0, updates.maidens || 0,
       updates.wides || 0, updates.no_balls || 0,
       updates.is_bowling ? 1 : 0]
    );
  }
};

// ─── PLAYER CAREER STATS ──────────────────────────────────────────────────────

export const getPlayerBattingStats = (playerId) => {
  return db.getFirstSync(`
    SELECT
      COUNT(*)                                         AS innings,
      SUM(runs)                                        AS total_runs,
      MAX(runs)                                        AS highest_score,
      SUM(fours)                                       AS total_fours,
      SUM(sixes)                                       AS total_sixes,
      SUM(balls_faced)                                 AS total_balls,
      COUNT(CASE WHEN runs >= 50 AND runs < 100 THEN 1 END) AS fifties,
      COUNT(CASE WHEN runs >= 100 THEN 1 END)          AS hundreds
    FROM batting_scorecards
    WHERE player_id = ?
  `, [playerId]);
};

export const getPlayerBowlingStats = (playerId) => {
  return db.getFirstSync(`
    SELECT
      COUNT(*)       AS innings_bowled,
      SUM(wickets)   AS total_wickets,
      SUM(runs_given)AS total_runs_given,
      SUM(balls_bowled) AS total_balls,
      SUM(maidens)   AS total_maidens
    FROM bowling_scorecards
    WHERE player_id = ?
  `, [playerId]);
};

export default db;