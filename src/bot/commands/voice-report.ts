// src/bot/commands/voice-report.ts
import { ChatInputCommandInteraction } from 'discord.js';
import Database from 'better-sqlite3';
import { getLeaderboard } from '../../db/voiceSessions';
import { getDayRange, getWeekRange } from '../../voice/reporter';
import { buildVoiceReportEmbed } from '../messages/voiceReport';

export async function handleVoiceReport(
  interaction: ChatInputCommandInteraction,
  db: Database.Database
): Promise<void> {
  const period = interaction.options.getString('period', true) as 'daily' | 'weekly';
  const range = period === 'daily' ? getDayRange() : getWeekRange();
  const entries = getLeaderboard(db, range.since, range.until);

  const startDate = new Date(range.since * 1000);
  const endDate = new Date(range.until * 1000);
  const embed = buildVoiceReportEmbed(period, entries, startDate, endDate);

  await interaction.reply({ embeds: [embed] });
}
