import Database from 'better-sqlite3';
import { ProcessedMatch } from '../riot/matchProcessor';

export interface Match extends ProcessedMatch {
  id: number;
  user_discord_id: string;
  created_at: number;
}

export function insertMatch(db: Database.Database, discordId: string, data: ProcessedMatch): boolean {
  const now = Math.floor(Date.now() / 1000);
  const result = db.prepare(`
    INSERT OR IGNORE INTO matches (
      match_id, user_discord_id, champion_name, kills, deaths, assists,
      win, penta_kills, game_duration_seconds, game_end_timestamp, queue_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.match_id, discordId, data.champion_name, data.kills, data.deaths, data.assists,
    data.win, data.penta_kills, data.game_duration_seconds, data.game_end_timestamp,
    data.queue_type, now
  );
  return result.changes > 0;
}

export function getMatchesByUser(db: Database.Database, discordId: string, limit?: number): Match[] {
  const sql = limit
    ? 'SELECT * FROM matches WHERE user_discord_id = ? ORDER BY game_end_timestamp DESC LIMIT ?'
    : 'SELECT * FROM matches WHERE user_discord_id = ? ORDER BY game_end_timestamp DESC';
  return limit
    ? db.prepare(sql).all(discordId, limit) as Match[]
    : db.prepare(sql).all(discordId) as Match[];
}
