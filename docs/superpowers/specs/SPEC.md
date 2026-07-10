# LOL-League 技術規格書

## 1. 專案概述

**LOL-League** 是一個 Discord Bot，用於追蹤社群成員的《英雄聯盟》遊戲紀錄與語音頻道活動時數。Bot 透過 Riot Games API 定期輪詢已綁定使用者的新對戰，並在 Discord 上發送遊戲結果通知、語音時數報表及排行榜。

| 屬性 | 值 |
|------|-----|
| 名稱 | `lol-league` |
| 版本 | `1.0.0` |
| 語言 | TypeScript 5.5+ |
| 執行環境 | Node.js ≥22，CommonJS |
| 建置工具 | tsc (TypeScript Compiler) |
| 開發執行 | `tsx` (即時轉譯，watch 模式) |
| 測試框架 | Vitest |
| 授權 | 私有 (private) |

### 執行指令

```bash
npm run dev        # tsx watch src/index.ts — 開發模式
npm run build      # tsc — 編譯至 dist/
npm run start      # node dist/index.js — 正式環境
npm run test       # vitest run — 執行測試
npm run test:watch # vitest — 監控模式測試
```

---

## 2. 專案結構

```
LOL-League/
├── .env                  # 環境變數（已 gitignore）
├── .env.example          # 環境變數範本
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── data/                 # SQLite 資料庫目錄（已 gitignore）
│   └── lol-league.db
├── src/
│   ├── index.ts          # 應用程式進入點
│   ├── config/
│   │   └── env.ts        # 環境變數驗證 (Zod)
│   ├── bot/
│   │   ├── client.ts     # Discord.js Client 工廠
│   │   ├── commands/     # Slash 指令定義
│   │   │   ├── index.ts
│   │   │   ├── register.ts
│   │   │   ├── unregister.ts
│   │   │   ├── profile.ts
│   │   │   ├── leaderboard.ts
│   │   │   ├── voice-report.ts
│   │   │   ├── config.ts
│   │   │   └── help.ts
│   │   ├── events/       # Discord 事件處理器
│   │   │   ├── ready.ts
│   │   │   ├── voiceStateUpdate.ts
│   │   │   └── interactionCreate.ts
│   │   └── messages/     # Embed 訊息建構器
│   │       ├── gameResult.ts
│   │       ├── profile.ts
│   │       └── voiceReport.ts
│   ├── db/               # 資料層 (SQLite via better-sqlite3)
│   │   ├── connection.ts
│   │   ├── schema.ts
│   │   ├── users.ts
│   │   ├── matches.ts
│   │   ├── voiceSessions.ts
│   │   └── guildConfig.ts
│   ├── riot/             # Riot Games API 整合層
│   │   ├── api.ts
│   │   ├── matchProcessor.ts
│   │   ├── poller.ts     # ⚠️ 尚未實作
│   │   └── summoner.ts   # ⚠️ 尚未實作
│   └── voice/            # 語音追蹤與報表邏輯
│       ├── tracker.ts
│       └── reporter.ts
└── tests/
    ├── config/
    │   └── env.test.ts
    ├── db/
    │   ├── guildConfig.test.ts
    │   ├── matches.test.ts
    │   ├── schema.test.ts
    │   ├── users.test.ts
    │   └── voiceSessions.test.ts
    ├── riot/
    │   └── matchProcessor.test.ts
    └── voice/
        └── tracker.test.ts
```

---

## 3. 系統架構

### 3.1 啟動流程 (src/index.ts)

```
main()
  ├── loadConfig()              # 讀取並驗證 .env
  ├── initializeDb()            # 開啟 SQLite 連線 (data/lol-league.db)
  ├── initializeSchema(db)      # 建立資料表（若不存在）
  ├── createClient()            # 初始化 Discord.js Client
  │
  ├── 註冊事件監聽器:
  │   ├── ready                → onReady() → 註冊 Slash 指令 + 關閉遺留語音 session
  │   ├── voiceStateUpdate     → 追蹤語音頻道進出
  │   └── interactionCreate    → 路由 Slash 指令
  │
  ├── 排程任務 (node-cron):
  │   ├── 每日 23:59         → 發送每日語音報表
  │   ├── 每週日 23:59      → 發送週語音報表
  │   └── 每 N 分鐘          → 輪詢 Riot API 新對戰
  │
  └── client.login(token)       # Bot 登入 Discord
```

### 3.2 模組依賴圖

```
index.ts
 ├── config/env.ts          → 環境變數
 ├── db/                    → SQLite 資料層
 │   ├── connection.ts
 │   ├── schema.ts
 │   ├── users.ts
 │   ├── matches.ts
 │   ├── voiceSessions.ts
 │   └── guildConfig.ts
 ├── bot/                   → Discord 互動層
 │   ├── client.ts
 │   ├── events/            → 事件處理
 │   └── messages/          → 訊息格式化
 ├── riot/                  → Riot API 整合
 │   ├── api.ts             → HTTP 客戶端 + 速率限制
 │   ├── matchProcessor.ts  → 資料轉換
 │   └── poller.ts          → 排程輪詢邏輯
 └── voice/                 → 語音追蹤
     ├── tracker.ts
     └── reporter.ts
```

---

## 4. 資料庫設計

### 4.1 技術規格

| 屬性 | 值 |
|------|-----|
| 引擎 | SQLite 3 |
| 函式庫 | `better-sqlite3` (同步 API) |
| 檔案路徑 | `./data/lol-league.db` |
| Journal 模式 | WAL (Write-Ahead Logging) |
| 外部鍵 | 啟用 (`foreign_keys = ON`) |

### 4.2 資料表

#### users（使用者綁定）

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| `discord_id` | TEXT | PRIMARY KEY | Discord 使用者 ID |
| `riot_puuid` | TEXT | UNIQUE NOT NULL | Riot 帳號 PUUID |
| `riot_game_name` | TEXT | NOT NULL | Riot ID 名稱 |
| `riot_tagline` | TEXT | NOT NULL | Riot ID 標籤 |
| `registered_at` | INTEGER | NOT NULL | 註冊時間 (Unix 秒) |
| `last_poll_timestamp` | INTEGER | NOT NULL, DEFAULT 0 | 上次輪詢時間戳 |

#### matches（遊戲對戰紀錄）

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 內部 ID |
| `match_id` | TEXT | UNIQUE NOT NULL | Riot Match ID |
| `user_discord_id` | TEXT | NOT NULL, FK → users.discord_id | 所屬使用者 |
| `champion_name` | TEXT | NOT NULL | 英雄名稱 |
| `kills` | INTEGER | NOT NULL | 擊殺 |
| `deaths` | INTEGER | NOT NULL | 死亡 |
| `assists` | INTEGER | NOT NULL | 助攻 |
| `win` | INTEGER | NOT NULL | 勝利 (1=贏, 0=輸) |
| `penta_kills` | INTEGER | NOT NULL, DEFAULT 0 | 五連殺次數 |
| `game_duration_seconds` | INTEGER | NOT NULL | 遊戲時長 (秒) |
| `game_end_timestamp` | INTEGER | NOT NULL | 遊戲結束時間 (Unix 秒) |
| `queue_type` | TEXT | NOT NULL | 模式 (ranked/normal/aram/other) |
| `created_at` | INTEGER | NOT NULL | 記錄建立時間 |

索引：`idx_matches_user`、`idx_matches_end_time`、`idx_matches_match_id (UNIQUE)`

#### voice_sessions（語音頻道紀錄）

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Session ID |
| `user_discord_id` | TEXT | NOT NULL | Discord 使用者 ID |
| `channel_id` | TEXT | NOT NULL | 語音頻道 ID |
| `channel_name` | TEXT | NOT NULL | 語音頻道名稱 |
| `joined_at` | INTEGER | NOT NULL | 加入時間 (Unix 秒) |
| `left_at` | INTEGER | NULL | 離開時間 (NULL 表示仍在線上) |
| `duration_seconds` | INTEGER | NOT NULL, DEFAULT 0 | 停留秒數 |

索引：`idx_voice_user`、`idx_voice_left_at`

#### guild_config（伺服器設定）

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| `key` | TEXT | PRIMARY KEY | 設定鍵 |
| `value` | TEXT | NOT NULL | 設定值 |

已使用的 key：
- `game_result_channel` — 遊戲結果通知頻道 ID
- `voice_report_channel` — 語音報表通知頻道 ID
- `poll_interval_minutes` — 輪詢間隔 (分鐘，預設 3)

---

## 5. Discord 指令

| 指令 | 選項 | 權限 | 說明 |
|------|------|------|------|
| `/register` | `game_name` (required), `tagline` (required) | 所有人 | 綁定 Riot 帳號 （⚠️ 處理器尚未實作） |
| `/unregister` | — | 所有人 | 解除帳號綁定 |
| `/profile` | `user` (optional) | 所有人 | 查詢遊戲數據（總場次、勝率、KDA、Penta、最近五場） |
| `/leaderboard` | `type`: kda / wins / penta / voice | 所有人 | 排行榜（KDA、勝場、Penta Kill、語音時數） |
| `/voice-report` | `period`: daily / weekly | 所有人 | 查詢語音頻道時數報表 |
| `/config set-channel` | `type`: game_result / voice_report, `channel` (required) | ManageGuild | 設定通知頻道 |
| `/help` | — | 所有人 | 顯示所有指令 |

---

## 6. 排程任務 (Cron)

| 排程 | 觸發時間 | 功能 |
|------|----------|------|
| 每日語音報表 | 每日 23:59 | 發送當日語音時數報表至已設定頻道 |
| 每週語音報表 | 每週日 23:59 | 發送本週語音時數報表至已設定頻道 |
| 遊戲輪詢 | 每 N 分鐘（預設 3） | 查詢已綁定使用者的新對戰，發送結果通知 |

---

## 7. 外部 API 整合

### 7.1 Discord API (discord.js v14)

**Gateway Intents**:
- `Guilds` — 伺服器資訊
- `GuildVoiceStates` — 語音狀態變化
- `GuildMessages` — 訊息讀寫

**REST API**: 用於啟動時註冊 Slash 指令 (`PUT /applications/{id}/guilds/{id}/commands`)

### 7.2 Riot Games API

#### 端點

| 方法 | 端點 | 用途 |
|------|------|------|
| `GET` | `/riot/account/v1/accounts/by-riot-id/{name}/{tag}` | 查詢 Riot 帳號 (PUUID) |
| `GET` | `/lol/match/v5/matches/by-puuid/{id}/ids` | 查詢對戰 ID 列表 |
| `GET` | `/lol/match/v5/matches/{id}` | 查詢對戰詳情 |

#### 路由對應

| RIOT_REGION | Continent Base URL |
|-------------|-------------------|
| `sea` | `https://asia.api.riotgames.com` |
| `tw2` | `https://asia.api.riotgames.com` |
| `kr` | `https://asia.api.riotgames.com` |
| `jp1` | `https://asia.api.riotgames.com` |

Region API (Account v1) 使用 continent routing；Match v5 使用 region routing (`https://{region}.api.riotgames.com`)。

#### 速率限制 (Rate Limiting)

內部實作 Token Bucket 演算法：
- 最大 token 數：20
- 補充速率：20 tokens/秒
- 每個請求 request 前必須取得 token，不足時自動等待

### 7.3 Queue Type 對應

| Riot queueId | 顯示名稱 |
|-------------|---------|
| 420, 440 | `ranked` (積分) |
| 450 | `normal` (一般) |
| 900 | `aram` |
| 其他 | `other` |

---

## 8. 資料流

### 8.1 使用者註冊流程

```
使用者 → /register <name> <tag>
  → interactionCreate → RiotApi.getSummonerByRiotId()
  → DB: users.insert() 綁定 discord_id ↔ puuid
  → 回覆確認訊息
```

### 8.2 語音追蹤流程

```
Discord 事件 voiceStateUpdate
  → oldState + newState 比較
  ├─ 加入頻道: handleVoiceJoin() → DB voice_sessions INSERT (left_at = NULL)
  ├─ 離開頻道: handleVoiceLeave() → DB voice_sessions UPDATE (left_at, duration_seconds)
  └─ 切換頻道: handleVoiceSwitch() → Leave + Join 組合
```

### 8.3 遊戲輪詢流程

```
cron 觸發 → pollAllUsers(db, riotApi, callback)
  → DB: users.getAllUsers()
  → 對每個 user:
    ├─ RiotApi.getMatchIds(puuid, last_poll_timestamp)
    ├─ 對每個 matchId:
    │   ├─ RiotApi.getMatch(matchId)
    │   ├─ matchProcessor.extractMatchData()
    │   └─ DB: matches.insertMatch() (INSERT OR IGNORE 去重)
    ├─ DB: users.updateLastPollTimestamp()
    └─ callback(newMatch) → sendGameResultEmbed()
```

### 8.4 語音報表流程

```
cron 觸發 或 /voice-report 指令
  → getDayRange() / getWeekRange() → { since, until }
  → DB: voiceSessions.getLeaderboard(since, until)
  → generateReport() → EmbedBuilder
  → 發送至已設定頻道
```

---

## 9. 環境變數

| 變數 | 必填 | 預設值 | 說明 |
|------|------|--------|------|
| `DISCORD_BOT_TOKEN` | ✅ | — | Discord Bot Token |
| `DISCORD_CLIENT_ID` | ✅ | — | Discord Application ID |
| `DISCORD_GUILD_ID` | ✅ | — | 目標伺服器 ID |
| `RIOT_API_KEY` | ✅ | — | Riot Games API Key |
| `RIOT_REGION` | ❌ | `sea` | Riot API 區域 (sea/tw2/kr/jp1...) |
| `RIOT_PLATFORM` | ❌ | `tw2` | Riot 平台代碼 |

驗證方式：Zod schema，啟動時自動檢查，格式不符會拋出錯誤並終止。

---

## 10. 已知缺口與待辦事項

| 項目 | 狀態 | 說明 |
|------|------|------|
| `src/riot/poller.ts` | ❌ 檔案不存在 | `pollAllUsers()` 被 `index.ts` 引用但尚未建立，遊戲輪詢排程無法運作 |
| `src/riot/summoner.ts` | ❌ 未實作 | `lookupByRiotId()` 直接拋出 `Not implemented` |
| `/register` 指令處理器 | ❌ 未實作 | interactionCreate 中回應 "register 功能尚未實作" |
| `src/voice/reporter.ts` | ✅ 已建立 | 本回合新增，需驗證時區處理是否正確 |

---

## 11. 依賴套件

| 套件 | 版本 | 用途 |
|------|------|------|
| `discord.js` | ^14.16.0 | Discord API 客戶端 |
| `better-sqlite3` | ^11.0.0 | SQLite 資料庫 (同步) |
| `axios` | ^1.7.0 | HTTP 請求 (Riot API) |
| `zod` | ^3.23.0 | 環境變數驗證 |
| `node-cron` | ^3.0.3 | 排程任務 |
| `dotenv` | ^17.4.2 | 讀取 .env 檔案 |
| `tsx` | ^4.16.0 | TypeScript 即時執行 (開發) |
| `typescript` | ^5.5.0 | 型別檢查與編譯 |
| `vitest` | ^2.0.0 | 測試框架 |

---

## 12. Git 排除規則

```
node_modules/
dist/
data/
.env
*.db
*.db-journal
.omo/
```

---

> 最後更新：2026-07-10
> 維護者：LOL-League
