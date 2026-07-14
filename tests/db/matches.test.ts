import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase, closeDatabase } from '../../src/db/connection';
import { initializeSchema } from '../../src/db/schema';
import { insertUser } from '../../src/db/users';
import { insertMatch, getMatchesByUser } from '../../src/db/matches';

describe('matches db module', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    initializeSchema(db);
    insertUser(db, { discord_id: '123', riot_puuid: 'p1', riot_game_name: 'Test', riot_tagline: 'TW1' });
  });

  afterAll(() => {
    closeDatabase();
  });

  it('insertMatch adds a match and returns true for new insert', () => {
    const inserted = insertMatch(db, '123', {
      match_id: 'SEA1_001',
      champion_name: 'Ahri',
      champion_name_zh: '阿璃',
      kills: 10,
      deaths: 5,
      assists: 15,
      win: 1,
      penta_kills: 0,
      game_duration_seconds: 1800,
      game_end_timestamp: 1700000000,
      queue_type: 'ranked',
    });
    expect(inserted).toBe(true);
  });

  it('insertMatch returns false for duplicate match_id (INSERT OR IGNORE)', () => {
    insertMatch(db, '123', {
      match_id: 'SEA1_002',
      champion_name: 'Yasuo',
      champion_name_zh: '犽宿',
      kills: 3,
      deaths: 12,
      assists: 2,
      win: 0,
      penta_kills: 0,
      game_duration_seconds: 900,
      game_end_timestamp: 1700000100,
      queue_type: 'normal',
    });

    const duplicate = insertMatch(db, '123', {
      match_id: 'SEA1_002',
      champion_name: 'Yasuo',
      champion_name_zh: '犽宿',
      kills: 3,
      deaths: 12,
      assists: 2,
      win: 0,
      penta_kills: 0,
      game_duration_seconds: 900,
      game_end_timestamp: 1700000100,
      queue_type: 'normal',
    });
    expect(duplicate).toBe(false);
  });

  it('getMatchesByUser returns matches for a user sorted by end time descending', () => {
    insertMatch(db, '123', {
      match_id: 'SEA1_003',
      champion_name: 'Ahri',
      champion_name_zh: '阿璃',
      kills: 5,
      deaths: 3,
      assists: 10,
      win: 1,
      penta_kills: 0,
      game_duration_seconds: 1200,
      game_end_timestamp: 1700000000,
      queue_type: 'ranked',
    });
    insertMatch(db, '123', {
      match_id: 'SEA1_004',
      champion_name: 'Lux',
      champion_name_zh: '拉克絲',
      kills: 8,
      deaths: 2,
      assists: 12,
      win: 1,
      penta_kills: 1,
      game_duration_seconds: 1500,
      game_end_timestamp: 1700001000,
      queue_type: 'aram',
    });

    const matches = getMatchesByUser(db, '123');
    expect(matches).toHaveLength(2);
    expect(matches[0].game_end_timestamp).toBeGreaterThanOrEqual(matches[1].game_end_timestamp);
  });

  it('getMatchesByUser respects limit parameter', () => {
    for (let i = 0; i < 10; i++) {
      insertMatch(db, '123', {
        match_id: `SEA1_${i}`,
        champion_name: 'Test',
        champion_name_zh: '',
        kills: i,
        deaths: 0,
        assists: 0,
        win: 1,
        penta_kills: 0,
        game_duration_seconds: 600,
        game_end_timestamp: 1700000000 + i,
        queue_type: 'ranked',
      });
    }
    const matches = getMatchesByUser(db, '123', 5);
    expect(matches).toHaveLength(5);
  });
});
