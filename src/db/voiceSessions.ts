import Database from 'better-sqlite3';

export interface VoiceSession {
  id: number;
  user_discord_id: string;
  channel_id: string;
  channel_name: string;
  joined_at: number;
  left_at: number | null;
  duration_seconds: number;
}

export interface NewVoiceSession {
  user_discord_id: string;
  channel_id: string;
  channel_name: string;
  joined_at: number;
}

export interface VoiceLeaderboardEntry {
  user_discord_id: string;
  total_seconds: number;
  session_count: number;
}

export function insertSession(db: Database.Database, session: NewVoiceSession): number {
  const result = db.prepare(`
    INSERT INTO voice_sessions (user_discord_id, channel_id, channel_name, joined_at, left_at, duration_seconds)
    VALUES (?, ?, ?, ?, NULL, 0)
  `).run(session.user_discord_id, session.channel_id, session.channel_name, session.joined_at);
  return Number(result.lastInsertRowid);
}

export function closeSession(db: Database.Database, sessionId: number, leftAt: number): void {
  const session = db.prepare('SELECT joined_at FROM voice_sessions WHERE id = ?').get(sessionId) as { joined_at: number } | undefined;
  if (!session) {
    throw new Error(`Voice session ${sessionId} not found`);
  }
  const duration = leftAt - session.joined_at;
  db.prepare(`
    UPDATE voice_sessions SET left_at = ?, duration_seconds = ? WHERE id = ?
  `).run(leftAt, duration, sessionId);
}

export function getLeaderboard(db: Database.Database, since: number, until: number): VoiceLeaderboardEntry[] {
  return db.prepare(`
    SELECT
      user_discord_id,
      SUM(duration_seconds) as total_seconds,
      COUNT(*) as session_count
    FROM voice_sessions
    WHERE left_at IS NOT NULL
      AND left_at >= ? AND left_at <= ?
    GROUP BY user_discord_id
    ORDER BY total_seconds DESC
  `).all(since, until) as VoiceLeaderboardEntry[];
}
