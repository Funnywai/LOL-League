import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { loadConfig } from './config/env';
import { createDatabase, closeDatabase } from './db/connection';
import { initializeSchema } from './db/schema';
import { createClient } from './bot/client';
import { onReady } from './bot/events/ready';
import { handleVoiceStateUpdate } from './bot/events/voiceStateUpdate';
import { handleInteractionCreate } from './bot/events/interactionCreate';
import { RiotApi } from './riot/api';
import { loadChampionNames } from './riot/championNames';
import { pollAllUsers } from './riot/poller';
import { getWeekRange } from './voice/reporter';
import { getLeaderboard } from './db/voiceSessions';
import { buildVoiceReportEmbed } from './bot/messages/voiceReport';
import { buildGameResultEmbed } from './bot/messages/gameResult';
import { getConfig } from './db/guildConfig';
import { getUserByDiscordId } from './db/users';
import { checkYtDlp } from './music';

async function main(): Promise<void> {
  const config = loadConfig();
  const db = createDatabase();
  initializeSchema(db);

  const riotApi = new RiotApi(config.RIOT_API_KEY, config.RIOT_REGION);
  const client = createClient();

  await loadChampionNames();
  checkYtDlp();

  client.on('ready', async () => {
    await onReady(client, db, config);
  });

  client.on('voiceStateUpdate', (oldState, newState) => {
    handleVoiceStateUpdate(oldState, newState, db);
  });

  client.on('interactionCreate', async (interaction) => {
    await handleInteractionCreate(interaction, db, riotApi);
  });

  const pollIntervalStr = getConfig(db, 'poll_interval_minutes') ?? '3';
  const pollInterval = parseInt(pollIntervalStr, 10);
  const cronExpr = `*/${pollInterval} * * * *`;

  cron.schedule(cronExpr, async () => {
    console.log('Running game poll...');
    try {
      await pollAllUsers(db, riotApi, (discordId, processedMatch) => {
        const gameResultChannelId = getConfig(db, 'game_result_channel');
        if (gameResultChannelId) {
          const channel = client.channels.cache.get(gameResultChannelId) as TextChannel | undefined;
          if (channel) {
            const user = getUserByDiscordId(db, discordId);
            const embed = buildGameResultEmbed(user?.riot_game_name ?? discordId, processedMatch);
            channel.send({ embeds: [embed] }).catch(console.error);
          }
        }
      });
      console.log('Game poll complete');
    } catch (err) {
      console.error('Game poll failed:', err);
    }
  });

  cron.schedule('59 23 * * 0', async () => {
    console.log('Sending weekly voice report...');
    const range = getWeekRange();
    const entries = getLeaderboard(db, range.since, range.until);
    const voiceReportChannelId = getConfig(db, 'voice_report_channel');
    if (voiceReportChannelId) {
      const channel = client.channels.cache.get(voiceReportChannelId) as TextChannel | undefined;
      if (channel) {
        const embed = buildVoiceReportEmbed('weekly', entries, new Date(range.since * 1000), new Date(range.until * 1000));
        await channel.send({ embeds: [embed] });
      }
    }
  });

  process.on('SIGINT', () => {
    console.log('Shutting down...');
    closeDatabase();
    client.destroy();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    closeDatabase();
    client.destroy();
    process.exit(0);
  });

  await client.login(config.DISCORD_BOT_TOKEN);
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
