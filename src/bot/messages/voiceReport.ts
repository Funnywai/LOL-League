// src/bot/messages/voiceReport.ts
import { EmbedBuilder } from 'discord.js';
import { VoiceLeaderboardEntry } from '../../db/voiceSessions';

export function buildVoiceReportEmbed(
  period: 'daily' | 'weekly',
  entries: VoiceLeaderboardEntry[],
  startDate: Date,
  endDate: Date
): EmbedBuilder {
  const periodLabel = period === 'daily' ? '每日' : '每週';
  const startDateStr = startDate.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
  const endDateStr = endDate.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });

  const embed = new EmbedBuilder()
    .setTitle(`🔊 ${periodLabel}語音時數報表`)
    .setColor(period === 'daily' ? 0x0099ff : 0x9933ff)
    .setDescription(`統計區間：${startDateStr} ~ ${endDateStr}`)
    .setTimestamp();

  if (entries.length === 0) {
    embed.addFields({ name: '無資料', value: '此區間內無語音活動紀錄' });
    return embed;
  }

  const medalEmojis = ['🥇', '🥈', '🥉'];
  const topEntries = entries.slice(0, 10);

  const fields = topEntries.map((entry, index) => {
    const medal = medalEmojis[index] ?? `${index + 1}.`;
    const hours = Math.floor(entry.total_seconds / 3600);
    const minutes = Math.floor((entry.total_seconds % 3600) / 60);
    const seconds = entry.total_seconds % 60;
    const durationStr = `${hours}h ${minutes}m ${seconds}s`;
    return {
      name: `${medal} <@${entry.user_discord_id}>`,
      value: `總時長：${durationStr} | 場次：${entry.session_count}`,
      inline: false,
    };
  });

  embed.addFields(...fields);
  return embed;
}
