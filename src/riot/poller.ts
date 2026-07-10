import Database from 'better-sqlite3';
import { RiotApi } from './api';
import { extractMatchData, ProcessedMatch } from './matchProcessor';
import { getAllUsers, updateLastPollTimestamp } from '../db/users';
import { insertMatch } from '../db/matches';

export type NewMatchCallback = (discordId: string, processedMatch: ProcessedMatch) => void;

export async function pollAllUsers(
  db: Database.Database,
  riotApi: RiotApi,
  callback: NewMatchCallback
): Promise<void> {
  const users = getAllUsers(db);
  const now = Math.floor(Date.now() / 1000);

  for (const user of users) {
    try {
      const matchIds = await riotApi.getMatchIds(user.riot_puuid, user.last_poll_timestamp || undefined);

      for (const matchId of matchIds) {
        try {
          const match = await riotApi.getMatch(matchId);
          const processed = extractMatchData(match, user.riot_puuid);
          const wasInserted = insertMatch(db, user.discord_id, processed);

          if (wasInserted) {
            callback(user.discord_id, processed);
          }
        } catch (err) {
          console.error(`Failed to process match ${matchId} for user ${user.discord_id}:`, err);
        }
      }

      updateLastPollTimestamp(db, user.discord_id, now);
    } catch (err) {
      console.error(`Failed to poll matches for user ${user.discord_id}:`, err);
    }
  }
}
