import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('env config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('loadConfig returns validated config with required fields', async () => {
    process.env.DISCORD_BOT_TOKEN = 'test-token';
    process.env.DISCORD_CLIENT_ID = '123456789';
    process.env.DISCORD_GUILD_ID = '987654321';
    process.env.RIOT_API_KEY = 'RGAPI-test-key';

    const { loadConfig } = await import('../../src/config/env');
    const config = loadConfig();

    expect(config.DISCORD_BOT_TOKEN).toBe('test-token');
    expect(config.DISCORD_CLIENT_ID).toBe('123456789');
    expect(config.DISCORD_GUILD_ID).toBe('987654321');
    expect(config.RIOT_API_KEY).toBe('RGAPI-test-key');
  });

  it('loadConfig applies defaults for optional fields', async () => {
    process.env.DISCORD_BOT_TOKEN = 'test-token';
    process.env.DISCORD_CLIENT_ID = '123456789';
    process.env.DISCORD_GUILD_ID = '987654321';
    process.env.RIOT_API_KEY = 'RGAPI-test-key';
    delete process.env.RIOT_REGION;
    delete process.env.RIOT_PLATFORM;

    const { loadConfig } = await import('../../src/config/env');
    const config = loadConfig();

    expect(config.RIOT_REGION).toBe('sea');
    expect(config.RIOT_PLATFORM).toBe('tw2');
  });

  it('loadConfig throws on missing required fields', async () => {
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_CLIENT_ID;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.RIOT_API_KEY;

    const { loadConfig } = await import('../../src/config/env');
    expect(() => loadConfig()).toThrow();
  });
});
