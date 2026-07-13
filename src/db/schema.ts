import Database from 'better-sqlite3';

function migrateMatchesCompositeUnique(db: Database.Database): void {
  const row = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='matches'"
  ).get() as { sql: string } | undefined;

  if (!row) {
    // No matches table yet (fresh install) — CREATE TABLE IF NOT EXISTS will handle it
    return;
  }

  if (row.sql.includes('UNIQUE(match_id, user_discord_id)')) {
    // Already migrated
    return;
  }

  // Old schema: match_id TEXT UNIQUE. Migrate to composite unique.
  db.exec(`
    CREATE TABLE matches_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT NOT NULL,
      user_discord_id TEXT NOT NULL,
      champion_name TEXT NOT NULL,
      champion_name_zh TEXT NOT NULL DEFAULT '',
      kills INTEGER NOT NULL,
      deaths INTEGER NOT NULL,
      assists INTEGER NOT NULL,
      win INTEGER NOT NULL,
      penta_kills INTEGER NOT NULL DEFAULT 0,
      game_duration_seconds INTEGER NOT NULL,
      game_end_timestamp INTEGER NOT NULL,
      queue_type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(match_id, user_discord_id),
      FOREIGN KEY (user_discord_id) REFERENCES users(discord_id) ON DELETE CASCADE
    );

    INSERT INTO matches_new (id, match_id, user_discord_id, champion_name, champion_name_zh, kills, deaths, assists, win, penta_kills, game_duration_seconds, game_end_timestamp, queue_type, created_at)
    SELECT id, match_id, user_discord_id, champion_name, '', kills, deaths, assists, win, penta_kills, game_duration_seconds, game_end_timestamp, queue_type, created_at FROM matches;
    DROP TABLE matches;
    ALTER TABLE matches_new RENAME TO matches;

    CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_discord_id);
    CREATE INDEX IF NOT EXISTS idx_matches_end_time ON matches(game_end_timestamp);
  `);
}

function migrateAddChampionNameZh(db: Database.Database): void {
  const row = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='matches'"
  ).get() as { sql: string } | undefined;

  if (!row) return; // no table yet

  if (row.sql.includes('champion_name_zh')) {
    // Already has column
    return;
  }

  db.exec("ALTER TABLE matches ADD COLUMN champion_name_zh TEXT NOT NULL DEFAULT ''");
  console.log('Migration: added champion_name_zh column to matches');
}

export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      discord_id TEXT PRIMARY KEY,
      riot_puuid TEXT UNIQUE NOT NULL,
      riot_game_name TEXT NOT NULL,
      riot_tagline TEXT NOT NULL,
      registered_at INTEGER NOT NULL,
      last_poll_timestamp INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS voice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_discord_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      left_at INTEGER,
      duration_seconds INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS guild_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Run migration before creating new matches table
  migrateMatchesCompositeUnique(db);
  migrateAddChampionNameZh(db);

  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT NOT NULL,
      user_discord_id TEXT NOT NULL,
      champion_name TEXT NOT NULL,
      champion_name_zh TEXT NOT NULL DEFAULT '',
      kills INTEGER NOT NULL,
      deaths INTEGER NOT NULL,
      assists INTEGER NOT NULL,
      win INTEGER NOT NULL,
      penta_kills INTEGER NOT NULL DEFAULT 0,
      game_duration_seconds INTEGER NOT NULL,
      game_end_timestamp INTEGER NOT NULL,
      queue_type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(match_id, user_discord_id),
      FOREIGN KEY (user_discord_id) REFERENCES users(discord_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_discord_id);
    CREATE INDEX IF NOT EXISTS idx_matches_end_time ON matches(game_end_timestamp);
    CREATE INDEX IF NOT EXISTS idx_voice_user ON voice_sessions(user_discord_id);
    CREATE INDEX IF NOT EXISTS idx_voice_left_at ON voice_sessions(left_at);
  `);
}
