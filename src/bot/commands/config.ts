// src/bot/commands/config.ts
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import Database from 'better-sqlite3';
import { getConfig, setConfig } from '../../db/guildConfig';

export async function handleConfig(
  interaction: ChatInputCommandInteraction,
  db: Database.Database
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'set-channel') {
    const type = interaction.options.getString('type', true);
    const channel = interaction.options.getChannel('channel', true);

    setConfig(db, type, channel.id);

    const embed = new EmbedBuilder()
      .setTitle('✅ 設定已更新')
      .setColor(0x00ff00)
      .addFields(
        { name: '設定項目', value: type, inline: true },
        { name: '頻道', value: `<#${channel.id}>`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
