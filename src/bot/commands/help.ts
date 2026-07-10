// src/bot/commands/help.ts
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export async function handleHelp(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('📖 LOL-League 指令列表')
    .setColor(0x0099ff)
    .addFields(
      { name: '/register', value: '綁定你的 Riot 帳號\n選項：`game_name` (必填), `tagline` (必填)', inline: false },
      { name: '/unregister', value: '解除你的 Riot 帳號綁定', inline: false },
      { name: '/profile', value: '查詢遊戲數據（總場次、勝率、KDA、Penta、最近五場）\n選項：`user` (可選)', inline: false },
      { name: '/leaderboard', value: '排行榜\n選項：`type` — kda / wins / penta / voice', inline: false },
      { name: '/voice-report', value: '查詢語音頻道時數報表\n選項：`period` — daily / weekly', inline: false },
      { name: '/config set-channel', value: '設定通知頻道 (需管理伺服器權限)\n選項：`type` — game_result / voice_report, `channel`', inline: false },
      { name: '/help', value: '顯示此說明訊息', inline: false },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
