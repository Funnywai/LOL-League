import { describe, it, expect } from 'vitest';
import { extractMatchData, mapQueueType } from '../../src/riot/matchProcessor';

const mockMatch = {
  info: {
    gameDuration: 1800,
    gameEndTimestamp: 1700000000000,
    queueId: 420,
    participants: [
      {
        puuid: 'test-puuid-1',
        championName: 'Ahri',
        kills: 10,
        deaths: 5,
        assists: 15,
        win: true,
        pentaKills: 0,
      },
      {
        puuid: 'test-puuid-2',
        championName: 'Yasuo',
        kills: 3,
        deaths: 12,
        assists: 2,
        win: false,
        pentaKills: 0,
      },
    ],
  },
  metadata: {
    matchId: 'SEA1_1234567890',
    participants: ['test-puuid-1', 'test-puuid-2'],
  },
};

describe('matchProcessor', () => {
  describe('mapQueueType', () => {
    it('maps 420 to ranked', () => {
      expect(mapQueueType(420)).toBe('ranked');
    });

    it('maps 440 to ranked', () => {
      expect(mapQueueType(440)).toBe('ranked');
    });

    it('maps 450 to normal', () => {
      expect(mapQueueType(450)).toBe('normal');
    });

    it('maps 900 to aram', () => {
      expect(mapQueueType(900)).toBe('aram');
    });

    it('maps unknown queue to other', () => {
      expect(mapQueueType(999)).toBe('other');
    });
  });

  describe('extractMatchData', () => {
    it('extracts data for the correct participant by puuid', () => {
      const result = extractMatchData(mockMatch, 'test-puuid-1');
      expect(result.champion_name).toBe('Ahri');
      expect(result.kills).toBe(10);
      expect(result.deaths).toBe(5);
      expect(result.assists).toBe(15);
    });

    it('converts win boolean to integer', () => {
      const winResult = extractMatchData(mockMatch, 'test-puuid-1');
      expect(winResult.win).toBe(1);

      const loseResult = extractMatchData(mockMatch, 'test-puuid-2');
      expect(loseResult.win).toBe(0);
    });

    it('extracts match_id from metadata', () => {
      const result = extractMatchData(mockMatch, 'test-puuid-1');
      expect(result.match_id).toBe('SEA1_1234567890');
    });

    it('converts gameEndTimestamp from ms to seconds', () => {
      const result = extractMatchData(mockMatch, 'test-puuid-1');
      expect(result.game_end_timestamp).toBe(1700000000);
    });

    it('uses gameDuration directly as seconds', () => {
      const result = extractMatchData(mockMatch, 'test-puuid-1');
      expect(result.game_duration_seconds).toBe(1800);
    });

    it('maps queue type correctly', () => {
      const result = extractMatchData(mockMatch, 'test-puuid-1');
      expect(result.queue_type).toBe('ranked');
    });

    it('extracts penta_kills', () => {
      const matchWithPenta = {
        ...mockMatch,
        info: {
          ...mockMatch.info,
          participants: [
            {
              ...mockMatch.info.participants[0],
              pentaKills: 2,
            },
          ],
        },
      };
      const result = extractMatchData(matchWithPenta, 'test-puuid-1');
      expect(result.penta_kills).toBe(2);
    });
  });
});
