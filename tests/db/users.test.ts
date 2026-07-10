import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase, closeDatabase } from '../../src/db/connection';
import { initializeSchema } from '../../src/db/schema';
import { insertUser, getUserByDiscordId, deleteUser, getAllUsers, updateLastPollTimestamp } from '../../src/db/users';

describe('users db module', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    initializeSchema(db);
  });

  afterAll(() => {
    closeDatabase();
  });

  it('insertUser adds a user and returns the inserted record', () => {
    const user = insertUser(db, {
      discord_id: '123',
      riot_puuid: 'puuid-123',
      riot_game_name: 'TestPlayer',
      riot_tagline: 'TW1',
    });
    expect(user.discord_id).toBe('123');
    expect(user.riot_puuid).toBe('puuid-123');
    expect(user.registered_at).toBeGreaterThan(0);
    expect(user.last_poll_timestamp).toBe(0);
  });

  it('getUserByDiscordId retrieves a user by discord_id', () => {
    insertUser(db, {
      discord_id: '456',
      riot_puuid: 'puuid-456',
      riot_game_name: 'AnotherPlayer',
      riot_tagline: 'KR1',
    });
    const user = getUserByDiscordId(db, '456');
    expect(user).not.toBeNull();
    expect(user?.riot_game_name).toBe('AnotherPlayer');
  });

  it('getUserByDiscordId returns null for non-existent user', () => {
    const user = getUserByDiscordId(db, 'nonexistent');
    expect(user).toBeNull();
  });

  it('deleteUser removes a user by discord_id', () => {
    insertUser(db, {
      discord_id: '789',
      riot_puuid: 'puuid-789',
      riot_game_name: 'ToDelete',
      riot_tagline: 'EUW',
    });
    deleteUser(db, '789');
    expect(getUserByDiscordId(db, '789')).toBeNull();
  });

  it('getAllUsers returns all registered users', () => {
    insertUser(db, { discord_id: '1', riot_puuid: 'p1', riot_game_name: 'A', riot_tagline: 'T1' });
    insertUser(db, { discord_id: '2', riot_puuid: 'p2', riot_game_name: 'B', riot_tagline: 'T2' });
    const users = getAllUsers(db);
    expect(users).toHaveLength(2);
  });

  it('updateLastPollTimestamp updates the timestamp', () => {
    insertUser(db, { discord_id: '999', riot_puuid: 'p999', riot_game_name: 'C', riot_tagline: 'T3' });
    updateLastPollTimestamp(db, '999', 1700000000);
    const user = getUserByDiscordId(db, '999');
    expect(user?.last_poll_timestamp).toBe(1700000000);
  });

  it('insertUser throws on duplicate discord_id', () => {
    insertUser(db, { discord_id: 'dup', riot_puuid: 'p-dup', riot_game_name: 'D', riot_tagline: 'T4' });
    expect(() => {
      insertUser(db, { discord_id: 'dup', riot_puuid: 'p-dup2', riot_game_name: 'D2', riot_tagline: 'T5' });
    }).toThrow();
  });
});
