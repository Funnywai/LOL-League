// src/bot/commands/register.ts
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import Database from 'better-sqlite3';
import { RiotApi } from '../../riot/api';
import { insertUser, getUserByDiscordId } from '../../db/users';

export async function handleRegister(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
  riotApi: RiotApi
): Promise<void> {
  const gameName = interaction.options.getString('game_name', true);
  const tagline = interaction.options.getString('tagline', true);
  const discordId = interaction.user.id;

  const existing = getUserByDiscordId(db, discordId);
  if (existing) {
    await interaction.reply({
      content: '你已經綁定了 Riot 帳號。請先使用 `/unregister` 解除綁定。',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const account = await riotApi.getSummonerByRiotId(gameName, tagline);
    insertUser(db, {
      discord_id: discordId,
      riot_puuid: account.puuid,
      riot_game_name: account.gameName,
      riot_tagline: account.tagLine,
    });

    const embed = new EmbedBuilder()
      .setTitle('✅ 註冊成功')
      .setColor(0x00ff00)
      .addFields(
        { name: 'Riot ID', value: `${account.gameName}#${account.tagLine}`, inline: true },
        { name: 'PUUID', value: account.puuid.slice(0, 8) + '...', inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({
      content: `查詢 Riot 帳號失敗：${gameName}#${tagline}。請確認名稱與標籤是否正確。`,
    });
  }
}
