// src/music/MusicSources.ts
import play from 'play-dl';
import { StreamType } from '@discordjs/voice';
import { Readable } from 'stream';

export interface TrackInfo {
  title: string;
  url: string;
  duration: string;
  thumbnail: string;
}

export interface QueuedTrack {
  info: TrackInfo;
  requestedBy: string;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export type SearchResult =
  | { status: 'found'; track: TrackInfo }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

export async function searchYouTube(query: string): Promise<SearchResult> {
  try {
    const results = await play.search(query, { limit: 1, source: { youtube: 'video' } });
    if (results.length === 0) {
      return { status: 'not_found' };
    }
    const video = results[0];
    return {
      status: 'found',
      track: {
        title: video.title ?? 'Unknown',
        url: video.url,
        duration: formatDuration(video.durationInSec),
        thumbnail: video.thumbnails?.[0]?.url ?? '',
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('YouTube search failed:', message);
    return { status: 'error', message };
  }
}

export async function createAudioStream(url: string): Promise<{
  stream: Readable;
  type: StreamType;
} | null> {
  try {
    const source = await play.stream(url);
    // play-dl's stream type may differ from Node's Readable at the TS level;
    // at runtime it is always a compatible readable stream.
    return {
      stream: source.stream as unknown as Readable,
      type: source.type as StreamType,
    };
  } catch (err) {
    console.error('Failed to create audio stream:', err);
    return null;
  }
}
