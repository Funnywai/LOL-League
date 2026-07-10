import Database from 'better-sqlite3';

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

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT UNIQUE NOT NULL,
      user_discord_id TEXT NOT NULL,
      champion_name TEXT NOT NULL,
      kills INTEGER NOT NULL,
      deaths INTEGER NOT NULL,
      assists INTEGER NOT NULL,
      win INTEGER NOT NULL,
      penta_kills INTEGER NOT NULL DEFAULT 0,
      game_duration_seconds INTEGER NOT NULL,
      game_end_timestamp INTEGER NOT NULL,
      queue_type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_discord_id) REFERENCES users(discord_id) ON DELETE CASCADE
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

    CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_discord_id);
    CREATE INDEX IF NOT EXISTS idx_matches_end_time ON matches(game_end_timestamp);
    CREATE INDEX IF NOT EXISTS idx_voice_user ON voice_sessions(user_discord_id);
    CREATE INDEX IF NOT EXISTS idx_voice_left_at ON voice_sessions(left_at);
  `);
}
