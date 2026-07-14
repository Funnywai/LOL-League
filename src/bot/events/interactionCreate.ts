// src/bot/events/interactionCreate.ts
import { Interaction, ChatInputCommandInteraction } from 'discord.js';
import Database from 'better-sqlite3';
import { RiotApi } from '../../riot/api';
import { handleRegister } from '../commands/register';
import { handleUnregister } from '../commands/unregister';
import { handleProfile } from '../commands/profile';
import { handleLeaderboard } from '../commands/leaderboard';
import { handleVoiceReport } from '../commands/voice-report';
import { handleConfig } from '../commands/config';
import { handleHelp } from '../commands/help';
import { handleMusic } from '../commands/music';

export async function handleInteractionCreate(
  interaction: Interaction,
  db: Database.Database,
  riotApi: RiotApi
): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;

  switch (commandName) {
    case 'register':
      await handleRegister(interaction, db, riotApi);
      break;
    case 'unregister':
      await handleUnregister(interaction, db);
      break;
    case 'profile':
      await handleProfile(interaction, db);
      break;
    case 'leaderboard':
      await handleLeaderboard(interaction, db);
      break;
    case 'voice-report':
      await handleVoiceReport(interaction, db);
      break;
    case 'config':
      await handleConfig(interaction, db);
      break;
    case 'music':
      await handleMusic(interaction);
      break;
    case 'help':
      await handleHelp(interaction);
      break;
    default:
      await interaction.reply({ content: '未知指令', ephemeral: true });
  }
}
