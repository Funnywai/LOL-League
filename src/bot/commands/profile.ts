// src/bot/commands/profile.ts
import { ChatInputCommandInteraction } from 'discord.js';
import Database from 'better-sqlite3';
import { getUserByDiscordId } from '../../db/users';
import { getMatchesByUser } from '../../db/matches';
import { buildProfileEmbed } from '../messages/profile';

export async function handleProfile(
  interaction: ChatInputCommandInteraction,
  db: Database.Database
): Promise<void> {
  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const discordId = targetUser.id;

  const user = getUserByDiscordId(db, discordId);
  if (!user) {
    await interaction.reply({
      content: '你尚未綁定 Riot 帳號。請使用 `/register` 綁定。',
      ephemeral: true,
    });
    return;
  }

  const matches = getMatchesByUser(db, discordId);
  if (matches.length === 0) {
    await interaction.reply({
      content: `${user.riot_game_name} 目前沒有遊戲紀錄。`,
      ephemeral: true,
    });
    return;
  }

  const embed = buildProfileEmbed(user, matches);
  await interaction.reply({ embeds: [embed] });
}
