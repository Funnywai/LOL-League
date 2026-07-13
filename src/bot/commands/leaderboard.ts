// src/bot/commands/leaderboard.ts
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import Database from 'better-sqlite3';
import { getAllUsers } from '../../db/users';
import { getMatchesByUser } from '../../db/matches';
import { getLeaderboard } from '../../db/voiceSessions';
import { getDayRange, getWeekRange } from '../../voice/reporter';

export async function handleLeaderboard(
  interaction: ChatInputCommandInteraction,
  db: Database.Database
): Promise<void> {
  const type = interaction.options.getString('type', true);
  const users = getAllUsers(db);

  const embed = new EmbedBuilder().setColor(0xffd700).setTimestamp();

  if (type === 'voice') {
    const range = getWeekRange();
    const entries = getLeaderboard(db, range.since, range.until);
    embed.setTitle('🏆 語音時數排行榜（本週）');

    if (entries.length === 0) {
      embed.setDescription('本週無語音活動紀錄');
    } else {
      const fields = entries.slice(0, 10).map((entry, i) => {
        const hours = Math.floor(entry.total_seconds / 3600);
        const minutes = Math.floor((entry.total_seconds % 3600) / 60);
        return {
          name: `${i + 1}. ${entry.riot_game_name ?? entry.user_discord_id}`,
          value: `${hours}h ${minutes}m | ${entry.session_count} 場`,
          inline: false,
        };
      });
      embed.addFields(...fields);
    }
  } else {
    const userStats = users.map((user) => {
      const matches = getMatchesByUser(db, user.discord_id);
      const totalKills = matches.reduce((s, m) => s + m.kills, 0);
      const totalDeaths = matches.reduce((s, m) => s + m.deaths, 0);
      const totalAssists = matches.reduce((s, m) => s + m.assists, 0);
      const kda = totalDeaths > 0 ? (totalKills + totalAssists) / totalDeaths : Infinity;
      const wins = matches.filter((m) => m.win === 1).length;
      const pentas = matches.reduce((s, m) => s + m.penta_kills, 0);
      return { name: user.riot_game_name, kda, wins, pentas, totalGames: matches.length };
    });

    if (type === 'kda') {
      embed.setTitle('🏆 KDA 排行榜');
      userStats.sort((a, b) => b.kda - a.kda);
      const fields = userStats.slice(0, 10).map((s, i) => ({
        name: `${i + 1}. ${s.name}`,
        value: `KDA: ${s.kda === Infinity ? '∞' : s.kda.toFixed(2)} (${s.totalGames} 場)`,
        inline: false,
      }));
      if (fields.length > 0) embed.addFields(...fields);
      else embed.setDescription('尚無遊戲紀錄');
    } else if (type === 'wins') {
      embed.setTitle('🏆 勝場排行榜');
      userStats.sort((a, b) => b.wins - a.wins);
      const fields = userStats.slice(0, 10).map((s, i) => ({
        name: `${i + 1}. ${s.name}`,
        value: `${s.wins} 勝 (${s.totalGames} 場)`,
        inline: false,
      }));
      if (fields.length > 0) embed.addFields(...fields);
      else embed.setDescription('尚無遊戲紀錄');
    } else if (type === 'penta') {
      embed.setTitle('🏆 Penta Kill 排行榜');
      userStats.sort((a, b) => b.pentas - a.pentas);
      const fields = userStats.slice(0, 10).map((s, i) => ({
        name: `${i + 1}. ${s.name}`,
        value: `${s.pentas} 次 Penta Kill (${s.totalGames} 場)`,
        inline: false,
      }));
      if (fields.length > 0) embed.addFields(...fields);
      else embed.setDescription('尚無遊戲紀錄');
    }
  }

  await interaction.reply({ embeds: [embed] });
}
