import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase, closeDatabase } from '../../src/db/connection';
import { initializeSchema } from '../../src/db/schema';
import { getConfig, setConfig } from '../../src/db/guildConfig';

describe('guildConfig db module', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    initializeSchema(db);
  });

  afterAll(() => {
    closeDatabase();
  });

  it('setConfig inserts a new key-value pair', () => {
    setConfig(db, 'game_result_channel', '123456789');
    expect(getConfig(db, 'game_result_channel')).toBe('123456789');
  });

  it('setConfig updates existing key', () => {
    setConfig(db, 'voice_report_channel', 'chan-1');
    setConfig(db, 'voice_report_channel', 'chan-2');
    expect(getConfig(db, 'voice_report_channel')).toBe('chan-2');
  });

  it('getConfig returns null for non-existent key', () => {
    expect(getConfig(db, 'nonexistent_key')).toBeNull();
  });

  it('setConfig handles poll_interval_minutes', () => {
    setConfig(db, 'poll_interval_minutes', '5');
    expect(getConfig(db, 'poll_interval_minutes')).toBe('5');
  });
});
