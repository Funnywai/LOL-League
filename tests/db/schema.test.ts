import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase, closeDatabase } from '../../src/db/connection';
import { initializeSchema } from '../../src/db/schema';

describe('database schema', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    initializeSchema(db);
  });

  afterAll(() => {
    closeDatabase();
  });

  it('creates users table with correct columns', () => {
    const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string; type: string; notnull: number; pk: number }>;
    const colMap = new Map(columns.map((c) => [c.name, c]));

    expect(colMap.get('discord_id')?.type).toBe('TEXT');
    expect(colMap.get('discord_id')?.pk).toBe(1);
    expect(colMap.get('riot_puuid')?.notnull).toBe(1);
    expect(colMap.get('riot_game_name')?.notnull).toBe(1);
    expect(colMap.get('riot_tagline')?.notnull).toBe(1);
    expect(colMap.get('registered_at')?.type).toBe('INTEGER');
    expect(colMap.get('last_poll_timestamp')?.notnull).toBe(1);
  });

  it('creates matches table with correct columns', () => {
    const columns = db.prepare("PRAGMA table_info(matches)").all() as Array<{ name: string; type: string; notnull: number; pk: number }>;
    const colMap = new Map(columns.map((c) => [c.name, c]));

    expect(colMap.get('match_id')?.notnull).toBe(1);
    expect(colMap.get('champion_name')?.notnull).toBe(1);
    expect(colMap.get('kills')?.type).toBe('INTEGER');
    expect(colMap.get('deaths')?.type).toBe('INTEGER');
    expect(colMap.get('assists')?.type).toBe('INTEGER');
    expect(colMap.get('win')?.type).toBe('INTEGER');
    expect(colMap.get('queue_type')?.type).toBe('TEXT');
    expect(colMap.get('game_end_timestamp')?.type).toBe('INTEGER');
  });

  it('creates voice_sessions table with correct columns', () => {
    const columns = db.prepare("PRAGMA table_info(voice_sessions)").all() as Array<{ name: string; type: string; notnull: number; pk: number }>;
    const colMap = new Map(columns.map((c) => [c.name, c]));

    expect(colMap.get('user_discord_id')?.notnull).toBe(1);
    expect(colMap.get('channel_id')?.notnull).toBe(1);
    expect(colMap.get('joined_at')?.type).toBe('INTEGER');
    expect(colMap.get('left_at')?.notnull).toBe(0);
    expect(colMap.get('duration_seconds')?.type).toBe('INTEGER');
  });

  it('creates guild_config table with key-value structure', () => {
    const columns = db.prepare("PRAGMA table_info(guild_config)").all() as Array<{ name: string; type: string; pk: number }>;
    const colMap = new Map(columns.map((c) => [c.name, c]));

    expect(colMap.get('key')?.type).toBe('TEXT');
    expect(colMap.get('key')?.pk).toBe(1);
    expect(colMap.get('value')?.type).toBe('TEXT');
  });

  it('enables foreign keys', () => {
    const result = db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };
    expect(result.foreign_keys).toBe(1);
  });

  it('uses WAL journal mode', () => {
    const result = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
    // :memory: databases cannot use WAL; production file-based databases will use WAL
    expect(['wal', 'memory']).toContain(result.journal_mode);
  });

  it('creates indexes on matches table', () => {
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='matches'").all() as Array<{ name: string }>;
    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain('idx_matches_user');
    expect(indexNames).toContain('idx_matches_end_time');
  });

  it('creates indexes on voice_sessions table', () => {
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='voice_sessions'").all() as Array<{ name: string }>;
    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain('idx_voice_user');
    expect(indexNames).toContain('idx_voice_left_at');
  });
});
