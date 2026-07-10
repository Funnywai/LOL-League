import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase, closeDatabase } from '../../src/db/connection';
import { initializeSchema } from '../../src/db/schema';
import { insertSession, closeSession, getLeaderboard } from '../../src/db/voiceSessions';

describe('voiceSessions db module', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    initializeSchema(db);
  });

  afterAll(() => {
    closeDatabase();
  });

  it('insertSession creates a session with left_at NULL and returns id', () => {
    const id = insertSession(db, {
      user_discord_id: '123',
      channel_id: 'chan-1',
      channel_name: 'General',
      joined_at: 1700000000,
    });
    expect(id).toBeGreaterThan(0);
  });

  it('closeSession sets left_at and duration_seconds', () => {
    const id = insertSession(db, {
      user_discord_id: '123',
      channel_id: 'chan-1',
      channel_name: 'General',
      joined_at: 1700000000,
    });
    closeSession(db, id, 1700003600);
    const session = db.prepare('SELECT * FROM voice_sessions WHERE id = ?').get(id) as any;
    expect(session.left_at).toBe(1700003600);
    expect(session.duration_seconds).toBe(3600);
  });

  it('getLeaderboard aggregates duration by user within time range', () => {
    const id1 = insertSession(db, { user_discord_id: 'user-a', channel_id: 'c1', channel_name: 'A', joined_at: 1700000000 });
    closeSession(db, id1, 1700001800);

    const id2 = insertSession(db, { user_discord_id: 'user-b', channel_id: 'c1', channel_name: 'A', joined_at: 1700000000 });
    closeSession(db, id2, 1700000600);

    const id3 = insertSession(db, { user_discord_id: 'user-a', channel_id: 'c2', channel_name: 'B', joined_at: 1700002000 });
    closeSession(db, id3, 1700003000);

    const leaderboard = getLeaderboard(db, 1700000000, 1700004000);
    expect(leaderboard).toHaveLength(2);
    expect(leaderboard[0].user_discord_id).toBe('user-a');
    expect(leaderboard[0].total_seconds).toBe(2800);
    expect(leaderboard[1].user_discord_id).toBe('user-b');
    expect(leaderboard[1].total_seconds).toBe(600);
  });

  it('getLeaderboard excludes sessions outside the time range', () => {
    const id1 = insertSession(db, { user_discord_id: 'user-a', channel_id: 'c1', channel_name: 'A', joined_at: 1699990000 });
    closeSession(db, id1, 1699991000);

    const id2 = insertSession(db, { user_discord_id: 'user-a', channel_id: 'c1', channel_name: 'A', joined_at: 1700002000 });
    closeSession(db, id2, 1700003000);

    const leaderboard = getLeaderboard(db, 1700000000, 1700004000);
    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0].total_seconds).toBe(1000);
  });

  it('getLeaderboard excludes sessions still open (left_at NULL)', () => {
    insertSession(db, { user_discord_id: 'user-a', channel_id: 'c1', channel_name: 'A', joined_at: 1700000000 });
    const leaderboard = getLeaderboard(db, 1700000000, 1700004000);
    expect(leaderboard).toHaveLength(0);
  });

  it('getLeaderboard returns sorted by total_seconds descending', () => {
    const id1 = insertSession(db, { user_discord_id: 'short', channel_id: 'c1', channel_name: 'A', joined_at: 1700000000 });
    closeSession(db, id1, 1700000100);

    const id2 = insertSession(db, { user_discord_id: 'long', channel_id: 'c1', channel_name: 'A', joined_at: 1700000000 });
    closeSession(db, id2, 1700005000);

    const leaderboard = getLeaderboard(db, 1700000000, 1700006000);
    expect(leaderboard[0].user_discord_id).toBe('long');
    expect(leaderboard[1].user_discord_id).toBe('short');
  });
});
