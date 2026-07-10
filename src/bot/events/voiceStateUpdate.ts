// src/bot/events/voiceStateUpdate.ts
import { VoiceState } from 'discord.js';
import Database from 'better-sqlite3';
import { handleVoiceJoin, handleVoiceLeave, handleVoiceSwitch } from '../../voice/tracker';

export function handleVoiceStateUpdate(
  oldState: VoiceState,
  newState: VoiceState,
  db: Database.Database
): void {
  const userId = newState.id;
  const now = Math.floor(Date.now() / 1000);

  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;

  if (!oldChannelId && newChannelId) {
    handleVoiceJoin(db, userId, newChannelId, newState.channel?.name ?? 'Unknown', now);
  } else if (oldChannelId && !newChannelId) {
    handleVoiceLeave(db, userId, now);
  } else if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
    handleVoiceSwitch(
      db,
      userId,
      oldChannelId,
      oldState.channel?.name ?? 'Unknown',
      newChannelId,
      newState.channel?.name ?? 'Unknown',
      now
    );
  }
}
