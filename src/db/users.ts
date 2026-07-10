import Database from 'better-sqlite3';

export interface User {
  discord_id: string;
  riot_puuid: string;
  riot_game_name: string;
  riot_tagline: string;
  registered_at: number;
  last_poll_timestamp: number;
}

export interface NewUser {
  discord_id: string;
  riot_puuid: string;
  riot_game_name: string;
  riot_tagline: string;
}

export function insertUser(db: Database.Database, user: NewUser): User {
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    INSERT INTO users (discord_id, riot_puuid, riot_game_name, riot_tagline, registered_at, last_poll_timestamp)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(user.discord_id, user.riot_puuid, user.riot_game_name, user.riot_tagline, now);

  const inserted = getUserByDiscordId(db, user.discord_id);
  if (inserted === null) {
    throw new Error('Failed to retrieve inserted user');
  }
  return inserted;
}

export function getUserByDiscordId(db: Database.Database, discordId: string): User | null {
  const row = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId) as User | undefined;
  return row ?? null;
}

export function deleteUser(db: Database.Database, discordId: string): void {
  db.prepare('DELETE FROM users WHERE discord_id = ?').run(discordId);
}

export function getAllUsers(db: Database.Database): User[] {
  return db.prepare('SELECT * FROM users').all() as User[];
}

export function updateLastPollTimestamp(db: Database.Database, discordId: string, timestamp: number): void {
  db.prepare('UPDATE users SET last_poll_timestamp = ? WHERE discord_id = ?').run(timestamp, discordId);
}
