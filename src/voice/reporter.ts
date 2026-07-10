import Database from 'better-sqlite3';
import { EmbedBuilder } from 'discord.js';
import { getLeaderboard, VoiceLeaderboardEntry } from '../db/voiceSessions';

export interface TimeRange {
  since: number;
  until: number;
}

export function getDayRange(date: Date = new Date()): TimeRange {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return {
    since: Math.floor(start.getTime() / 1000),
    until: Math.floor(end.getTime() / 1000),
  };
}

export function getWeekRange(date: Date = new Date()): TimeRange {
  const dayOfWeek = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    since: Math.floor(monday.getTime() / 1000),
    until: Math.floor(sunday.getTime() / 1000),
  };
}

export function generateReport(
  db: Database.Database,
  period: 'daily' | 'weekly',
  entries: VoiceLeaderboardEntry[]
): EmbedBuilder {
  const range = period === 'daily' ? getDayRange() : getWeekRange();
  const periodLabel = period === 'daily' ? '每日' : '每週';
  const startDate = new Date(range.since * 1000).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
  const endDate = new Date(range.until * 1000).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });

  const embed = new EmbedBuilder()
    .setTitle(`🔊 ${periodLabel}語音時數報表`)
    .setColor(period === 'daily' ? 0x0099ff : 0x9933ff)
    .setDescription(`統計區間：${startDate} ~ ${endDate}`)
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

export function getVoiceLeaderboard(db: Database.Database, period: 'daily' | 'weekly'): VoiceLeaderboardEntry[] {
  const range = period === 'daily' ? getDayRange() : getWeekRange();
  return getLeaderboard(db, range.since, range.until);
}
