// src/bot/commands/unregister.ts
import { ChatInputCommandInteraction } from 'discord.js';
import Database from 'better-sqlite3';
import { deleteUser, getUserByDiscordId } from '../../db/users';

export async function handleUnregister(
  interaction: ChatInputCommandInteraction,
  db: Database.Database
): Promise<void> {
  const discordId = interaction.user.id;
  const existing = getUserByDiscordId(db, discordId);

  if (!existing) {
    await interaction.reply({
      content: '你尚未綁定 Riot 帳號。',
      ephemeral: true,
    });
    return;
  }

  deleteUser(db, discordId);
  await interaction.reply({
    content: `已解除綁定：${existing.riot_game_name}#${existing.riot_tagline}`,
    ephemeral: true,
  });
}
