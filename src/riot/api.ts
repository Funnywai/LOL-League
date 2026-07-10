import axios, { AxiosInstance } from 'axios';
import type { RiotMatchDto } from './matchProcessor';

const REGION_BASE_URLS: Record<string, string> = {
  sea: 'https://asia.api.riotgames.com',
  tw2: 'https://asia.api.riotgames.com',
  kr: 'https://asia.api.riotgames.com',
  jp1: 'https://asia.api.riotgames.com',
};

class TokenBucket {
  private tokens: number;
  private lastRefillTime: number;
  private readonly maxTokens: number;
  private readonly refillRatePerSecond: number;

  constructor(maxTokens: number = 20, refillRatePerSecond: number = 20) {
    this.maxTokens = maxTokens;
    this.refillRatePerSecond = refillRatePerSecond;
    this.tokens = maxTokens;
    this.lastRefillTime = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRatePerSecond;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const waitTimeMs = Math.ceil((1 - this.tokens) / this.refillRatePerSecond * 1000);
    await new Promise<void>((resolve) => setTimeout(resolve, waitTimeMs));
    this.refill();
    this.tokens -= 1;
  }
}

export interface SummonerAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export class RiotApi {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly httpClient: AxiosInstance;
  private readonly rateLimiter: TokenBucket;

  constructor(apiKey: string, region: string) {
    this.apiKey = apiKey;
    this.baseUrl = REGION_BASE_URLS[region] ?? 'https://asia.api.riotgames.com';
    this.rateLimiter = new TokenBucket(20, 20);
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: { 'X-Riot-Token': this.apiKey },
      timeout: 10000,
    });
  }

  async getSummonerByRiotId(gameName: string, tagLine: string): Promise<SummonerAccount> {
    await this.rateLimiter.acquire();
    const encodedName = encodeURIComponent(gameName);
    const encodedTag = encodeURIComponent(tagLine);
    const response = await this.httpClient.get<{
      puuid: string;
      gameName: string;
      tagLine: string;
    }>(`/riot/account/v1/accounts/by-riot-id/${encodedName}/${encodedTag}`);
    return {
      puuid: response.data.puuid,
      gameName: response.data.gameName ?? gameName,
      tagLine: response.data.tagLine ?? tagLine,
    };
  }

  async getMatchIds(puuid: string, startTime?: number): Promise<string[]> {
    await this.rateLimiter.acquire();
    const params: Record<string, number> = {};
    if (startTime !== undefined) {
      params.startTime = startTime;
    }
    const response = await this.httpClient.get<string[]>(
      `/lol/match/v5/matches/by-puuid/${puuid}/ids`,
      { params }
    );
    return response.data;
  }

  async getMatch(matchId: string): Promise<RiotMatchDto> {
    await this.rateLimiter.acquire();
    const response = await this.httpClient.get<RiotMatchDto>(`/lol/match/v5/matches/${matchId}`);
    return response.data;
  }
}
