// src/music/MusicPlayer.ts
import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnection,
  VoiceConnectionStatus,
  StreamType,
  AudioResource,
  NoSubscriberBehavior,
  DiscordGatewayAdapterCreator,
} from '@discordjs/voice';
import { createAudioStream, QueuedTrack } from './MusicSources';
import { joinChannel, disconnectFromGuild } from './MusicConnection';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

export class MusicPlayer {
  readonly guildId: string;
  private queue: QueuedTrack[] = [];
  private player: AudioPlayer;
  private connection: VoiceConnection | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private currentResource: AudioResource | null = null;

  constructor(guildId: string) {
    this.guildId = guildId;
    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });
    this.setupPlayerEvents();
  }

  private setupPlayerEvents(): void {
    this.player.on('stateChange', (oldState, newState) => {
      if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
        this.playNext().catch((err) => {
          console.error(`playNext failed on Idle in guild ${this.guildId}:`, err.message);
        });
      }
    });

    this.player.on('error', (error) => {
      console.error(`MusicPlayer error in guild ${this.guildId}:`, error.message);
      this.playNext().catch((err) => {
        console.error(`playNext failed on error recovery in guild ${this.guildId}:`, err.message);
      });
    });
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private startIdleTimer(): void {
    this.resetIdleTimer();
    this.idleTimer = setTimeout(() => {
      if (this.player.state.status === AudioPlayerStatus.Idle && this.queue.length === 0) {
        this.disconnect();
      }
    }, IDLE_TIMEOUT_MS);
  }

  getQueue(): QueuedTrack[] {
    return [...this.queue];
  }

  isPlaying(): boolean {
    return this.player.state.status === AudioPlayerStatus.Playing;
  }

  isConnected(): boolean {
    return this.connection !== null && this.connection.state.status !== VoiceConnectionStatus.Destroyed;
  }

  async connect(channelId: string, adapterCreator: DiscordGatewayAdapterCreator): Promise<boolean> {
    if (this.isConnected()) {
      return true;
    }
    try {
      this.connection = joinChannel(channelId, this.guildId, adapterCreator);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`joinVoiceChannel failed in guild ${this.guildId}:`, message);
      return false;
    }

    this.connection.subscribe(this.player);

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 15_000);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Voice connection timed out for channel ${channelId} in guild ${this.guildId}:`, message);
      this.connection.destroy();
      this.connection = null;
      return false;
    }
  }

  async play(track: QueuedTrack): Promise<string | null> {
    this.queue.push(track);
    if (!this.isPlaying()) {
      return this.playNext();
    }
    return null;
  }

  private async playNext(): Promise<string | null> {
    const next = this.queue.shift();
    if (!next) {
      this.startIdleTimer();
      return null;
    }

    const streamResult = await createAudioStream(next.info.url);
    if (!streamResult) {
      return `❌ 無法播放 **${next.info.title}**`;
    }

    const resource = createAudioResource(streamResult.stream, {
      inputType: StreamType.Arbitrary,
    });
    this.currentResource = resource;
    this.player.play(resource);
    this.resetIdleTimer();

    return `🎵 正在播放 **${next.info.title}**\n⏱ ${next.info.duration} | 🔗 ${next.info.url}`;
  }

  skip(): QueuedTrack | null {
    if (this.queue.length === 0) {
      this.player.stop();
      return null;
    }
    const skipped = this.queue.shift();
    this.player.stop();
    return skipped ?? null;
  }

  stop(): void {
    this.queue = [];
    this.player.stop();
    this.disconnect();
  }

  disconnect(): void {
    this.resetIdleTimer();
    this.queue = [];
    this.player.stop();
    if (this.connection) {
      disconnectFromGuild(this.guildId);
      this.connection = null;
    }
  }

  destroy(): void {
    this.disconnect();
    if (this.currentResource) {
      this.currentResource = null;
    }
  }
}
