import { getChampionNameZh } from './championNames';

export interface RiotParticipantDto {
  puuid: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  pentaKills: number;
}

export interface RiotMatchDto {
  info: {
    gameDuration: number;
    gameEndTimestamp: number;
    queueId: number;
    participants: RiotParticipantDto[];
  };
  metadata: {
    matchId: string;
    participants: string[];
  };
}

export interface ProcessedMatch {
  match_id: string;
  champion_name: string;
  champion_name_zh: string;
  kills: number;
  deaths: number;
  assists: number;
  win: number;
  penta_kills: number;
  game_duration_seconds: number;
  game_end_timestamp: number;
  queue_type: 'ranked' | 'normal' | 'aram' | 'other';
}

export function mapQueueType(queueId: number): 'ranked' | 'normal' | 'aram' | 'other' {
  if (queueId === 420 || queueId === 440) return 'ranked';
  if (queueId === 450) return 'normal';
  if (queueId === 900) return 'aram';
  return 'other';
}

export function extractMatchData(match: RiotMatchDto, puuid: string): ProcessedMatch {
  const participant = match.info.participants.find((p) => p.puuid === puuid);
  if (!participant) {
    throw new Error(`Participant with puuid ${puuid} not found in match ${match.metadata.matchId}`);
  }

  return {
    match_id: match.metadata.matchId,
    champion_name: participant.championName,
    champion_name_zh: getChampionNameZh(participant.championName),
    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    win: participant.win ? 1 : 0,
    penta_kills: participant.pentaKills,
    game_duration_seconds: match.info.gameDuration,
    game_end_timestamp: Math.floor(match.info.gameEndTimestamp / 1000),
    queue_type: mapQueueType(match.info.queueId),
  };
}
