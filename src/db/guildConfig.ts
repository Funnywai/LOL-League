import Database from 'better-sqlite3';

export function getConfig(db: Database.Database, key: string): string | null {
  const row = db.prepare('SELECT value FROM guild_config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setConfig(db: Database.Database, key: string, value: string): void {
  db.prepare(`
    INSERT INTO guild_config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}
