// src/music/index.ts
import { MusicPlayer } from './MusicPlayer';

class MusicManager {
  private players = new Map<string, MusicPlayer>();

  get(guildId: string): MusicPlayer {
    let player = this.players.get(guildId);
    if (!player) {
      player = new MusicPlayer(guildId);
      this.players.set(guildId, player);
    }
    return player;
  }

  has(guildId: string): boolean {
    const player = this.players.get(guildId);
    return player !== undefined && player.isConnected();
  }

  remove(guildId: string): void {
    const player = this.players.get(guildId);
    if (player) {
      player.destroy();
      this.players.delete(guildId);
    }
  }

  cleanupStale(): void {
    for (const [guildId, player] of this.players) {
      if (!player.isConnected() && !player.isPlaying()) {
        player.destroy();
        this.players.delete(guildId);
      }
    }
  }
}

export const musicManager = new MusicManager();
export { MusicPlayer } from './MusicPlayer';
export { TrackInfo, QueuedTrack, SearchResult, searchYouTube } from './MusicSources';
