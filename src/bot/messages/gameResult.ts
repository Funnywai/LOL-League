// src/bot/messages/gameResult.ts
import { EmbedBuilder } from 'discord.js';
import { ProcessedMatch } from '../../riot/matchProcessor';

export function buildGameResultEmbed(discordId: string, match: ProcessedMatch): EmbedBuilder {
  const result = match.win === 1 ? '勝利' : '敗北';
  const color = match.win === 1 ? 0x00ff00 : 0xff0000;
  const kda = ((match.kills + match.assists) / Math.max(match.deaths, 1)).toFixed(2);
  const durationMin = Math.floor(match.game_duration_seconds / 60);
  const durationSec = match.game_duration_seconds % 60;

  const embed = new EmbedBuilder()
    .setTitle(`🎮 ${match.champion_name} - ${result}`)
    .setColor(color)
    .setAuthor({ name: `<@${discordId}> 的最新對戰` })
    .addFields(
      { name: 'KDA', value: `${match.kills} / ${match.deaths} / ${match.assists} (${kda})`, inline: true },
      { name: '模式', value: match.queue_type, inline: true },
      { name: '時長', value: `${durationMin}m ${durationSec}s`, inline: true },
    )
    .setTimestamp(match.game_end_timestamp * 1000);

  if (match.penta_kills > 0) {
    embed.addFields({ name: '🏆 Penta Kill!', value: `${match.penta_kills} 次`, inline: true });
  }

  return embed;
}
