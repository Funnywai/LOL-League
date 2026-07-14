// src/bot/commands/index.ts
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export const commandDefinitions = [
  new SlashCommandBuilder()
    .setName('register')
    .setDescription('綁定你的 Riot 帳號')
    .addStringOption((opt) => opt.setName('game_name').setDescription('Riot ID 名稱').setRequired(true))
    .addStringOption((opt) => opt.setName('tagline').setDescription('Riot ID 標籤 (例如 TW1)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('unregister')
    .setDescription('解除你的 Riot 帳號綁定'),

  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('查詢遊戲數據')
    .addUserOption((opt) => opt.setName('user').setDescription('查詢其他使用者 (留空查詢自己)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('排行榜')
    .addStringOption((opt) =>
      opt.setName('type').setDescription('排行榜類型').setRequired(true).addChoices(
        { name: 'KDA', value: 'kda' },
        { name: '勝場', value: 'wins' },
        { name: 'Penta Kill', value: 'penta' },
        { name: '語音時數', value: 'voice' },
        { name: '遊戲時長', value: 'gametime' },
      )
    ),

  new SlashCommandBuilder()
    .setName('voice-report')
    .setDescription('查詢語音頻道時數報表')
    .addStringOption((opt) =>
      opt.setName('period').setDescription('報表區間').setRequired(true).addChoices(
        { name: '每日', value: 'daily' },
        { name: '每週', value: 'weekly' },
      )
    ),

  new SlashCommandBuilder()
    .setName('config')
    .setDescription('伺服器設定')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('set-channel').setDescription('設定通知頻道')
        .addStringOption((opt) =>
          opt.setName('type').setDescription('頻道類型').setRequired(true).addChoices(
            { name: '遊戲結果通知', value: 'game_result_channel' },
            { name: '語音報表通知', value: 'voice_report_channel' },
          )
        )
        .addChannelOption((opt) => opt.setName('channel').setDescription('目標頻道').setRequired(true))
    ),

  new SlashCommandBuilder()
    .setName('music')
    .setDescription('音樂播放控制')
    .addSubcommand((sub) =>
      sub.setName('play').setDescription('搜尋並播放一首歌')
        .addStringOption((opt) => opt.setName('song').setDescription('歌曲名稱或 YouTube 連結').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('pause').setDescription('暫停目前歌曲')
    )
    .addSubcommand((sub) =>
      sub.setName('resume').setDescription('繼續播放')
    )
    .addSubcommand((sub) =>
      sub.setName('skip').setDescription('跳過目前歌曲')
    )
    .addSubcommand((sub) =>
      sub.setName('leave').setDescription('離開語音頻道')
    )
    .addSubcommand((sub) =>
      sub.setName('queue').setDescription('顯示目前播放佇列')
    ),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('顯示所有可用指令'),
];
