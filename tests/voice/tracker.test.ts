import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase, closeDatabase } from '../../src/db/connection';
import { initializeSchema } from '../../src/db/schema';
import { handleVoiceJoin, handleVoiceLeave, handleVoiceSwitch } from '../../src/voice/tracker';

describe('voice tracker', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    initializeSchema(db);
  });

  afterAll(() => {
    closeDatabase();
  });

  it('handleVoiceJoin inserts a new session', () => {
    const sessionId = handleVoiceJoin(db, 'user-1', 'chan-1', 'General', 1700000000);
    expect(sessionId).toBeGreaterThan(0);
    const session = db.prepare('SELECT * FROM voice_sessions WHERE id = ?').get(sessionId) as any;
    expect(session.user_discord_id).toBe('user-1');
    expect(session.left_at).toBeNull();
  });

  it('handleVoiceLeave closes the open session', () => {
    const sessionId = handleVoiceJoin(db, 'user-1', 'chan-1', 'General', 1700000000);
    handleVoiceLeave(db, 'user-1', 1700003600);
    const session = db.prepare('SELECT * FROM voice_sessions WHERE id = ?').get(sessionId) as any;
    expect(session.left_at).toBe(1700003600);
    expect(session.duration_seconds).toBe(3600);
  });

  it('handleVoiceSwitch closes old session and opens new one', () => {
    const oldSessionId = handleVoiceJoin(db, 'user-1', 'chan-1', 'General', 1700000000);
    const { oldSessionClosed, newSessionId } = handleVoiceSwitch(db, 'user-1', 'chan-1', 'General', 'chan-2', 'Music', 1700001800);

    expect(oldSessionClosed).toBe(true);
    expect(newSessionId).toBeGreaterThan(0);
    expect(newSessionId).not.toBe(oldSessionId);

    const oldSession = db.prepare('SELECT * FROM voice_sessions WHERE id = ?').get(oldSessionId) as any;
    expect(oldSession.left_at).toBe(1700001800);

    const newSession = db.prepare('SELECT * FROM voice_sessions WHERE id = ?').get(newSessionId) as any;
    expect(newSession.channel_id).toBe('chan-2');
    expect(newSession.left_at).toBeNull();
  });

  it('handleVoiceLeave does nothing if no open session exists', () => {
    handleVoiceLeave(db, 'nonexistent-user', 1700000000);
    const sessions = db.prepare('SELECT * FROM voice_sessions WHERE user_discord_id = ?').all('nonexistent-user');
    expect(sessions).toHaveLength(0);
  });
});
