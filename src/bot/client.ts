import { Client, GatewayIntentBits, Partials } from 'discord.js';

export function createClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
    ],
    partials: [Partials.Channel],
  });
}
