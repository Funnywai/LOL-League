// src/bot/commands/music.ts
import { ChatInputCommandInteraction, GuildMember, EmbedBuilder } from 'discord.js';
import { musicManager, searchYouTube } from '../../music';

export async function handleMusic(interaction: ChatInputCommandInteraction): Promise<void> {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: '此指令僅限伺服器內使用', ephemeral: true });
    return;
  }

  switch (subcommand) {
    case 'play':
      await handlePlay(interaction, guildId);
      break;
    case 'pause':
      await handlePause(interaction, guildId);
      break;
    case 'resume':
      await handleResume(interaction, guildId);
      break;
    case 'skip':
      await handleSkip(interaction, guildId);
      break;
    case 'leave':
      await handleLeave(interaction, guildId);
      break;
    case 'queue':
      await handleQueue(interaction, guildId);
      break;
    case 'volume':
      await handleVolume(interaction, guildId);
      break;
    default:
      await interaction.reply({ content: '未知的子指令', ephemeral: true });
  }
}

async function handlePlay(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const songQuery = interaction.options.getString('song', true);
  const member = interaction.member as GuildMember | null;
  const voiceChannel = member?.voice?.channel;

  if (!voiceChannel) {
    await interaction.reply({ content: '❌ 你必須先加入一個語音頻道', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const searchResult = await searchYouTube(songQuery);
  if (searchResult.status === 'not_found') {
    await interaction.editReply({ content: `❌ 找不到歌曲：**${songQuery}**` });
    return;
  }
  if (searchResult.status === 'error') {
    await interaction.editReply({ content: `❌ 搜尋失敗，請稍後再試\n\`${searchResult.message}\`` });
    return;
  }

  const track = searchResult.track;
  const player = musicManager.get(guildId);

  if (!player.isConnected()) {
    const adapterCreator = voiceChannel.guild.voiceAdapterCreator;
    if (!adapterCreator) {
      await interaction.editReply({ content: '❌ 無法取得語音連線介面，請確認 bot 已正確啟動' });
      return;
    }
    const connected = await player.connect(voiceChannel.id, adapterCreator);
    if (!connected) {
      await interaction.editReply({ content: '❌ 無法加入語音頻道，請確認 bot 有「連線」和「說話」權限' });
      return;
    }
  }

  const resultMessage = await player.play({
    info: track,
    requestedBy: interaction.user.id,
  });

  if (resultMessage) {
    await interaction.editReply({ content: resultMessage });
  } else {
    const embed = new EmbedBuilder()
      .setTitle('已加入佇列')
      .setDescription(`**${track.title}**`)
      .addFields(
        { name: '時長', value: track.duration, inline: true },
        { name: '點播者', value: `<@${interaction.user.id}>`, inline: true }
      )
      .setColor(0x1db954);
    await interaction.editReply({ embeds: [embed] });
  }
}

async function handlePause(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const player = musicManager.get(guildId);
  if (!player.isConnected()) {
    await interaction.reply({ content: '❌ 我目前不在語音頻道中', ephemeral: true });
    return;
  }

  if (player.pause()) {
    await interaction.reply({ content: '⏸ 已暫停播放' });
  } else {
    await interaction.reply({ content: '❌ 目前沒有正在播放的歌曲', ephemeral: true });
  }
}

async function handleResume(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const player = musicManager.get(guildId);
  if (!player.isConnected()) {
    await interaction.reply({ content: '❌ 我目前不在語音頻道中', ephemeral: true });
    return;
  }

  if (player.resume()) {
    await interaction.reply({ content: '▶️ 繼續播放' });
  } else {
    await interaction.reply({ content: '❌ 目前沒有暫停中的歌曲', ephemeral: true });
  }
}

async function handleSkip(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const player = musicManager.get(guildId);
  if (!player.isConnected()) {
    await interaction.reply({ content: '❌ 我目前不在語音頻道中', ephemeral: true });
    return;
  }

  const skipped = player.skip();
  if (skipped) {
    await interaction.reply({ content: `⏭ 已跳過 **${skipped.info.title}**` });
  } else {
    player.stop();
    await interaction.reply({ content: '⏭ 佇列已清空，停止播放並離開語音頻道' });
  }
}

async function handleLeave(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const player = musicManager.get(guildId);
  if (!player.isConnected()) {
    await interaction.reply({ content: '❌ 我目前不在語音頻道中', ephemeral: true });
    return;
  }

  player.disconnect();
  await interaction.reply({ content: '👋 已離開語音頻道' });
}

async function handleQueue(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const player = musicManager.get(guildId);
  const queue = player.getQueue();

  if (queue.length === 0) {
    await interaction.reply({ content: '📋 佇列中沒有歌曲', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🎵 播放佇列')
    .setColor(0x1db954)
    .setDescription(
      queue
        .slice(0, 10)
        .map((track, i) => `**${i + 1}.** ${track.info.title} — <@${track.requestedBy}>`)
        .join('\n')
    );

  if (queue.length > 10) {
    embed.setFooter({ text: `...還有 ${queue.length - 10} 首歌` });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleVolume(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const percent = interaction.options.getInteger('percent', true);
  const player = musicManager.get(guildId);

  if (!player.isConnected()) {
    await interaction.reply({ content: '❌ 我目前不在語音頻道中', ephemeral: true });
    return;
  }

  const actual = player.setVolume(percent);
  await interaction.reply({ content: `🔊 音量已設為 **${actual}%**` });
}
