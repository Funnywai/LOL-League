import Database from 'better-sqlite3';
import { insertSession, closeSession } from '../db/voiceSessions';

export function handleVoiceJoin(
  db: Database.Database,
  userId: string,
  channelId: string,
  channelName: string,
  joinedAt: number
): number {
  return insertSession(db, {
    user_discord_id: userId,
    channel_id: channelId,
    channel_name: channelName,
    joined_at: joinedAt,
  });
}

export function handleVoiceLeave(
  db: Database.Database,
  userId: string,
  leftAt: number
): void {
  const openSession = db.prepare(
    'SELECT id FROM voice_sessions WHERE user_discord_id = ? AND left_at IS NULL ORDER BY joined_at DESC LIMIT 1'
  ).get(userId) as { id: number } | undefined;

  if (openSession) {
    closeSession(db, openSession.id, leftAt);
  }
}

export function handleVoiceSwitch(
  db: Database.Database,
  userId: string,
  oldChannelId: string,
  oldChannelName: string,
  newChannelId: string,
  newChannelName: string,
  switchAt: number
): { oldSessionClosed: boolean; newSessionId: number } {
  handleVoiceLeave(db, userId, switchAt);
  const newSessionId = handleVoiceJoin(db, userId, newChannelId, newChannelName, switchAt);
  return { oldSessionClosed: true, newSessionId };
}
