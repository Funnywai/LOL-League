# LOL-League Discord Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Discord bot from scratch that tracks League of Legends game records via Riot API and voice channel activity, providing game result notifications, voice time reports, and leaderboards.

**Architecture:** Layered architecture — config validation (Zod) → SQLite data layer (better-sqlite3) → Riot API integration (axios + token bucket rate limiter) → voice tracking → Discord bot (discord.js v14 with slash commands, events, and embed builders) → main entry point with cron scheduling (node-cron).

**Tech Stack:** TypeScript 5.5+, Node.js ≥22, CommonJS, discord.js v14, better-sqlite3, axios, zod, node-cron, dotenv, vitest, tsx

## Global Constraints

- TypeScript 5.5+ with `strict: true`, CommonJS module (`"module": "commonjs"`)
- Node.js ≥22, target ES2022
- Build: `tsc` → `dist/`
- Dev: `tsx watch src/index.ts`
- Test: `vitest run` (Vitest v2)
- DB: SQLite via better-sqlite3, WAL journal mode, `foreign_keys = ON`
- DB path: `./data/lol-league.db` (hardcoded, not from env)
- All timestamps stored as Unix seconds (INTEGER)
- Riot API: `gameEndTimestamp` is in milliseconds → convert to seconds with `Math.floor(ms / 1000)`
- Riot API: `gameDuration` is in seconds (use directly)
- Riot API base URL: `https://asia.api.riotgames.com` for all regions (sea/tw2/kr/jp1)
- Rate limiter: Token Bucket, max 20 tokens, 20 tokens/sec refill
- No `as any`, `@ts-ignore`, or `@ts-expect-error`
- No comments in code unless explicitly requested
- All env validation via Zod at startup; fail fast on invalid config
- `src/riot/summoner.ts` from SPEC §10 is merged into `api.ts` (no separate file)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `package.json` | Dependencies, scripts (dev/build/start/test/test:watch) |
| `tsconfig.json` | TypeScript config (strict, CommonJS, ES2022, outDir dist) |
| `vitest.config.ts` | Vitest configuration |
| `.gitignore` | Exclude node_modules, dist, data, .env, *.db, .omo |
| `.env.example` | Environment variable template |
| `src/config/env.ts` | Zod schema + `loadConfig()` for env validation |
| `src/db/connection.ts` | `createDatabase()` → better-sqlite3 Database (WAL, FK ON) |
| `src/db/schema.ts` | `initializeSchema(db)` → creates 4 tables + indexes |
| `src/db/users.ts` | User CRUD: insert, get, delete, getAll, updateLastPollTimestamp |
| `src/db/matches.ts` | Match CRUD: insertMatch (OR IGNORE), getMatchesByUser |
| `src/db/voiceSessions.ts` | Voice session CRUD: insert, close, getLeaderboard |
| `src/db/guildConfig.ts` | Guild config KV: get, set |
| `src/riot/api.ts` | RiotApi class: token bucket limiter, 3 API methods |
| `src/riot/matchProcessor.ts` | `extractMatchData()` + `mapQueueType()` pure functions |
| `src/riot/poller.ts` | `pollAllUsers()` orchestrator |
| `src/voice/tracker.ts` | `handleVoiceJoin/Leave/Switch` event handlers |
| `src/voice/reporter.ts` | `generateReport()`, `getDayRange()`, `getWeekRange()` |
| `src/bot/client.ts` | `createClient()` Discord.js Client factory |
| `src/bot/commands/index.ts` | All 7 slash command builder definitions |
| `src/bot/commands/register.ts` | `/register` handler |
| `src/bot/commands/unregister.ts` | `/unregister` handler |
| `src/bot/commands/profile.ts` | `/profile` handler |
| `src/bot/commands/leaderboard.ts` | `/leaderboard` handler |
| `src/bot/commands/voice-report.ts` | `/voice-report` handler |
| `src/bot/commands/config.ts` | `/config set-channel` handler |
| `src/bot/commands/help.ts` | `/help` handler |
| `src/bot/events/ready.ts` | `onReady()` — register commands, close stale sessions |
| `src/bot/events/voiceStateUpdate.ts` | Voice state change → tracker delegation |
| `src/bot/events/interactionCreate.ts` | Slash command router |
| `src/bot/messages/gameResult.ts` | Game result EmbedBuilder |
| `src/bot/messages/profile.ts` | Profile EmbedBuilder |
| `src/bot/messages/voiceReport.ts` | Voice report EmbedBuilder |
| `src/index.ts` | `main()` — orchestrate all layers + cron setup |
| `tests/config/env.test.ts` | Env validation tests |
| `tests/db/schema.test.ts` | Schema creation tests |
| `tests/db/users.test.ts` | User CRUD tests |
| `tests/db/matches.test.ts` | Match CRUD tests |
| `tests/db/voiceSessions.test.ts` | Voice session CRUD tests |
| `tests/db/guildConfig.test.ts` | Guild config tests |
| `tests/riot/matchProcessor.test.ts` | Match data extraction tests |
| `tests/voice/tracker.test.ts` | Voice tracking logic tests |

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| Task 1: Project Scaffolding | None | Foundation — all other tasks need package.json + tsconfig |
| Task 2: Config (env.ts) | Task 1 | Needs project structure + zod dependency |
| Task 3: DB Connection + Schema | Task 1 | Needs project structure + better-sqlite3 |
| Task 4: Riot MatchProcessor | Task 1 | Pure functions, only needs vitest for testing |
| Task 5: DB Users | Task 3 | Needs connection.ts + schema.ts (users table) |
| Task 6: DB Matches | Task 3 | Needs connection.ts + schema.ts (matches table) |
| Task 7: DB Voice Sessions | Task 3 | Needs connection.ts + schema.ts (voice_sessions table) |
| Task 8: DB Guild Config | Task 3 | Needs connection.ts + schema.ts (guild_config table) |
| Task 9: Riot API | Task 2 | Needs env.ts for RIOT_API_KEY + RIOT_REGION |
| Task 10: Riot Poller | Tasks 4, 5, 6, 9 | Needs api.ts, matchProcessor.ts, users.ts, matches.ts |
| Task 11: Voice Tracker | Task 7 | Needs voiceSessions.ts for DB operations |
| Task 12: Voice Reporter | Task 7 | Needs voiceSessions.ts for leaderboard queries |
| Task 13: Bot Client | Task 2 | Needs env.ts for Discord token + intents |
| Task 14: Bot Messages | Task 1 | Needs discord.js for EmbedBuilder only |
| Task 15: Bot Commands | Tasks 5,6,7,8,9,11,12,14 | Needs all data layers + message builders |
| Task 16: Bot Events | Tasks 13, 15, 11 | Needs client, commands, voice tracker |
| Task 17: Main Entry Point | All tasks | Orchestrates everything |

---

## Parallel Execution Graph

```
Wave 1 (Start immediately):
└── Task 1: Project Scaffolding

Wave 2 (After Wave 1):
├── Task 2: Config (env.ts)           [depends: Task 1]
├── Task 3: DB Connection + Schema    [depends: Task 1]
└── Task 4: Riot MatchProcessor       [depends: Task 1]

Wave 3 (After Wave 2):
├── Task 5: DB Users                  [depends: Task 3]
├── Task 6: DB Matches                [depends: Task 3]
├── Task 7: DB Voice Sessions         [depends: Task 3]
├── Task 8: DB Guild Config           [depends: Task 3]
└── Task 9: Riot API                  [depends: Task 2]

Wave 4 (After Wave 3):
├── Task 10: Riot Poller              [depends: Tasks 4, 5, 6, 9]
├── Task 11: Voice Tracker            [depends: Task 7]
├── Task 12: Voice Reporter           [depends: Task 7]
├── Task 13: Bot Client               [depends: Task 2]
└── Task 14: Bot Messages             [depends: Task 1]

Wave 5 (After Wave 4):
└── Task 15: Bot Commands             [depends: Tasks 5,6,7,8,9,11,12,14]

Wave 6 (After Wave 5):
└── Task 16: Bot Events               [depends: Tasks 13, 15, 11]

Wave 7 (After Wave 6):
└── Task 17: Main Entry Point         [depends: all]

Critical Path: Task 1 → Task 3 → Task 7 → Task 11 → Task 15 → Task 16 → Task 17
Estimated Parallel Speedup: ~50% faster than sequential (Wave 3 has 5 parallel tasks, Wave 4 has 5)
```

---

## Tasks

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/config/`, `src/db/`, `src/riot/`, `src/voice/`, `src/bot/commands/`, `src/bot/events/`, `src/bot/messages/`, `tests/config/`, `tests/db/`, `tests/riot/`, `tests/voice/`

**Interfaces:**
- Consumes: Nothing
- Produces: Project structure with all dependencies installed, TypeScript + Vitest configured

**Delegation Recommendation:**
- Category: `quick` — mechanical scaffolding, no logic
- Skills: [`programming`] — TypeScript project setup conventions

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript project conventions (tsconfig, package.json structure)
- OMITTED `brainstorming`: No design decisions, SPEC defines everything
- OMITTED `test-driven-development`: No tests for scaffolding itself
- OMITTED `git-master`: Commits happen in step, not a git investigation task

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p src/config src/db src/riot src/voice src/bot/commands src/bot/events src/bot/messages tests/config tests/db tests/riot tests/voice data
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "lol-league",
  "version": "1.0.0",
  "description": "Discord bot tracking LoL game records and voice channel activity",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "license": "private",
  "dependencies": {
    "axios": "^1.7.0",
    "better-sqlite3": "^11.0.0",
    "discord.js": "^14.16.0",
    "dotenv": "^17.4.2",
    "node-cron": "^3.0.3",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "tsx": "^4.16.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^22.0.0",
    "@types/node-cron": "^3.0.11"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/
data/
.env
*.db
*.db-journal
.omo/
```

- [ ] **Step 6: Create `.env.example`**

```
# Discord
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_GUILD_ID=your_discord_guild_id_here

# Riot API
RIOT_API_KEY=your_riot_api_key_here
RIOT_REGION=sea
RIOT_PLATFORM=tw2
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: node_modules created, no errors

- [ ] **Step 8: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (no source files yet, but config is valid)

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore .env.example
git commit -m "chore: scaffold project structure with TypeScript, Vitest, and dependencies"
```

---

### Task 2: Configuration & Environment (env.ts)

**Files:**
- Create: `src/config/env.ts`
- Test: `tests/config/env.test.ts`

**Interfaces:**
- Consumes: `process.env` (via dotenv)
- Produces: `EnvConfig` type, `loadConfig()` function → `EnvConfig`

```typescript
interface EnvConfig {
  DISCORD_BOT_TOKEN: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_GUILD_ID: string;
  RIOT_API_KEY: string;
  RIOT_REGION: string;      // default: 'sea'
  RIOT_PLATFORM: string;    // default: 'tw2'
}
```

**Delegation Recommendation:**
- Category: `quick` — single file with Zod schema
- Skills: [`programming`] — TypeScript + Zod patterns

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript strict typing + Zod validation
- OMITTED `test-driven-development`: TDD steps are embedded in task itself
- OMITTED `brainstorming`: SPEC fully defines env vars

- [ ] **Step 1: Write the failing test**

```typescript
// tests/config/env.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/config/env.test.ts`
Expected: FAIL — module `../../src/config/env` not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/config/env.ts
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  RIOT_API_KEY: z.string().min(1),
  RIOT_REGION: z.string().default('sea'),
  RIOT_PLATFORM: z.string().default('tw2'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new Error(`Environment validation failed: ${missing}`);
  }
  return result.data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/config/env.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/config/env.ts tests/config/env.test.ts
git commit -m "feat: add environment configuration with Zod validation"
```

---

### Task 3: DB Connection & Schema

**Files:**
- Create: `src/db/connection.ts`
- Create: `src/db/schema.ts`
- Test: `tests/db/schema.test.ts`

**Interfaces:**
- Consumes: `better-sqlite3`
- Produces: `createDatabase()` → `Database`, `initializeSchema(db)` → void

**Delegation Recommendation:**
- Category: `quick` — straightforward SQLite setup
- Skills: [`programming`] — TypeScript + better-sqlite3 patterns

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript strict typing with better-sqlite3
- OMITTED `brainstorming`: SPEC fully defines schema
- OMITTED `git-master`: No git operations needed

- [ ] **Step 1: Write the failing test**

```typescript
// tests/db/schema.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase, closeDatabase } from '../../src/db/connection';
import { initializeSchema } from '../../src/db/schema';

describe('database schema', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    initializeSchema(db);
  });

  afterAll(() => {
    closeDatabase();
  });

  it('creates users table with correct columns', () => {
    const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string; type: string; notnull: number; pk: number }>;
    const colMap = new Map(columns.map((c) => [c.name, c]));

    expect(colMap.get('discord_id')?.type).toBe('TEXT');
    expect(colMap.get('discord_id')?.pk).toBe(1);
    expect(colMap.get('riot_puuid')?.notnull).toBe(1);
    expect(colMap.get('riot_game_name')?.notnull).toBe(1);
    expect(colMap.get('riot_tagline')?.notnull).toBe(1);
    expect(colMap.get('registered_at')?.type).toBe('INTEGER');
    expect(colMap.get('last_poll_timestamp')?.notnull).toBe(1);
  });

  it('creates matches table with correct columns', () => {
    const columns = db.prepare("PRAGMA table_info(matches)").all() as Array<{ name: string; type: string; notnull: number; pk: number }>;
    const colMap = new Map(columns.map((c) => [c.name, c]));

    expect(colMap.get('match_id')?.notnull).toBe(1);
    expect(colMap.get('champion_name')?.notnull).toBe(1);
    expect(colMap.get('kills')?.type).toBe('INTEGER');
    expect(colMap.get('deaths')?.type).toBe('INTEGER');
    expect(colMap.get('assists')?.type).toBe('INTEGER');
    expect(colMap.get('win')?.type).toBe('INTEGER');
    expect(colMap.get('queue_type')?.type).toBe('TEXT');
    expect(colMap.get('game_end_timestamp')?.type).toBe('INTEGER');
  });

  it('creates voice_sessions table with correct columns', () => {
    const columns = db.prepare("PRAGMA table_info(voice_sessions)").all() as Array<{ name: string; type: string; notnull: number; pk: number }>;
    const colMap = new Map(columns.map((c) => [c.name, c]));

    expect(colMap.get('user_discord_id')?.notnull).toBe(1);
    expect(colMap.get('channel_id')?.notnull).toBe(1);
    expect(colMap.get('joined_at')?.type).toBe('INTEGER');
    expect(colMap.get('left_at')?.notnull).toBe(0);
    expect(colMap.get('duration_seconds')?.type).toBe('INTEGER');
  });

  it('creates guild_config table with key-value structure', () => {
    const columns = db.prepare("PRAGMA table_info(guild_config)").all() as Array<{ name: string; type: string; pk: number }>;
    const colMap = new Map(columns.map((c) => [c.name, c]));

    expect(colMap.get('key')?.type).toBe('TEXT');
    expect(colMap.get('key')?.pk).toBe(1);
    expect(colMap.get('value')?.type).toBe('TEXT');
  });

  it('enables foreign keys', () => {
    const result = db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };
    expect(result.foreign_keys).toBe(1);
  });

  it('uses WAL journal mode', () => {
    const result = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
    expect(result.journal_mode).toBe('wal');
  });

  it('creates indexes on matches table', () => {
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='matches'").all() as Array<{ name: string }>;
    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain('idx_matches_user');
    expect(indexNames).toContain('idx_matches_end_time');
  });

  it('creates indexes on voice_sessions table', () => {
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='voice_sessions'").all() as Array<{ name: string }>;
    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain('idx_voice_user');
    expect(indexNames).toContain('idx_voice_left_at');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/db/schema.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Write `src/db/connection.ts`**

```typescript
// src/db/connection.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbInstance: Database.Database | null = null;

export function createDatabase(dbPath?: string): Database.Database {
  const resolvedPath = dbPath ?? path.join(process.cwd(), 'data', 'lol-league.db');

  if (dbPath !== ':memory:' && !fs.existsSync(path.dirname(resolvedPath))) {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  }

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  if (dbPath === ':memory:' || dbPath === undefined) {
    dbInstance = db;
  }

  return db;
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call createDatabase() first.');
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
```

- [ ] **Step 4: Write `src/db/schema.ts`**

```typescript
// src/db/schema.ts
import Database from 'better-sqlite3';

export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      discord_id TEXT PRIMARY KEY,
      riot_puuid TEXT UNIQUE NOT NULL,
      riot_game_name TEXT NOT NULL,
      riot_tagline TEXT NOT NULL,
      registered_at INTEGER NOT NULL,
      last_poll_timestamp INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT UNIQUE NOT NULL,
      user_discord_id TEXT NOT NULL,
      champion_name TEXT NOT NULL,
      kills INTEGER NOT NULL,
      deaths INTEGER NOT NULL,
      assists INTEGER NOT NULL,
      win INTEGER NOT NULL,
      penta_kills INTEGER NOT NULL DEFAULT 0,
      game_duration_seconds INTEGER NOT NULL,
      game_end_timestamp INTEGER NOT NULL,
      queue_type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_discord_id) REFERENCES users(discord_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS voice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_discord_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      left_at INTEGER,
      duration_seconds INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS guild_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_discord_id);
    CREATE INDEX IF NOT EXISTS idx_matches_end_time ON matches(game_end_timestamp);
    CREATE INDEX IF NOT EXISTS idx_voice_user ON voice_sessions(user_discord_id);
    CREATE INDEX IF NOT EXISTS idx_voice_left_at ON voice_sessions(left_at);
  `);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/db/schema.test.ts`
Expected: PASS (8 tests)

Note: The WAL mode test may fail with `:memory:` databases since WAL requires a file. If it fails, change the test to accept either 'wal' or 'memory' for in-memory databases. The production path uses a file and will be WAL.

- [ ] **Step 6: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/db/connection.ts src/db/schema.ts tests/db/schema.test.ts
git commit -m "feat: add SQLite database connection and schema initialization"
```

---

### Task 4: Riot Match Processor

**Files:**
- Create: `src/riot/matchProcessor.ts`
- Test: `tests/riot/matchProcessor.test.ts`

**Interfaces:**
- Consumes: Raw Riot API match v5 response (typed as `RiotMatchDto`)
- Produces: `ProcessedMatch` type, `extractMatchData(match, puuid)` → `ProcessedMatch`, `mapQueueType(queueId)` → string

```typescript
interface RiotMatchDto {
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

interface RiotParticipantDto {
  puuid: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  pentaKills: number;
}

interface ProcessedMatch {
  match_id: string;
  champion_name: string;
  kills: number;
  deaths: number;
  assists: number;
  win: number;
  penta_kills: number;
  game_duration_seconds: number;
  game_end_timestamp: number;
  queue_type: 'ranked' | 'normal' | 'aram' | 'other';
}
```

**Delegation Recommendation:**
- Category: `quick` — pure data transformation, well-specified
- Skills: [`programming`] — TypeScript types + pure functions

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript strict typing, pure functions
- OMITTED `brainstorming`: SPEC fully defines the mapping
- OMITTED `systematic-debugging`: No bugs to debug, greenfield

- [ ] **Step 1: Write the failing test**

```typescript
// tests/riot/matchProcessor.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/riot/matchProcessor.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/riot/matchProcessor.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/riot/matchProcessor.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/riot/matchProcessor.ts tests/riot/matchProcessor.test.ts
git commit -m "feat: add match data extraction and queue type mapping"
```

---

### Task 5: DB Users Module

**Files:**
- Create: `src/db/users.ts`
- Test: `tests/db/users.test.ts`

**Interfaces:**
- Consumes: `Database` from `better-sqlite3`, `users` table from schema
- Produces: `User` type, `insertUser()`, `getUserByDiscordId()`, `deleteUser()`, `getAllUsers()`, `updateLastPollTimestamp()`

```typescript
interface User {
  discord_id: string;
  riot_puuid: string;
  riot_game_name: string;
  riot_tagline: string;
  registered_at: number;
  last_poll_timestamp: number;
}
```

**Delegation Recommendation:**
- Category: `quick` — straightforward CRUD operations
- Skills: [`programming`] — TypeScript + better-sqlite3 typed patterns

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript strict typing with better-sqlite3
- OMITTED `brainstorming`: SPEC defines table structure
- OMITTED `systematic-debugging`: Greenfield, no bugs

- [ ] **Step 1: Write the failing test**

```typescript
// tests/db/users.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase, closeDatabase } from '../../src/db/connection';
import { initializeSchema } from '../../src/db/schema';
import { insertUser, getUserByDiscordId, deleteUser, getAllUsers, updateLastPollTimestamp } from '../../src/db/users';

describe('users db module', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    initializeSchema(db);
  });

  afterAll(() => {
    closeDatabase();
  });

  it('insertUser adds a user and returns the inserted record', () => {
    const user = insertUser(db, {
      discord_id: '123',
      riot_puuid: 'puuid-123',
      riot_game_name: 'TestPlayer',
      riot_tagline: 'TW1',
    });
    expect(user.discord_id).toBe('123');
    expect(user.riot_puuid).toBe('puuid-123');
    expect(user.registered_at).toBeGreaterThan(0);
    expect(user.last_poll_timestamp).toBe(0);
  });

  it('getUserByDiscordId retrieves a user by discord_id', () => {
    insertUser(db, {
      discord_id: '456',
      riot_puuid: 'puuid-456',
      riot_game_name: 'AnotherPlayer',
      riot_tagline: 'KR1',
    });
    const user = getUserByDiscordId(db, '456');
    expect(user).not.toBeNull();
    expect(user?.riot_game_name).toBe('AnotherPlayer');
  });

  it('getUserByDiscordId returns null for non-existent user', () => {
    const user = getUserByDiscordId(db, 'nonexistent');
    expect(user).toBeNull();
  });

  it('deleteUser removes a user by discord_id', () => {
    insertUser(db, {
      discord_id: '789',
      riot_puuid: 'puuid-789',
      riot_game_name: 'ToDelete',
      riot_tagline: 'EUW',
    });
    deleteUser(db, '789');
    expect(getUserByDiscordId(db, '789')).toBeNull();
  });

  it('getAllUsers returns all registered users', () => {
    insertUser(db, { discord_id: '1', riot_puuid: 'p1', riot_game_name: 'A', riot_tagline: 'T1' });
    insertUser(db, { discord_id: '2', riot_puuid: 'p2', riot_game_name: 'B', riot_tagline: 'T2' });
    const users = getAllUsers(db);
    expect(users).toHaveLength(2);
  });

  it('updateLastPollTimestamp updates the timestamp', () => {
    insertUser(db, { discord_id: '999', riot_puuid: 'p999', riot_game_name: 'C', riot_tagline: 'T3' });
    updateLastPollTimestamp(db, '999', 1700000000);
    const user = getUserByDiscordId(db, '999');
    expect(user?.last_poll_timestamp).toBe(1700000000);
  });

  it('insertUser throws on duplicate discord_id', () => {
    insertUser(db, { discord_id: 'dup', riot_puuid: 'p-dup', riot_game_name: 'D', riot_tagline: 'T4' });
    expect(() => {
      insertUser(db, { discord_id: 'dup', riot_puuid: 'p-dup2', riot_game_name: 'D2', riot_tagline: 'T5' });
    }).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/db/users.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/db/users.ts
import Database from 'better-sqlite3';

export interface User {
  discord_id: string;
  riot_puuid: string;
  riot_game_name: string;
  riot_tagline: string;
  registered_at: number;
  last_poll_timestamp: number;
}

export interface NewUser {
  discord_id: string;
  riot_puuid: string;
  riot_game_name: string;
  riot_tagline: string;
}

export function insertUser(db: Database.Database, user: NewUser): User {
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    INSERT INTO users (discord_id, riot_puuid, riot_game_name, riot_tagline, registered_at, last_poll_timestamp)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(user.discord_id, user.riot_puuid, user.riot_game_name, user.riot_tagline, now);

  return getUserByDiscordId(db, user.discord_id)!;
}

export function getUserByDiscordId(db: Database.Database, discordId: string): User | null {
  return (db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId) as User | undefined) ?? null;
}

export function deleteUser(db: Database.Database, discordId: string): void {
  db.prepare('DELETE FROM users WHERE discord_id = ?').run(discordId);
}

export function getAllUsers(db: Database.Database): User[] {
  return db.prepare('SELECT * FROM users').all() as User[];
}

export function updateLastPollTimestamp(db: Database.Database, discordId: string, timestamp: number): void {
  db.prepare('UPDATE users SET last_poll_timestamp = ? WHERE discord_id = ?').run(timestamp, discordId);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/db/users.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/db/users.ts tests/db/users.test.ts
git commit -m "feat: add user CRUD operations for Discord-Riot account binding"
```

---

### Task 6: DB Matches Module

**Files:**
- Create: `src/db/matches.ts`
- Test: `tests/db/matches.test.ts`

**Interfaces:**
- Consumes: `Database`, `ProcessedMatch` from matchProcessor
- Produces: `Match` type, `insertMatch()` (INSERT OR IGNORE), `getMatchesByUser()`

**Delegation Recommendation:**
- Category: `quick` — straightforward CRUD with dedup logic
- Skills: [`programming`] — TypeScript + better-sqlite3

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript strict typing
- OMITTED `brainstorming`: SPEC defines table + dedup strategy
- OMITTED `systematic-debugging`: Greenfield

- [ ] **Step 1: Write the failing test**

```typescript
// tests/db/matches.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase, closeDatabase } from '../../src/db/connection';
import { initializeSchema } from '../../src/db/schema';
import { insertUser } from '../../src/db/users';
import { insertMatch, getMatchesByUser } from '../../src/db/matches';

describe('matches db module', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    initializeSchema(db);
    insertUser(db, { discord_id: '123', riot_puuid: 'p1', riot_game_name: 'Test', riot_tagline: 'TW1' });
  });

  afterAll(() => {
    closeDatabase();
  });

  it('insertMatch adds a match and returns true for new insert', () => {
    const inserted = insertMatch(db, '123', {
      match_id: 'SEA1_001',
      champion_name: 'Ahri',
      kills: 10,
      deaths: 5,
      assists: 15,
      win: 1,
      penta_kills: 0,
      game_duration_seconds: 1800,
      game_end_timestamp: 1700000000,
      queue_type: 'ranked',
    });
    expect(inserted).toBe(true);
  });

  it('insertMatch returns false for duplicate match_id (INSERT OR IGNORE)', () => {
    insertMatch(db, '123', {
      match_id: 'SEA1_002',
      champion_name: 'Yasuo',
      kills: 3,
      deaths: 12,
      assists: 2,
      win: 0,
      penta_kills: 0,
      game_duration_seconds: 900,
      game_end_timestamp: 1700000100,
      queue_type: 'normal',
    });

    const duplicate = insertMatch(db, '123', {
      match_id: 'SEA1_002',
      champion_name: 'Yasuo',
      kills: 3,
      deaths: 12,
      assists: 2,
      win: 0,
      penta_kills: 0,
      game_duration_seconds: 900,
      game_end_timestamp: 1700000100,
      queue_type: 'normal',
    });
    expect(duplicate).toBe(false);
  });

  it('getMatchesByUser returns matches for a user sorted by end time descending', () => {
    insertMatch(db, '123', {
      match_id: 'SEA1_003',
      champion_name: 'Ahri',
      kills: 5,
      deaths: 3,
      assists: 10,
      win: 1,
      penta_kills: 0,
      game_duration_seconds: 1200,
      game_end_timestamp: 1700000000,
      queue_type: 'ranked',
    });
    insertMatch(db, '123', {
      match_id: 'SEA1_004',
      champion_name: 'Lux',
      kills: 8,
      deaths: 2,
      assists: 12,
      win: 1,
      penta_kills: 1,
      game_duration_seconds: 1500,
      game_end_timestamp: 1700001000,
      queue_type: 'aram',
    });

    const matches = getMatchesByUser(db, '123');
    expect(matches).toHaveLength(2);
    expect(matches[0].game_end_timestamp).toBeGreaterThanOrEqual(matches[1].game_end_timestamp);
  });

  it('getMatchesByUser respects limit parameter', () => {
    for (let i = 0; i < 10; i++) {
      insertMatch(db, '123', {
        match_id: `SEA1_${i}`,
        champion_name: 'Test',
        kills: i,
        deaths: 0,
        assists: 0,
        win: 1,
        penta_kills: 0,
        game_duration_seconds: 600,
        game_end_timestamp: 1700000000 + i,
        queue_type: 'ranked',
      });
    }
    const matches = getMatchesByUser(db, '123', 5);
    expect(matches).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/db/matches.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/db/matches.ts
import Database from 'better-sqlite3';
import { ProcessedMatch } from '../riot/matchProcessor';

export interface Match extends ProcessedMatch {
  id: number;
  user_discord_id: string;
  created_at: number;
}

export function insertMatch(db: Database.Database, discordId: string, data: ProcessedMatch): boolean {
  const now = Math.floor(Date.now() / 1000);
  const result = db.prepare(`
    INSERT OR IGNORE INTO matches (
      match_id, user_discord_id, champion_name, kills, deaths, assists,
      win, penta_kills, game_duration_seconds, game_end_timestamp, queue_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.match_id, discordId, data.champion_name, data.kills, data.deaths, data.assists,
    data.win, data.penta_kills, data.game_duration_seconds, data.game_end_timestamp,
    data.queue_type, now
  );
  return result.changes > 0;
}

export function getMatchesByUser(db: Database.Database, discordId: string, limit?: number): Match[] {
  const sql = limit
    ? 'SELECT * FROM matches WHERE user_discord_id = ? ORDER BY game_end_timestamp DESC LIMIT ?'
    : 'SELECT * FROM matches WHERE user_discord_id = ? ORDER BY game_end_timestamp DESC';
  return limit
    ? db.prepare(sql).all(discordId, limit) as Match[]
    : db.prepare(sql).all(discordId) as Match[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/db/matches.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/db/matches.ts tests/db/matches.test.ts
git commit -m "feat: add match storage with INSERT OR IGNORE dedup and query by user"
```

---

### Task 7: DB Voice Sessions Module

**Files:**
- Create: `src/db/voiceSessions.ts`
- Test: `tests/db/voiceSessions.test.ts`

**Interfaces:**
- Consumes: `Database`, `voice_sessions` table
- Produces: `VoiceSession` type, `insertSession()`, `closeSession()`, `getLeaderboard()`

**Delegation Recommendation:**
- Category: `quick` — CRUD + leaderboard query
- Skills: [`programming`] — TypeScript + SQL aggregation

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript strict typing, SQL aggregation queries
- OMITTED `brainstorming`: SPEC defines table + flow
- OMITTED `systematic-debugging`: Greenfield

- [ ] **Step 1: Write the failing test**

```typescript
// tests/db/voiceSessions.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase, closeDatabase } from '../../src/db/connection';
import { initializeSchema } from '../../src/db/schema';
import { insertSession, closeSession, getLeaderboard } from '../../src/db/voiceSessions';

describe('voiceSessions db module', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    initializeSchema(db);
  });

  afterAll(() => {
    closeDatabase();
  });

  it('insertSession creates a session with left_at NULL and returns id', () => {
    const id = insertSession(db, {
      user_discord_id: '123',
      channel_id: 'chan-1',
      channel_name: 'General',
      joined_at: 1700000000,
    });
    expect(id).toBeGreaterThan(0);
  });

  it('closeSession sets left_at and duration_seconds', () => {
    const id = insertSession(db, {
      user_discord_id: '123',
      channel_id: 'chan-1',
      channel_name: 'General',
      joined_at: 1700000000,
    });
    closeSession(db, id, 1700003600);
    const session = db.prepare('SELECT * FROM voice_sessions WHERE id = ?').get(id) as any;
    expect(session.left_at).toBe(1700003600);
    expect(session.duration_seconds).toBe(3600);
  });

  it('getLeaderboard aggregates duration by user within time range', () => {
    const id1 = insertSession(db, { user_discord_id: 'user-a', channel_id: 'c1', channel_name: 'A', joined_at: 1700000000 });
    closeSession(db, id1, 1700001800);

    const id2 = insertSession(db, { user_discord_id: 'user-b', channel_id: 'c1', channel_name: 'A', joined_at: 1700000000 });
    closeSession(db, id2, 1700000600);

    const id3 = insertSession(db, { user_discord_id: 'user-a', channel_id: 'c2', channel_name: 'B', joined_at: 1700002000 });
    closeSession(db, id3, 1700003000);

    const leaderboard = getLeaderboard(db, 1700000000, 1700004000);
    expect(leaderboard).toHaveLength(2);
    expect(leaderboard[0].user_discord_id).toBe('user-a');
    expect(leaderboard[0].total_seconds).toBe(2800);
    expect(leaderboard[1].user_discord_id).toBe('user-b');
    expect(leaderboard[1].total_seconds).toBe(600);
  });

  it('getLeaderboard excludes sessions outside the time range', () => {
    const id1 = insertSession(db, { user_discord_id: 'user-a', channel_id: 'c1', channel_name: 'A', joined_at: 1699990000 });
    closeSession(db, id1, 1699991000);

    const id2 = insertSession(db, { user_discord_id: 'user-a', channel_id: 'c1', channel_name: 'A', joined_at: 1700002000 });
    closeSession(db, id2, 1700003000);

    const leaderboard = getLeaderboard(db, 1700000000, 1700004000);
    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0].total_seconds).toBe(1000);
  });

  it('getLeaderboard excludes sessions still open (left_at NULL)', () => {
    insertSession(db, { user_discord_id: 'user-a', channel_id: 'c1', channel_name: 'A', joined_at: 1700000000 });
    const leaderboard = getLeaderboard(db, 1700000000, 1700004000);
    expect(leaderboard).toHaveLength(0);
  });

  it('getLeaderboard returns sorted by total_seconds descending', () => {
    const id1 = insertSession(db, { user_discord_id: 'short', channel_id: 'c1', channel_name: 'A', joined_at: 1700000000 });
    closeSession(db, id1, 1700000100);

    const id2 = insertSession(db, { user_discord_id: 'long', channel_id: 'c1', channel_name: 'A', joined_at: 1700000000 });
    closeSession(db, id2, 1700005000);

    const leaderboard = getLeaderboard(db, 1700000000, 1700006000);
    expect(leaderboard[0].user_discord_id).toBe('long');
    expect(leaderboard[1].user_discord_id).toBe('short');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/db/voiceSessions.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/db/voiceSessions.ts
import Database from 'better-sqlite3';

export interface VoiceSession {
  id: number;
  user_discord_id: string;
  channel_id: string;
  channel_name: string;
  joined_at: number;
  left_at: number | null;
  duration_seconds: number;
}

export interface NewVoiceSession {
  user_discord_id: string;
  channel_id: string;
  channel_name: string;
  joined_at: number;
}

export interface VoiceLeaderboardEntry {
  user_discord_id: string;
  total_seconds: number;
  session_count: number;
}

export function insertSession(db: Database.Database, session: NewVoiceSession): number {
  const result = db.prepare(`
    INSERT INTO voice_sessions (user_discord_id, channel_id, channel_name, joined_at, left_at, duration_seconds)
    VALUES (?, ?, ?, ?, NULL, 0)
  `).run(session.user_discord_id, session.channel_id, session.channel_name, session.joined_at);
  return Number(result.lastInsertRowid);
}

export function closeSession(db: Database.Database, sessionId: number, leftAt: number): void {
  const session = db.prepare('SELECT joined_at FROM voice_sessions WHERE id = ?').get(sessionId) as { joined_at: number } | undefined;
  if (!session) {
    throw new Error(`Voice session ${sessionId} not found`);
  }
  const duration = leftAt - session.joined_at;
  db.prepare(`
    UPDATE voice_sessions SET left_at = ?, duration_seconds = ? WHERE id = ?
  `).run(leftAt, duration, sessionId);
}

export function getLeaderboard(db: Database.Database, since: number, until: number): VoiceLeaderboardEntry[] {
  return db.prepare(`
    SELECT
      user_discord_id,
      SUM(duration_seconds) as total_seconds,
      COUNT(*) as session_count
    FROM voice_sessions
    WHERE left_at IS NOT NULL
      AND left_at >= ? AND left_at <= ?
    GROUP BY user_discord_id
    ORDER BY total_seconds DESC
  `).all(since, until) as VoiceLeaderboardEntry[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/db/voiceSessions.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/db/voiceSessions.ts tests/db/voiceSessions.test.ts
git commit -m "feat: add voice session tracking with leaderboard aggregation"
```

---

### Task 8: DB Guild Config Module

**Files:**
- Create: `src/db/guildConfig.ts`
- Test: `tests/db/guildConfig.test.ts`

**Interfaces:**
- Consumes: `Database`, `guild_config` table
- Produces: `getConfig()`, `setConfig()`

**Delegation Recommendation:**
- Category: `quick` — simple key-value store
- Skills: [`programming`] — TypeScript + better-sqlite3

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript strict typing
- OMITTED `brainstorming`: SPEC defines KV structure
- OMITTED `systematic-debugging`: Greenfield

- [ ] **Step 1: Write the failing test**

```typescript
// tests/db/guildConfig.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase, closeDatabase } from '../../src/db/connection';
import { initializeSchema } from '../../src/db/schema';
import { getConfig, setConfig } from '../../src/db/guildConfig';

describe('guildConfig db module', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    initializeSchema(db);
  });

  afterAll(() => {
    closeDatabase();
  });

  it('setConfig inserts a new key-value pair', () => {
    setConfig(db, 'game_result_channel', '123456789');
    expect(getConfig(db, 'game_result_channel')).toBe('123456789');
  });

  it('setConfig updates existing key', () => {
    setConfig(db, 'voice_report_channel', 'chan-1');
    setConfig(db, 'voice_report_channel', 'chan-2');
    expect(getConfig(db, 'voice_report_channel')).toBe('chan-2');
  });

  it('getConfig returns null for non-existent key', () => {
    expect(getConfig(db, 'nonexistent_key')).toBeNull();
  });

  it('setConfig handles poll_interval_minutes', () => {
    setConfig(db, 'poll_interval_minutes', '5');
    expect(getConfig(db, 'poll_interval_minutes')).toBe('5');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/db/guildConfig.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/db/guildConfig.ts
import Database from 'better-sqlite3';

export function getConfig(db: Database.Database, key: string): string | null {
  const row = db.prepare('SELECT value FROM guild_config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setConfig(db: Database.Database, key: string, value: string): void {
  db.prepare(`
    INSERT INTO guild_config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/db/guildConfig.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/db/guildConfig.ts tests/db/guildConfig.test.ts
git commit -m "feat: add guild configuration key-value store"
```

---

### Task 9: Riot API Client

**Files:**
- Create: `src/riot/api.ts`
- No test file (integration with external API; rate limiter can be unit tested but is internal)

**Interfaces:**
- Consumes: `EnvConfig` from `config/env.ts` (RIOT_API_KEY, RIOT_REGION)
- Produces: `RiotApi` class with `getSummonerByRiotId()`, `getMatchIds()`, `getMatch()`

```typescript
class RiotApi {
  constructor(apiKey: string, region: string);
  async getSummonerByRiotId(gameName: string, tagLine: string): Promise<{ puuid: string; gameName: string; tagLine: string }>;
  async getMatchIds(puuid: string, startTime?: number): Promise<string[]>;
  async getMatch(matchId: string): Promise<RiotMatchDto>;
}
```

**Delegation Recommendation:**
- Category: `unspecified-high` — token bucket rate limiter logic + HTTP client + error handling
- Skills: [`programming`] — TypeScript async patterns, axios, rate limiting

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript async/await, axios HTTP, class design
- OMITTED `test-driven-development`: External API integration, no mock test specified in SPEC
- OMITTED `systematic-debugging`: Greenfield
- OMITTED `brainstorming`: SPEC fully defines endpoints + rate limiting

- [ ] **Step 1: Write the implementation**

```typescript
// src/riot/api.ts
import axios, { AxiosInstance } from 'axios';

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
    await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
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
    const response = await this.httpClient.get(
      `/riot/account/v1/accounts/by-riot-id/${encodedName}/${encodedTag}`
    );
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
    const response = await this.httpClient.get(
      `/lol/match/v5/matches/by-puuid/${puuid}/ids`,
      { params }
    );
    return response.data as string[];
  }

  async getMatch(matchId: string): Promise<RiotMatchDto> {
    await this.rateLimiter.acquire();
    const response = await this.httpClient.get(`/lol/match/v5/matches/${matchId}`);
    return response.data as RiotMatchDto;
  }
}
```

Note: Add `import type { RiotMatchDto } from './matchProcessor';` at the top — or define the type inline. Since `RiotMatchDto` is exported from `matchProcessor.ts`, import it:

```typescript
import type { RiotMatchDto } from './matchProcessor';
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/riot/api.ts
git commit -m "feat: add Riot API client with token bucket rate limiter"
```

---

### Task 10: Riot Poller

**Files:**
- Create: `src/riot/poller.ts`
- No test file specified in SPEC (integration orchestration layer)

**Interfaces:**
- Consumes: `Database`, `RiotApi`, `extractMatchData`, `getAllUsers`, `insertMatch`, `updateLastPollTimestamp`
- Produces: `pollAllUsers(db, riotApi, callback)` → Promise<void>

```typescript
type NewMatchCallback = (discordId: string, processedMatch: ProcessedMatch) => void;

async function pollAllUsers(
  db: Database.Database,
  riotApi: RiotApi,
  callback: NewMatchCallback
): Promise<void>;
```

**Delegation Recommendation:**
- Category: `unspecified-high` — async orchestration with error handling per user
- Skills: [`programming`] — TypeScript async patterns, error handling

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript async iteration, error handling, Promise.allSettled
- OMITTED `test-driven-development`: No test specified, integration layer
- OMITTED `systematic-debugging`: Greenfield
- OMITTED `brainstorming`: SPEC §8.3 fully defines the flow

- [ ] **Step 1: Write the implementation**

```typescript
// src/riot/poller.ts
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
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/riot/poller.ts
git commit -m "feat: add game poller that fetches new matches for all registered users"
```

---

### Task 11: Voice Tracker

**Files:**
- Create: `src/voice/tracker.ts`
- Test: `tests/voice/tracker.test.ts`

**Interfaces:**
- Consumes: `Database`, `insertSession`, `closeSession` from voiceSessions
- Produces: `handleVoiceJoin()`, `handleVoiceLeave()`, `handleVoiceSwitch()`

**Delegation Recommendation:**
- Category: `quick` — event delegation to DB layer
- Skills: [`programming`] — TypeScript, discord.js VoiceState types

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript with discord.js types
- OMITTED `brainstorming`: SPEC §8.2 fully defines the flow
- OMITTED `systematic-debugging`: Greenfield

- [ ] **Step 1: Write the failing test**

```typescript
// tests/voice/tracker.test.ts
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase, closeDatabase } from '../../src/db/connection';
import { initializeSchema } from '../../src/db/schema';
import { handleVoiceJoin, handleVoiceLeave, handleVoiceSwitch } from '../../src/voice/tracker';

describe('voice tracker', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    initializeSchema(db);
  });

  afterAll(() => {
    closeDatabase();
  });

  it('handleVoiceJoin inserts a new session', () => {
    const sessionId = handleVoiceJoin(db, 'user-1', 'chan-1', 'General', 1700000000);
    expect(sessionId).toBeGreaterThan(0);
    const session = db.prepare('SELECT * FROM voice_sessions WHERE id = ?').get(sessionId) as any;
    expect(session.user_discord_id).toBe('user-1');
    expect(session.left_at).toBeNull();
  });

  it('handleVoiceLeave closes the open session', () => {
    const sessionId = handleVoiceJoin(db, 'user-1', 'chan-1', 'General', 1700000000);
    handleVoiceLeave(db, 'user-1', 1700003600);
    const session = db.prepare('SELECT * FROM voice_sessions WHERE id = ?').get(sessionId) as any;
    expect(session.left_at).toBe(1700003600);
    expect(session.duration_seconds).toBe(3600);
  });

  it('handleVoiceSwitch closes old session and opens new one', () => {
    const oldSessionId = handleVoiceJoin(db, 'user-1', 'chan-1', 'General', 1700000000);
    const { oldSessionClosed, newSessionId } = handleVoiceSwitch(db, 'user-1', 'chan-1', 'General', 'chan-2', 'Music', 1700001800);

    expect(oldSessionClosed).toBe(true);
    expect(newSessionId).toBeGreaterThan(0);
    expect(newSessionId).not.toBe(oldSessionId);

    const oldSession = db.prepare('SELECT * FROM voice_sessions WHERE id = ?').get(oldSessionId) as any;
    expect(oldSession.left_at).toBe(1700001800);

    const newSession = db.prepare('SELECT * FROM voice_sessions WHERE id = ?').get(newSessionId) as any;
    expect(newSession.channel_id).toBe('chan-2');
    expect(newSession.left_at).toBeNull();
  });

  it('handleVoiceLeave does nothing if no open session exists', () => {
    handleVoiceLeave(db, 'nonexistent-user', 1700000000);
    const sessions = db.prepare('SELECT * FROM voice_sessions WHERE user_discord_id = ?').all('nonexistent-user');
    expect(sessions).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/voice/tracker.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/voice/tracker.ts
import Database from 'better-sqlite3';
import { insertSession, closeSession } from '../db/voiceSessions';

export function handleVoiceJoin(
  db: Database.Database,
  userId: string,
  channelId: string,
  channelName: string,
  joinedAt: number
): number {
  return insertSession(db, {
    user_discord_id: userId,
    channel_id: channelId,
    channel_name: channelName,
    joined_at: joinedAt,
  });
}

export function handleVoiceLeave(
  db: Database.Database,
  userId: string,
  leftAt: number
): void {
  const openSession = db.prepare(
    'SELECT id FROM voice_sessions WHERE user_discord_id = ? AND left_at IS NULL ORDER BY joined_at DESC LIMIT 1'
  ).get(userId) as { id: number } | undefined;

  if (openSession) {
    closeSession(db, openSession.id, leftAt);
  }
}

export function handleVoiceSwitch(
  db: Database.Database,
  userId: string,
  oldChannelId: string,
  oldChannelName: string,
  newChannelId: string,
  newChannelName: string,
  switchAt: number
): { oldSessionClosed: boolean; newSessionId: number } {
  handleVoiceLeave(db, userId, switchAt);
  const newSessionId = handleVoiceJoin(db, userId, newChannelId, newChannelName, switchAt);
  return { oldSessionClosed: true, newSessionId };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/voice/tracker.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/voice/tracker.ts tests/voice/tracker.test.ts
git commit -m "feat: add voice channel join/leave/switch tracking"
```

---

### Task 12: Voice Reporter

**Files:**
- Create: `src/voice/reporter.ts`
- No test file specified in SPEC

**Interfaces:**
- Consumes: `Database`, `getLeaderboard` from voiceSessions, `EmbedBuilder` from discord.js
- Produces: `generateReport()`, `getDayRange()`, `getWeekRange()`

**Delegation Recommendation:**
- Category: `quick` — time range calculation + embed building
- Skills: [`programming`] — TypeScript date handling, discord.js EmbedBuilder

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript, Date manipulation, discord.js embeds
- OMITTED `test-driven-development`: No test specified, embed generation is visual
- OMITTED `brainstorming`: SPEC §8.4 defines the flow
- OMITTED `visual-qa`: Reporter is not a UI page; embed structure is defined by SPEC

- [ ] **Step 1: Write the implementation**

```typescript
// src/voice/reporter.ts
import Database from 'better-sqlite3';
import { EmbedBuilder } from 'discord.js';
import { getLeaderboard, VoiceLeaderboardEntry } from '../db/voiceSessions';

export interface TimeRange {
  since: number;
  until: number;
}

export function getDayRange(date: Date = new Date()): TimeRange {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return {
    since: Math.floor(start.getTime() / 1000),
    until: Math.floor(end.getTime() / 1000),
  };
}

export function getWeekRange(date: Date = new Date()): TimeRange {
  const dayOfWeek = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    since: Math.floor(monday.getTime() / 1000),
    until: Math.floor(sunday.getTime() / 1000),
  };
}

export function generateReport(
  db: Database.Database,
  period: 'daily' | 'weekly',
  entries: VoiceLeaderboardEntry[]
): EmbedBuilder {
  const range = period === 'daily' ? getDayRange() : getWeekRange();
  const periodLabel = period === 'daily' ? '每日' : '每週';
  const startDate = new Date(range.since * 1000).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
  const endDate = new Date(range.until * 1000).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });

  const embed = new EmbedBuilder()
    .setTitle(`🔊 ${periodLabel}語音時數報表`)
    .setColor(period === 'daily' ? 0x0099ff : 0x9933ff)
    .setDescription(`統計區間：${startDate} ~ ${endDate}`)
    .setTimestamp();

  if (entries.length === 0) {
    embed.addFields({ name: '無資料', value: '此區間內無語音活動紀錄' });
    return embed;
  }

  const medalEmojis = ['🥇', '🥈', '🥉'];
  const topEntries = entries.slice(0, 10);

  const fields = topEntries.map((entry, index) => {
    const medal = medalEmojis[index] ?? `${index + 1}.`;
    const hours = Math.floor(entry.total_seconds / 3600);
    const minutes = Math.floor((entry.total_seconds % 3600) / 60);
    const seconds = entry.total_seconds % 60;
    const durationStr = `${hours}h ${minutes}m ${seconds}s`;
    return {
      name: `${medal} <@${entry.user_discord_id}>`,
      value: `總時長：${durationStr} | 場次：${entry.session_count}`,
      inline: false,
    };
  });

  embed.addFields(...fields);
  return embed;
}

export function getVoiceLeaderboard(db: Database.Database, period: 'daily' | 'weekly'): VoiceLeaderboardEntry[] {
  const range = period === 'daily' ? getDayRange() : getWeekRange();
  return getLeaderboard(db, range.since, range.until);
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/voice/reporter.ts
git commit -m "feat: add voice time report generator with daily/weekly ranges"
```

---

### Task 13: Bot Client

**Files:**
- Create: `src/bot/client.ts`
- No test file (Discord.js client initialization)

**Interfaces:**
- Consumes: `GatewayIntentBits` from discord.js
- Produces: `createClient()` → `Client`

**Delegation Recommendation:**
- Category: `quick` — single factory function
- Skills: [`programming`] — TypeScript, discord.js v14

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript, discord.js v14 Client setup
- OMITTED `test-driven-development`: No unit test for client factory
- OMITTED `brainstorming`: SPEC §7.1 defines intents

- [ ] **Step 1: Write the implementation**

```typescript
// src/bot/client.ts
import { Client, GatewayIntentBits, Partials } from 'discord.js';

export function createClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
    ],
    partials: [Partials.Channel],
  });
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/bot/client.ts
git commit -m "feat: add Discord.js client factory with required gateway intents"
```

---

### Task 14: Bot Message Builders

**Files:**
- Create: `src/bot/messages/gameResult.ts`
- Create: `src/bot/messages/profile.ts`
- Create: `src/bot/messages/voiceReport.ts`
- No test files (visual embed builders)

**Interfaces:**
- Consumes: `ProcessedMatch`, `Match`, `VoiceLeaderboardEntry`, `EmbedBuilder`
- Produces: `buildGameResultEmbed()`, `buildProfileEmbed()`, `buildVoiceReportEmbed()`

**Delegation Recommendation:**
- Category: `visual-engineering` — embed design, layout, color choices
- Skills: [`programming`, `frontend`] — TypeScript + visual layout for Discord embeds

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript strict typing
- INCLUDED `frontend`: Embed design — colors, field layout, visual hierarchy
- OMITTED `visual-qa`: Not a web page; Discord embeds are structured data, not HTML/CSS
- OMITTED `test-driven-development`: Embed builders are visual, tested via integration
- OMITTED `brainstorming`: SPEC defines what each embed should show

- [ ] **Step 1: Write `src/bot/messages/gameResult.ts`**

```typescript
// src/bot/messages/gameResult.ts
import { EmbedBuilder } from 'discord.js';
import { ProcessedMatch } from '../../riot/matchProcessor';

export function buildGameResultEmbed(discordId: string, match: ProcessedMatch): EmbedBuilder {
  const result = match.win === 1 ? '勝利' : '敗北';
  const color = match.win === 1 ? 0x00ff00 : 0xff0000;
  const kda = ((match.kills + match.assists) / Math.max(match.deaths, 1)).toFixed(2);
  const durationMin = Math.floor(match.game_duration_seconds / 60);
  const durationSec = match.game_duration_seconds % 60;

  const embed = new EmbedBuilder()
    .setTitle(`🎮 ${match.champion_name} - ${result}`)
    .setColor(color)
    .setAuthor({ name: `<@${discordId}> 的最新對戰` })
    .addFields(
      { name: 'KDA', value: `${match.kills} / ${match.deaths} / ${match.assists} (${kda})`, inline: true },
      { name: '模式', value: match.queue_type, inline: true },
      { name: '時長', value: `${durationMin}m ${durationSec}s`, inline: true },
    )
    .setTimestamp(match.game_end_timestamp * 1000);

  if (match.penta_kills > 0) {
    embed.addFields({ name: '🏆 Penta Kill!', value: `${match.penta_kills} 次`, inline: true });
  }

  return embed;
}
```

- [ ] **Step 2: Write `src/bot/messages/profile.ts`**

```typescript
// src/bot/messages/profile.ts
import { EmbedBuilder } from 'discord.js';
import { Match } from '../../db/matches';
import { User } from '../../db/users';

export function buildProfileEmbed(user: User, matches: Match[]): EmbedBuilder {
  const totalGames = matches.length;
  const wins = matches.filter((m) => m.win === 1).length;
  const losses = totalGames - wins;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';
  const totalKills = matches.reduce((sum, m) => sum + m.kills, 0);
  const totalDeaths = matches.reduce((sum, m) => sum + m.deaths, 0);
  const totalAssists = matches.reduce((sum, m) => sum + m.assists, 0);
  const avgKda = totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : '∞';
  const totalPentas = matches.reduce((sum, m) => sum + m.penta_kills, 0);

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${user.riot_game_name}#${user.riot_tagline}`)
    .setColor(0x0099ff)
    .setAuthor({ name: `<@${user.discord_id}> 的遊戲數據` })
    .addFields(
      { name: '總場次', value: `${totalGames}`, inline: true },
      { name: '勝/負', value: `${wins} / ${losses}`, inline: true },
      { name: '勝率', value: `${winRate}%`, inline: true },
      { name: '平均 KDA', value: avgKda, inline: true },
      { name: 'Penta Kill', value: `${totalPentas}`, inline: true },
    );

  const recentMatches = matches.slice(0, 5);
  if (recentMatches.length > 0) {
    const recentText = recentMatches
      .map((m) => {
        const result = m.win === 1 ? '✅' : '❌';
        const kda = `${m.kills}/${m.deaths}/${m.assists}`;
        return `${result} ${m.champion_name} (${kda}) - ${m.queue_type}`;
      })
      .join('\n');
    embed.addFields({ name: '最近五場', value: recentText, inline: false });
  }

  embed.setTimestamp();
  return embed;
}
```

- [ ] **Step 3: Write `src/bot/messages/voiceReport.ts`**

```typescript
// src/bot/messages/voiceReport.ts
import { EmbedBuilder } from 'discord.js';
import { VoiceLeaderboardEntry } from '../../db/voiceSessions';

export function buildVoiceReportEmbed(
  period: 'daily' | 'weekly',
  entries: VoiceLeaderboardEntry[],
  startDate: Date,
  endDate: Date
): EmbedBuilder {
  const periodLabel = period === 'daily' ? '每日' : '每週';
  const startDateStr = startDate.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
  const endDateStr = endDate.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });

  const embed = new EmbedBuilder()
    .setTitle(`🔊 ${periodLabel}語音時數報表`)
    .setColor(period === 'daily' ? 0x0099ff : 0x9933ff)
    .setDescription(`統計區間：${startDateStr} ~ ${endDateStr}`)
    .setTimestamp();

  if (entries.length === 0) {
    embed.addFields({ name: '無資料', value: '此區間內無語音活動紀錄' });
    return embed;
  }

  const medalEmojis = ['🥇', '🥈', '🥉'];
  const topEntries = entries.slice(0, 10);

  const fields = topEntries.map((entry, index) => {
    const medal = medalEmojis[index] ?? `${index + 1}.`;
    const hours = Math.floor(entry.total_seconds / 3600);
    const minutes = Math.floor((entry.total_seconds % 3600) / 60);
    const seconds = entry.total_seconds % 60;
    const durationStr = `${hours}h ${minutes}m ${seconds}s`;
    return {
      name: `${medal} <@${entry.user_discord_id}>`,
      value: `總時長：${durationStr} | 場次：${entry.session_count}`,
      inline: false,
    };
  });

  embed.addFields(...fields);
  return embed;
}
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/bot/messages/gameResult.ts src/bot/messages/profile.ts src/bot/messages/voiceReport.ts
git commit -m "feat: add Discord embed builders for game results, profiles, and voice reports"
```

---

### Task 15: Bot Slash Commands

**Files:**
- Create: `src/bot/commands/index.ts`
- Create: `src/bot/commands/register.ts`
- Create: `src/bot/commands/unregister.ts`
- Create: `src/bot/commands/profile.ts`
- Create: `src/bot/commands/leaderboard.ts`
- Create: `src/bot/commands/voice-report.ts`
- Create: `src/bot/commands/config.ts`
- Create: `src/bot/commands/help.ts`
- No test files (Discord integration commands)

**Interfaces:**
- Consumes: All DB modules, RiotApi, voice tracker/reporter, message builders, `SlashCommandBuilder`
- Produces: `commandDefinitions` array (for registration), command handler functions

**Delegation Recommendation:**
- Category: `unspecified-high` — 8 files with Discord.js interaction handling, DB queries, and Riot API calls
- Skills: [`programming`] — TypeScript, discord.js v14 patterns, async handlers

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript strict typing, discord.js v14, async command handlers
- OMITTED `test-driven-development`: Discord commands are integration-tested, not unit-tested
- OMITTED `brainstorming`: SPEC §5 defines all 7 commands + options
- OMITTED `visual-qa`: Commands produce embeds (already built in Task 14)
- OMITTED `frontend`: Not a web UI

- [ ] **Step 1: Write `src/bot/commands/index.ts`**

```typescript
// src/bot/commands/index.ts
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export const commandDefinitions = [
  new SlashCommandBuilder()
    .setName('register')
    .setDescription('綁定你的 Riot 帳號')
    .addStringOption((opt) => opt.setName('game_name').setDescription('Riot ID 名稱').setRequired(true))
    .addStringOption((opt) => opt.setName('tagline').setDescription('Riot ID 標籤 (例如 TW1)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('unregister')
    .setDescription('解除你的 Riot 帳號綁定'),

  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('查詢遊戲數據')
    .addUserOption((opt) => opt.setName('user').setDescription('查詢其他使用者 (留空查詢自己)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('排行榜')
    .addStringOption((opt) =>
      opt.setName('type').setDescription('排行榜類型').setRequired(true).addChoices(
        { name: 'KDA', value: 'kda' },
        { name: '勝場', value: 'wins' },
        { name: 'Penta Kill', value: 'penta' },
        { name: '語音時數', value: 'voice' },
      )
    ),

  new SlashCommandBuilder()
    .setName('voice-report')
    .setDescription('查詢語音頻道時數報表')
    .addStringOption((opt) =>
      opt.setName('period').setDescription('報表區間').setRequired(true).addChoices(
        { name: '每日', value: 'daily' },
        { name: '每週', value: 'weekly' },
      )
    ),

  new SlashCommandBuilder()
    .setName('config')
    .setDescription('伺服器設定')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('set-channel').setDescription('設定通知頻道')
        .addStringOption((opt) =>
          opt.setName('type').setDescription('頻道類型').setRequired(true).addChoices(
            { name: '遊戲結果通知', value: 'game_result_channel' },
            { name: '語音報表通知', value: 'voice_report_channel' },
          )
        )
        .addChannelOption((opt) => opt.setName('channel').setDescription('目標頻道').setRequired(true))
    ),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('顯示所有可用指令'),
];
```

- [ ] **Step 2: Write `src/bot/commands/register.ts`**

```typescript
// src/bot/commands/register.ts
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import Database from 'better-sqlite3';
import { RiotApi } from '../../riot/api';
import { insertUser, getUserByDiscordId } from '../../db/users';

export async function handleRegister(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
  riotApi: RiotApi
): Promise<void> {
  const gameName = interaction.options.getString('game_name', true);
  const tagline = interaction.options.getString('tagline', true);
  const discordId = interaction.user.id;

  const existing = getUserByDiscordId(db, discordId);
  if (existing) {
    await interaction.reply({
      content: '你已經綁定了 Riot 帳號。請先使用 `/unregister` 解除綁定。',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const account = await riotApi.getSummonerByRiotId(gameName, tagline);
    insertUser(db, {
      discord_id: discordId,
      riot_puuid: account.puuid,
      riot_game_name: account.gameName,
      riot_tagline: account.tagLine,
    });

    const embed = new EmbedBuilder()
      .setTitle('✅ 註冊成功')
      .setColor(0x00ff00)
      .addFields(
        { name: 'Riot ID', value: `${account.gameName}#${account.tagLine}`, inline: true },
        { name: 'PUUID', value: account.puuid.slice(0, 8) + '...', inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({
      content: `查詢 Riot 帳號失敗：${gameName}#${tagline}。請確認名稱與標籤是否正確。`,
    });
  }
}
```

- [ ] **Step 3: Write `src/bot/commands/unregister.ts`**

```typescript
// src/bot/commands/unregister.ts
import { ChatInputCommandInteraction } from 'discord.js';
import Database from 'better-sqlite3';
import { deleteUser, getUserByDiscordId } from '../../db/users';

export async function handleUnregister(
  interaction: ChatInputCommandInteraction,
  db: Database.Database
): Promise<void> {
  const discordId = interaction.user.id;
  const existing = getUserByDiscordId(db, discordId);

  if (!existing) {
    await interaction.reply({
      content: '你尚未綁定 Riot 帳號。',
      ephemeral: true,
    });
    return;
  }

  deleteUser(db, discordId);
  await interaction.reply({
    content: `已解除綁定：${existing.riot_game_name}#${existing.riot_tagline}`,
    ephemeral: true,
  });
}
```

- [ ] **Step 4: Write `src/bot/commands/profile.ts`**

```typescript
// src/bot/commands/profile.ts
import { ChatInputCommandInteraction, User } from 'discord.js';
import Database from 'better-sqlite3';
import { getUserByDiscordId } from '../../db/users';
import { getMatchesByUser } from '../../db/matches';
import { buildProfileEmbed } from '../messages/profile';

export async function handleProfile(
  interaction: ChatInputCommandInteraction,
  db: Database.Database
): Promise<void> {
  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const discordId = targetUser.id;

  const user = getUserByDiscordId(db, discordId);
  if (!user) {
    await interaction.reply({
      content: `<@${discordId}> 尚未綁定 Riot 帳號。請使用 \`/register\` 綁定。`,
      ephemeral: true,
    });
    return;
  }

  const matches = getMatchesByUser(db, discordId);
  if (matches.length === 0) {
    await interaction.reply({
      content: `<@${discordId}> 目前沒有遊戲紀錄。請稍後再查詢。`,
      ephemeral: true,
    });
    return;
  }

  const embed = buildProfileEmbed(user, matches);
  await interaction.reply({ embeds: [embed] });
}
```

- [ ] **Step 5: Write `src/bot/commands/leaderboard.ts`**

```typescript
// src/bot/commands/leaderboard.ts
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import Database from 'better-sqlite3';
import { getAllUsers } from '../../db/users';
import { getMatchesByUser } from '../../db/matches';
import { getLeaderboard } from '../../db/voiceSessions';
import { getDayRange, getWeekRange } from '../../voice/reporter';

export async function handleLeaderboard(
  interaction: ChatInputCommandInteraction,
  db: Database.Database
): Promise<void> {
  const type = interaction.options.getString('type', true);
  const users = getAllUsers(db);

  const embed = new EmbedBuilder().setColor(0xffd700).setTimestamp();

  if (type === 'voice') {
    const range = getWeekRange();
    const entries = getLeaderboard(db, range.since, range.until);
    embed.setTitle('🏆 語音時數排行榜（本週）');

    if (entries.length === 0) {
      embed.setDescription('本週無語音活動紀錄');
    } else {
      const fields = entries.slice(0, 10).map((entry, i) => {
        const hours = Math.floor(entry.total_seconds / 3600);
        const minutes = Math.floor((entry.total_seconds % 3600) / 60);
        return {
          name: `${i + 1}. <@${entry.user_discord_id}>`,
          value: `${hours}h ${minutes}m | ${entry.session_count} 場`,
          inline: false,
        };
      });
      embed.addFields(...fields);
    }
  } else {
    const userStats = users.map((user) => {
      const matches = getMatchesByUser(db, user.discord_id);
      const totalKills = matches.reduce((s, m) => s + m.kills, 0);
      const totalDeaths = matches.reduce((s, m) => s + m.deaths, 0);
      const totalAssists = matches.reduce((s, m) => s + m.assists, 0);
      const kda = totalDeaths > 0 ? (totalKills + totalAssists) / totalDeaths : Infinity;
      const wins = matches.filter((m) => m.win === 1).length;
      const pentas = matches.reduce((s, m) => s + m.penta_kills, 0);
      return { discord_id: user.discord_id, kda, wins, pentas, totalGames: matches.length };
    });

    if (type === 'kda') {
      embed.setTitle('🏆 KDA 排行榜');
      userStats.sort((a, b) => b.kda - a.kda);
      const fields = userStats.slice(0, 10).map((s, i) => ({
        name: `${i + 1}. <@${s.discord_id}>`,
        value: `KDA: ${s.kda === Infinity ? '∞' : s.kda.toFixed(2)} (${s.totalGames} 場)`,
        inline: false,
      }));
      if (fields.length > 0) embed.addFields(...fields);
      else embed.setDescription('尚無遊戲紀錄');
    } else if (type === 'wins') {
      embed.setTitle('🏆 勝場排行榜');
      userStats.sort((a, b) => b.wins - a.wins);
      const fields = userStats.slice(0, 10).map((s, i) => ({
        name: `${i + 1}. <@${s.discord_id}>`,
        value: `${s.wins} 勝 (${s.totalGames} 場)`,
        inline: false,
      }));
      if (fields.length > 0) embed.addFields(...fields);
      else embed.setDescription('尚無遊戲紀錄');
    } else if (type === 'penta') {
      embed.setTitle('🏆 Penta Kill 排行榜');
      userStats.sort((a, b) => b.pentas - a.pentas);
      const fields = userStats.slice(0, 10).map((s, i) => ({
        name: `${i + 1}. <@${s.discord_id}>`,
        value: `${s.pentas} 次 Penta Kill (${s.totalGames} 場)`,
        inline: false,
      }));
      if (fields.length > 0) embed.addFields(...fields);
      else embed.setDescription('尚無遊戲紀錄');
    }
  }

  await interaction.reply({ embeds: [embed] });
}
```

- [ ] **Step 6: Write `src/bot/commands/voice-report.ts`**

```typescript
// src/bot/commands/voice-report.ts
import { ChatInputCommandInteraction } from 'discord.js';
import Database from 'better-sqlite3';
import { getLeaderboard } from '../../db/voiceSessions';
import { getDayRange, getWeekRange } from '../../voice/reporter';
import { buildVoiceReportEmbed } from '../messages/voiceReport';

export async function handleVoiceReport(
  interaction: ChatInputCommandInteraction,
  db: Database.Database
): Promise<void> {
  const period = interaction.options.getString('period', true) as 'daily' | 'weekly';
  const range = period === 'daily' ? getDayRange() : getWeekRange();
  const entries = getLeaderboard(db, range.since, range.until);

  const startDate = new Date(range.since * 1000);
  const endDate = new Date(range.until * 1000);
  const embed = buildVoiceReportEmbed(period, entries, startDate, endDate);

  await interaction.reply({ embeds: [embed] });
}
```

- [ ] **Step 7: Write `src/bot/commands/config.ts`**

```typescript
// src/bot/commands/config.ts
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import Database from 'better-sqlite3';
import { getConfig, setConfig } from '../../db/guildConfig';

export async function handleConfig(
  interaction: ChatInputCommandInteraction,
  db: Database.Database
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'set-channel') {
    const type = interaction.options.getString('type', true);
    const channel = interaction.options.getChannel('channel', true);

    setConfig(db, type, channel.id);

    const embed = new EmbedBuilder()
      .setTitle('✅ 設定已更新')
      .setColor(0x00ff00)
      .addFields(
        { name: '設定項目', value: type, inline: true },
        { name: '頻道', value: `<#${channel.id}>`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
```

- [ ] **Step 8: Write `src/bot/commands/help.ts`**

```typescript
// src/bot/commands/help.ts
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export async function handleHelp(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('📖 LOL-League 指令列表')
    .setColor(0x0099ff)
    .addFields(
      { name: '/register', value: '綁定你的 Riot 帳號\n選項：`game_name` (必填), `tagline` (必填)', inline: false },
      { name: '/unregister', value: '解除你的 Riot 帳號綁定', inline: false },
      { name: '/profile', value: '查詢遊戲數據（總場次、勝率、KDA、Penta、最近五場）\n選項：`user` (可選)', inline: false },
      { name: '/leaderboard', value: '排行榜\n選項：`type` — kda / wins / penta / voice', inline: false },
      { name: '/voice-report', value: '查詢語音頻道時數報表\n選項：`period` — daily / weekly', inline: false },
      { name: '/config set-channel', value: '設定通知頻道 (需管理伺服器權限)\n選項：`type` — game_result / voice_report, `channel`', inline: false },
      { name: '/help', value: '顯示此說明訊息', inline: false },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
```

- [ ] **Step 9: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add src/bot/commands/
git commit -m "feat: add all 7 slash command handlers with embed responses"
```

---

### Task 16: Bot Event Handlers

**Files:**
- Create: `src/bot/events/ready.ts`
- Create: `src/bot/events/voiceStateUpdate.ts`
- Create: `src/bot/events/interactionCreate.ts`
- No test files (Discord event integration)

**Interfaces:**
- Consumes: `Client`, command definitions, voice tracker, DB modules, `REST` + `Routes` from discord.js
- Produces: `onReady()`, `handleVoiceStateUpdate()`, `handleInteractionCreate()`

**Delegation Recommendation:**
- Category: `unspecified-high` — event wiring, command registration via REST API, interaction routing
- Skills: [`programming`] — TypeScript, discord.js v14 REST + event patterns

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript async, discord.js v14 REST API, event routing
- OMITTED `test-driven-development`: Event handlers are integration-tested
- OMITTED `brainstorming`: SPEC §3.1 defines startup flow
- OMITTED `systematic-debugging`: Greenfield

- [ ] **Step 1: Write `src/bot/events/ready.ts`**

```typescript
// src/bot/events/ready.ts
import { Client, REST, Routes } from 'discord.js';
import Database from 'better-sqlite3';
import { commandDefinitions } from '../commands/index';
import { EnvConfig } from '../../config/env';

export async function onReady(
  client: Client,
  db: Database.Database,
  config: EnvConfig
): Promise<void> {
  console.log(`Bot logged in as ${client.user?.tag}`);

  const rest = new REST({ version: '10' }).setToken(config.DISCORD_BOT_TOKEN);
  const commandsJson = commandDefinitions.map((cmd) => cmd.toJSON());

  try {
    await rest.put(
      Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.DISCORD_GUILD_ID),
      { body: commandsJson }
    );
    console.log(`Registered ${commandsJson.length} slash commands`);
  } catch (err) {
    console.error('Failed to register slash commands:', err);
  }

  const staleSessions = db.prepare(
    'UPDATE voice_sessions SET left_at = joined_at, duration_seconds = 0 WHERE left_at IS NULL'
  ).run();
  if (staleSessions.changes > 0) {
    console.log(`Closed ${staleSessions.changes} stale voice sessions`);
  }

  console.log('Bot is ready');
}
```

- [ ] **Step 2: Write `src/bot/events/voiceStateUpdate.ts`**

```typescript
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
```

- [ ] **Step 3: Write `src/bot/events/interactionCreate.ts`**

```typescript
// src/bot/events/interactionCreate.ts
import { Interaction, ChatInputCommandInteraction } from 'discord.js';
import Database from 'better-sqlite3';
import { RiotApi } from '../../riot/api';
import { handleRegister } from '../commands/register';
import { handleUnregister } from '../commands/unregister';
import { handleProfile } from '../commands/profile';
import { handleLeaderboard } from '../commands/leaderboard';
import { handleVoiceReport } from '../commands/voice-report';
import { handleConfig } from '../commands/config';
import { handleHelp } from '../commands/help';

export async function handleInteractionCreate(
  interaction: Interaction,
  db: Database.Database,
  riotApi: RiotApi
): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;

  switch (commandName) {
    case 'register':
      await handleRegister(interaction, db, riotApi);
      break;
    case 'unregister':
      await handleUnregister(interaction, db);
      break;
    case 'profile':
      await handleProfile(interaction, db);
      break;
    case 'leaderboard':
      await handleLeaderboard(interaction, db);
      break;
    case 'voice-report':
      await handleVoiceReport(interaction, db);
      break;
    case 'config':
      await handleConfig(interaction, db);
      break;
    case 'help':
      await handleHelp(interaction);
      break;
    default:
      await interaction.reply({ content: '未知指令', ephemeral: true });
  }
}
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/bot/events/
git commit -m "feat: add Discord event handlers for ready, voiceStateUpdate, and interactionCreate"
```

---

### Task 17: Main Entry Point

**Files:**
- Create: `src/index.ts`
- No test file (application entry point, integration tested by running)

**Interfaces:**
- Consumes: All modules — env, db, riot, voice, bot
- Produces: `main()` function, application startup

**Delegation Recommendation:**
- Category: `unspecified-high` — orchestrates all layers, cron setup, error handling
- Skills: [`programming`] — TypeScript, node-cron, async orchestration

**Skills Evaluation:**
- INCLUDED `programming`: TypeScript async, node-cron scheduling, error handling
- OMITTED `test-driven-development`: Entry point is integration-tested by running
- OMITTED `brainstorming`: SPEC §3.1 fully defines startup flow
- OMITTED `systematic-debugging`: Greenfield
- OMITTED `verification-before-completion`: Will be used at final verification, not in task

- [ ] **Step 1: Write the implementation**

```typescript
// src/index.ts
import cron from 'node-cron';
import { loadConfig } from './config/env';
import { createDatabase, closeDatabase } from './db/connection';
import { initializeSchema } from './db/schema';
import { createClient } from './bot/client';
import { onReady } from './bot/events/ready';
import { handleVoiceStateUpdate } from './bot/events/voiceStateUpdate';
import { handleInteractionCreate } from './bot/events/interactionCreate';
import { RiotApi } from './riot/api';
import { pollAllUsers } from './riot/poller';
import { getDayRange, getWeekRange } from './voice/reporter';
import { getLeaderboard } from './db/voiceSessions';
import { buildVoiceReportEmbed } from './bot/messages/voiceReport';
import { getConfig } from './db/guildConfig';
import { Client, TextChannel } from 'discord.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const db = createDatabase();
  initializeSchema(db);

  const riotApi = new RiotApi(config.RIOT_API_KEY, config.RIOT_REGION);
  const client = createClient();

  client.on('ready', async () => {
    await onReady(client, db, config);
  });

  client.on('voiceStateUpdate', (oldState, newState) => {
    handleVoiceStateUpdate(oldState, newState, db);
  });

  client.on('interactionCreate', async (interaction) => {
    await handleInteractionCreate(interaction, db, riotApi);
  });

  const pollIntervalStr = getConfig(db, 'poll_interval_minutes') ?? '3';
  const pollInterval = parseInt(pollIntervalStr, 10);
  const cronExpr = `*/${pollInterval} * * * *`;

  cron.schedule(cronExpr, async () => {
    console.log('Running game poll...');
    try {
      await pollAllUsers(db, riotApi, (discordId, processedMatch) => {
        const gameResultChannelId = getConfig(db, 'game_result_channel');
        if (gameResultChannelId) {
          const channel = client.channels.cache.get(gameResultChannelId) as TextChannel | undefined;
          if (channel) {
            const { buildGameResultEmbed } = require('./bot/messages/gameResult');
            const embed = buildGameResultEmbed(discordId, processedMatch);
            channel.send({ embeds: [embed] }).catch(console.error);
          }
        }
      });
      console.log('Game poll complete');
    } catch (err) {
      console.error('Game poll failed:', err);
    }
  });

  cron.schedule('59 23 * * *', async () => {
    console.log('Sending daily voice report...');
    const range = getDayRange();
    const entries = getLeaderboard(db, range.since, range.until);
    const voiceReportChannelId = getConfig(db, 'voice_report_channel');
    if (voiceReportChannelId) {
      const channel = client.channels.cache.get(voiceReportChannelId) as TextChannel | undefined;
      if (channel) {
        const embed = buildVoiceReportEmbed('daily', entries, new Date(range.since * 1000), new Date(range.until * 1000));
        await channel.send({ embeds: [embed] });
      }
    }
  });

  cron.schedule('59 23 * * 0', async () => {
    console.log('Sending weekly voice report...');
    const range = getWeekRange();
    const entries = getLeaderboard(db, range.since, range.until);
    const voiceReportChannelId = getConfig(db, 'voice_report_channel');
    if (voiceReportChannelId) {
      const channel = client.channels.cache.get(voiceReportChannelId) as TextChannel | undefined;
      if (channel) {
        const embed = buildVoiceReportEmbed('weekly', entries, new Date(range.since * 1000), new Date(range.until * 1000));
        await channel.send({ embeds: [embed] });
      }
    }
  });

  process.on('SIGINT', () => {
    console.log('Shutting down...');
    closeDatabase();
    client.destroy();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    closeDatabase();
    client.destroy();
    process.exit(0);
  });

  await client.login(config.DISCORD_BOT_TOKEN);
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
```

Note: The `require('./bot/messages/gameResult')` in the poller callback should be replaced with a proper import at the top of the file. Let me fix that:

Add to imports:
```typescript
import { buildGameResultEmbed } from './bot/messages/gameResult';
```

And change the callback to:
```typescript
const embed = buildGameResultEmbed(discordId, processedMatch);
```

- [ ] **Step 2: Fix the import (replace require with proper import)**

Add `import { buildGameResultEmbed } from './bot/messages/gameResult';` to the top of `src/index.ts` and remove the inline `require` call.

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: `dist/` directory created with compiled JS, no errors

- [ ] **Step 5: Run all tests**

Run: `npm run test`
Expected: All test suites PASS

- [ ] **Step 6: Commit**

```bash
git add src/index.ts
git commit -m "feat: add main entry point with cron scheduling and graceful shutdown"
```

---

## Commit Strategy

All commits follow conventional commits format (`feat:`, `chore:`, `test:`). Each task produces one atomic commit containing both implementation and test files together.

**Commit sequence:**

| # | Commit Message | Files |
|---|---------------|-------|
| 1 | `chore: scaffold project structure with TypeScript, Vitest, and dependencies` | package.json, tsconfig.json, vitest.config.ts, .gitignore, .env.example |
| 2 | `feat: add environment configuration with Zod validation` | src/config/env.ts, tests/config/env.test.ts |
| 3 | `feat: add SQLite database connection and schema initialization` | src/db/connection.ts, src/db/schema.ts, tests/db/schema.test.ts |
| 4 | `feat: add match data extraction and queue type mapping` | src/riot/matchProcessor.ts, tests/riot/matchProcessor.test.ts |
| 5 | `feat: add user CRUD operations for Discord-Riot account binding` | src/db/users.ts, tests/db/users.test.ts |
| 6 | `feat: add match storage with INSERT OR IGNORE dedup and query by user` | src/db/matches.ts, tests/db/matches.test.ts |
| 7 | `feat: add voice session tracking with leaderboard aggregation` | src/db/voiceSessions.ts, tests/db/voiceSessions.test.ts |
| 8 | `feat: add guild configuration key-value store` | src/db/guildConfig.ts, tests/db/guildConfig.test.ts |
| 9 | `feat: add Riot API client with token bucket rate limiter` | src/riot/api.ts |
| 10 | `feat: add game poller that fetches new matches for all registered users` | src/riot/poller.ts |
| 11 | `feat: add voice channel join/leave/switch tracking` | src/voice/tracker.ts, tests/voice/tracker.test.ts |
| 12 | `feat: add voice time report generator with daily/weekly ranges` | src/voice/reporter.ts |
| 13 | `feat: add Discord.js client factory with required gateway intents` | src/bot/client.ts |
| 14 | `feat: add Discord embed builders for game results, profiles, and voice reports` | src/bot/messages/*.ts |
| 15 | `feat: add all 7 slash command handlers with embed responses` | src/bot/commands/*.ts |
| 16 | `feat: add Discord event handlers for ready, voiceStateUpdate, and interactionCreate` | src/bot/events/*.ts |
| 17 | `feat: add main entry point with cron scheduling and graceful shutdown` | src/index.ts |

**Rules:**
- Each commit includes only the files from that task (no cross-task contamination)
- Tests and implementation are committed together
- Never commit `.env` (it's gitignored)
- Never commit `node_modules/` or `dist/` (gitignored)
- Run `npx tsc --noEmit` before every commit to ensure type safety

---

## Success Criteria

1. **All tests pass:** `npm run test` → 0 failures
2. **TypeScript compiles:** `npx tsc --noEmit` → 0 errors
3. **Build succeeds:** `npm run build` → `dist/` created with compiled JS
4. **Bot starts:** `npm run dev` → connects to Discord, logs "Bot is ready"
5. **Slash commands registered:** `/register`, `/unregister`, `/profile`, `/leaderboard`, `/voice-report`, `/config`, `/help` appear in Discord guild
6. **Registration works:** `/register <name> <tag>` → fetches PUUID from Riot API, stores in DB, replies with success embed
7. **Game polling works:** Cron triggers → fetches new matches → sends game result embed to configured channel
8. **Voice tracking works:** Join/leave/switch voice channels → sessions recorded in DB → `/voice-report` shows time
9. **Leaderboard works:** `/leaderboard type:kda` → shows KDA rankings across all registered users
10. **Config works:** `/config set-channel type:game_result channel:#general` → stores channel ID in guild_config

### SPEC §10 Gap Resolution

| Gap | Resolution |
|-----|-----------|
| `src/riot/poller.ts` not implemented | Task 10 creates it with full `pollAllUsers()` implementation |
| `src/riot/summoner.ts` not implemented | Merged into `api.ts` as `getSummonerByRiotId()` (Task 9) |
| `/register` handler not implemented | Task 15 creates full handler with Riot API lookup + DB insert |
| `src/voice/reporter.ts` timezone | Task 12 uses `Asia/Taipei` timezone in date formatting |

---

## TODO List (ADD THESE)

> CALLER: Add these TODOs using TodoWrite/TaskCreate and execute by wave.

### Wave 1 (Start Immediately - No Dependencies)

- [ ] **1. Project Scaffolding**
  - What: Create package.json, tsconfig.json, vitest.config.ts, .gitignore, .env.example + all directories. Run `npm install`.
  - Depends: None
  - Blocks: Tasks 2, 3, 4
  - Category: `quick`
  - Skills: [`programming`]
  - QA: `npx tsc --noEmit` passes with no errors

### Wave 2 (After Wave 1 Completes)

- [ ] **2. Config (env.ts)**
  - What: Create `src/config/env.ts` with Zod schema + `loadConfig()`. Write `tests/config/env.test.ts` with 3 tests (valid config, defaults, missing required). TDD: test → fail → implement → pass → commit.
  - Depends: 1
  - Blocks: Tasks 9, 13
  - Category: `quick`
  - Skills: [`programming`]
  - QA: `npx vitest run tests/config/env.test.ts` → 3 tests pass

- [ ] **3. DB Connection + Schema**
  - What: Create `src/db/connection.ts` (createDatabase with WAL + FK ON) and `src/db/schema.ts` (initializeSchema with 4 tables + indexes). Write `tests/db/schema.test.ts` with 8 tests. TDD: test → fail → implement → pass → commit.
  - Depends: 1
  - Blocks: Tasks 5, 6, 7, 8
  - Category: `quick`
  - Skills: [`programming`]
  - QA: `npx vitest run tests/db/schema.test.ts` → 8 tests pass

- [ ] **4. Riot MatchProcessor**
  - What: Create `src/riot/matchProcessor.ts` with `extractMatchData()` and `mapQueueType()`. Write `tests/riot/matchProcessor.test.ts` with 9 tests. TDD: test → fail → implement → pass → commit.
  - Depends: 1
  - Blocks: Task 10
  - Category: `quick`
  - Skills: [`programming`]
  - QA: `npx vitest run tests/riot/matchProcessor.test.ts` → 9 tests pass

### Wave 3 (After Wave 2 Completes)

- [ ] **5. DB Users**
  - What: Create `src/db/users.ts` with insertUser, getUserByDiscordId, deleteUser, getAllUsers, updateLastPollTimestamp. Write `tests/db/users.test.ts` with 7 tests. TDD.
  - Depends: 3
  - Blocks: Tasks 10, 15
  - Category: `quick`
  - Skills: [`programming`]
  - QA: `npx vitest run tests/db/users.test.ts` → 7 tests pass

- [ ] **6. DB Matches**
  - What: Create `src/db/matches.ts` with insertMatch (INSERT OR IGNORE dedup) and getMatchesByUser. Write `tests/db/matches.test.ts` with 4 tests. TDD.
  - Depends: 3
  - Blocks: Tasks 10, 15
  - Category: `quick`
  - Skills: [`programming`]
  - QA: `npx vitest run tests/db/matches.test.ts` → 4 tests pass

- [ ] **7. DB Voice Sessions**
  - What: Create `src/db/voiceSessions.ts` with insertSession, closeSession, getLeaderboard. Write `tests/db/voiceSessions.test.ts` with 6 tests. TDD.
  - Depends: 3
  - Blocks: Tasks 11, 12, 15, 16
  - Category: `quick`
  - Skills: [`programming`]
  - QA: `npx vitest run tests/db/voiceSessions.test.ts` → 6 tests pass

- [ ] **8. DB Guild Config**
  - What: Create `src/db/guildConfig.ts` with getConfig and setConfig (upsert). Write `tests/db/guildConfig.test.ts` with 4 tests. TDD.
  - Depends: 3
  - Blocks: Tasks 15, 17
  - Category: `quick`
  - Skills: [`programming`]
  - QA: `npx vitest run tests/db/guildConfig.test.ts` → 4 tests pass

- [ ] **9. Riot API Client**
  - What: Create `src/riot/api.ts` with TokenBucket rate limiter (20 max, 20/sec) and RiotApi class (getSummonerByRiotId, getMatchIds, getMatch). Base URL: asia.api.riotgames.com.
  - Depends: 2
  - Blocks: Tasks 10, 15, 17
  - Category: `unspecified-high`
  - Skills: [`programming`]
  - QA: `npx tsc --noEmit` passes (no unit test — external API integration)

### Wave 4 (After Wave 3 Completes)

- [ ] **10. Riot Poller**
  - What: Create `src/riot/poller.ts` with `pollAllUsers(db, riotApi, callback)` — iterates all users, fetches new match IDs since last_poll_timestamp, processes each, inserts with dedup, calls callback for new matches, updates timestamp.
  - Depends: 4, 5, 6, 9
  - Blocks: 17
  - Category: `unspecified-high`
  - Skills: [`programming`]
  - QA: `npx tsc --noEmit` passes

- [ ] **11. Voice Tracker**
  - What: Create `src/voice/tracker.ts` with handleVoiceJoin, handleVoiceLeave, handleVoiceSwitch. Write `tests/voice/tracker.test.ts` with 4 tests. TDD.
  - Depends: 7
  - Blocks: 15, 16, 17
  - Category: `quick`
  - Skills: [`programming`]
  - QA: `npx vitest run tests/voice/tracker.test.ts` → 4 tests pass

- [ ] **12. Voice Reporter**
  - What: Create `src/voice/reporter.ts` with getDayRange, getWeekRange (Asia/Taipei), generateReport, getVoiceLeaderboard. Uses EmbedBuilder for Discord embeds.
  - Depends: 7
  - Blocks: 15, 17
  - Category: `quick`
  - Skills: [`programming`]
  - QA: `npx tsc --noEmit` passes

- [ ] **13. Bot Client**
  - What: Create `src/bot/client.ts` with createClient() — Guilds, GuildVoiceStates, GuildMessages intents.
  - Depends: 2
  - Blocks: 16, 17
  - Category: `quick`
  - Skills: [`programming`]
  - QA: `npx tsc --noEmit` passes

- [ ] **14. Bot Messages**
  - What: Create `src/bot/messages/gameResult.ts` (buildGameResultEmbed), `src/bot/messages/profile.ts` (buildProfileEmbed), `src/bot/messages/voiceReport.ts` (buildVoiceReportEmbed).
  - Depends: 1
  - Blocks: 15
  - Category: `visual-engineering`
  - Skills: [`programming`, `frontend`]
  - QA: `npx tsc --noEmit` passes

### Wave 5 (After Wave 4 Completes)

- [ ] **15. Bot Slash Commands**
  - What: Create `src/bot/commands/index.ts` (7 SlashCommandBuilder definitions) + register.ts, unregister.ts, profile.ts, leaderboard.ts, voice-report.ts, config.ts, help.ts handlers. Each handler is an async function taking (interaction, db, [riotApi]).
  - Depends: 5, 6, 7, 8, 9, 11, 12, 14
  - Blocks: 16
  - Category: `unspecified-high`
  - Skills: [`programming`]
  - QA: `npx tsc --noEmit` passes

### Wave 6 (After Wave 5 Completes)

- [ ] **16. Bot Event Handlers**
  - What: Create `src/bot/events/ready.ts` (onReady: register commands via REST, close stale sessions), `src/bot/events/voiceStateUpdate.ts` (delegate to tracker), `src/bot/events/interactionCreate.ts` (route to command handlers by name).
  - Depends: 13, 15, 11
  - Blocks: 17
  - Category: `unspecified-high`
  - Skills: [`programming`]
  - QA: `npx tsc --noEmit` passes

### Wave 7 (After Wave 6 Completes)

- [ ] **17. Main Entry Point**
  - What: Create `src/index.ts` with main() — loadConfig → createDatabase → initializeSchema → createClient → register events → setup cron (daily 23:59, weekly Sun 23:59, poll every N min) → client.login. Include SIGINT/SIGTERM graceful shutdown.
  - Depends: All previous tasks
  - Blocks: None (final task)
  - Category: `unspecified-high`
  - Skills: [`programming`, `verification-before-completion`]
  - QA: `npm run build` succeeds, `npm run test` all pass, `npm run dev` connects to Discord

## Execution Instructions

1. **Wave 1**: Fire single task (foundation)
   ```
   task(category="quick", load_skills=["programming"], run_in_background=false, prompt="Task 1: Project Scaffolding — ...")
   ```

2. **Wave 2**: Fire 3 tasks IN PARALLEL (no dependencies between them)
   ```
   task(category="quick", load_skills=["programming"], run_in_background=true, prompt="Task 2: Config (env.ts) — ...")
   task(category="quick", load_skills=["programming"], run_in_background=true, prompt="Task 3: DB Connection + Schema — ...")
   task(category="quick", load_skills=["programming"], run_in_background=true, prompt="Task 4: Riot MatchProcessor — ...")
   ```

3. **Wave 3**: Fire 5 tasks IN PARALLEL
   ```
   task(category="quick", load_skills=["programming"], run_in_background=true, prompt="Task 5: DB Users — ...")
   task(category="quick", load_skills=["programming"], run_in_background=true, prompt="Task 6: DB Matches — ...")
   task(category="quick", load_skills=["programming"], run_in_background=true, prompt="Task 7: DB Voice Sessions — ...")
   task(category="quick", load_skills=["programming"], run_in_background=true, prompt="Task 8: DB Guild Config — ...")
   task(category="unspecified-high", load_skills=["programming"], run_in_background=true, prompt="Task 9: Riot API Client — ...")
   ```

4. **Wave 4**: Fire 5 tasks IN PARALLEL
   ```
   task(category="unspecified-high", load_skills=["programming"], run_in_background=true, prompt="Task 10: Riot Poller — ...")
   task(category="quick", load_skills=["programming"], run_in_background=true, prompt="Task 11: Voice Tracker — ...")
   task(category="quick", load_skills=["programming"], run_in_background=true, prompt="Task 12: Voice Reporter — ...")
   task(category="quick", load_skills=["programming"], run_in_background=true, prompt="Task 13: Bot Client — ...")
   task(category="visual-engineering", load

<task_metadata>
session_id: ses_0b4a3ce3effeA6iyfiIDFJNOFO
task_id: ses_0b4a3ce3effeA6iyfiIDFJNOFO
subagent: plan
</task_metadata>