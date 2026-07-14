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
    case 'stop':
      await handleStop(interaction, guildId);
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

  const track = await searchYouTube(songQuery);
  if (!track) {
    await interaction.editReply({ content: `❌ 找不到歌曲：**${songQuery}**` });
    return;
  }

  const player = musicManager.get(guildId);

  if (!player.isConnected()) {
    const connected = await player.connect(voiceChannel.id, voiceChannel.guild.voiceAdapterCreator);
    if (!connected) {
      await interaction.editReply({ content: '❌ 無法加入語音頻道' });
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

async function handleStop(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const player = musicManager.get(guildId);
  if (!player.isConnected()) {
    await interaction.reply({ content: '❌ 我目前不在語音頻道中', ephemeral: true });
    return;
  }

  player.stop();
  musicManager.remove(guildId);
  await interaction.reply({ content: '⏹ 已停止播放並離開語音頻道' });
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
    musicManager.remove(guildId);
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
  musicManager.remove(guildId);
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
