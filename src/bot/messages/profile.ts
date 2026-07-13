// src/bot/messages/profile.ts
import { EmbedBuilder } from 'discord.js';
import { Match } from '../../db/matches';
import { User } from '../../db/users';

export function buildProfileEmbed(user: User, matches: Match[]): EmbedBuilder {
  const totalGames = matches.length;
  const wins = matches.filter((m) => m.win === 1).length;
  const losses = totalGames - wins;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';
  const totalKills = matches.reduce((sum, m) => sum + m.kills, 0);
  const totalDeaths = matches.reduce((sum, m) => sum + m.deaths, 0);
  const totalAssists = matches.reduce((sum, m) => sum + m.assists, 0);
  const avgKda = totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : '∞';
  const totalPentas = matches.reduce((sum, m) => sum + m.penta_kills, 0);

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${user.riot_game_name}`)
    .setColor(0x0099ff)
    .setAuthor({ name: `${user.riot_game_name} 的遊戲數據` })
    .addFields(
      { name: '總場次', value: `${totalGames}`, inline: true },
      { name: '勝/負', value: `${wins} / ${losses}`, inline: true },
      { name: '勝率', value: `${winRate}%`, inline: true },
      { name: '平均 KDA', value: avgKda, inline: true },
      { name: 'Penta Kill', value: `${totalPentas}`, inline: true },
    );

  const recentMatches = matches.slice(0, 5);
  if (recentMatches.length > 0) {
    const recentText = recentMatches
      .map((m) => {
        const result = m.win === 1 ? '✅' : '❌';
        const kda = `${m.kills}/${m.deaths}/${m.assists}`;
        return `${result} ${m.champion_name} (${kda}) - ${m.queue_type}`;
      })
      .join('\n');
    embed.addFields({ name: '最近五場', value: recentText, inline: false });
  }

  embed.setTimestamp();
  return embed;
}
