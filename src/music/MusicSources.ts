// src/music/MusicSources.ts
import { YouTube, Video } from 'youtube-sr';
import { StreamType } from '@discordjs/voice';
import { Readable } from 'stream';
import { spawn, execSync } from 'child_process';
import { homedir } from 'os';
import { existsSync } from 'fs';

let ytdlpPath: string | null = null;

const YTDLP_CANDIDATES = [
  'yt-dlp',
  `${homedir()}/.local/bin/yt-dlp`,
  '/usr/local/bin/yt-dlp',
  '/usr/bin/yt-dlp',
];

export function checkYtDlp(): boolean {
  for (const candidate of YTDLP_CANDIDATES) {
    if (existsSync(candidate)) {
      try {
        execSync(`"${candidate}" --version`, { stdio: 'ignore' });
        ytdlpPath = candidate;
        console.log(`yt-dlp: found at ${candidate}`);
        return true;
      } catch {
        continue;
      }
    }
  }
  console.warn('⚠ yt-dlp not found! Audio streaming will not work.');
  console.warn('  Install: pip3 install --break-system-packages yt-dlp');
  console.warn('  If installed, add ~/.local/bin to PATH or run: export PATH="$HOME/.local/bin:$PATH"');
  return false;
}

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

export type SearchResult =
  | { status: 'found'; track: TrackInfo }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

function toTrackInfo(video: Video): TrackInfo {
  return {
    title: video.title ?? 'Unknown',
    url: video.url,
    duration: video.durationFormatted ?? '?',
    thumbnail: video.thumbnail?.url ?? '',
  };
}

export async function searchYouTube(query: string): Promise<SearchResult> {
  try {
    const results = await YouTube.search(query, { limit: 1, type: 'video' });
    if (results.length === 0) {
      return { status: 'not_found' };
    }
    return { status: 'found', track: toTrackInfo(results[0]) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('YouTube search failed:', message);
    return { status: 'error', message };
  }
}

export function createAudioStream(url: string): { stream: Readable; type: StreamType } | null {
  if (!ytdlpPath) {
    console.error('Cannot create audio stream: yt-dlp is not installed');
    return null;
  }
  try {
    const ytdlp = spawn(ytdlpPath, [
      '-f', 'bestaudio[ext=webm]/bestaudio',
      '--no-playlist',
      '--no-warnings',
      '--quiet',
      '-o', '-',
      url,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    ytdlp.stderr?.on('data', (data: Buffer) => {
      console.error('yt-dlp stderr:', data.toString().trim());
    });

    ytdlp.on('error', (err) => {
      console.error('yt-dlp process error:', err.message);
    });

    ytdlp.stdout?.on('error', (err) => {
      console.error('yt-dlp stdout error:', err.message);
    });

    return {
      stream: ytdlp.stdout as Readable,
      type: StreamType.WebmOpus,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to create audio stream:', message);
    return null;
  }
}
