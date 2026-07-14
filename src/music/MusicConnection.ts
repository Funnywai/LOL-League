// src/music/MusicConnection.ts
import {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnection,
  DiscordGatewayAdapterCreator,
} from '@discordjs/voice';

export function joinChannel(
  channelId: string,
  guildId: string,
  adapterCreator: DiscordGatewayAdapterCreator
): VoiceConnection {
  const existing = getVoiceConnection(guildId);
  if (existing) {
    return existing;
  }
  return joinVoiceChannel({
    channelId,
    guildId,
    adapterCreator,
    selfDeaf: true,
  });
}

export function getExistingConnection(guildId: string): VoiceConnection | undefined {
  return getVoiceConnection(guildId) ?? undefined;
}

export function disconnectFromGuild(guildId: string): void {
  const connection = getVoiceConnection(guildId);
  if (connection) {
    connection.destroy();
  }
}
