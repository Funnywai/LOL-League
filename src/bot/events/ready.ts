// src/bot/events/ready.ts
import { Client, REST, Routes } from 'discord.js';
import Database from 'better-sqlite3';
import { commandDefinitions } from '../commands/index';
import { EnvConfig } from '../../config/env';

export async function onReady(
  client: Client,
  db: Database.Database,
  config: EnvConfig
): Promise<void> {
  console.log(`Bot logged in as ${client.user?.tag}`);

  const rest = new REST({ version: '10' }).setToken(config.DISCORD_BOT_TOKEN);
  const commandsJson = commandDefinitions.map((cmd) => cmd.toJSON());

  try {
    await rest.put(
      Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.DISCORD_GUILD_ID),
      { body: commandsJson }
    );
    console.log(`Registered ${commandsJson.length} slash commands`);
  } catch (err) {
    console.error('Failed to register slash commands:', err);
  }

  const staleSessions = db.prepare(
    'UPDATE voice_sessions SET left_at = joined_at, duration_seconds = 0 WHERE left_at IS NULL'
  ).run();
  if (staleSessions.changes > 0) {
    console.log(`Closed ${staleSessions.changes} stale voice sessions`);
  }

  console.log('Bot is ready');
}
