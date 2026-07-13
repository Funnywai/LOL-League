import axios from 'axios';

interface ChampionInfo {
  id: string;    // 英文 key, e.g. "Sylas"
  name: string;  // 在地化名稱, e.g. "賽勒斯"
  key: string;   // championId, e.g. "517"
}

interface ChampionData {
  data: Record<string, ChampionInfo>;
}

let championNameMap: Map<string, string> | null = null;

/**
 * 從 Riot Data Dragon 下載英雄英→中名稱對照表 (zh_TW)。
 * 只載入一次，後續呼叫直接回傳快取。
 */
export async function loadChampionNames(): Promise<Map<string, string>> {
  if (championNameMap) return championNameMap;

  try {
    // 取最新版本號
    const versionsResp = await axios.get<string[]>(
      'https://ddragon.leagueoflegends.com/api/versions.json',
      { timeout: 10000 }
    );
    const version = versionsResp.data[0];

    // 下載繁體中文英雄資料
    const champResp = await axios.get<ChampionData>(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/zh_TW/champion.json`,
      { timeout: 10000 }
    );

    championNameMap = new Map();
    for (const champ of Object.values(champResp.data.data)) {
      championNameMap.set(champ.id, champ.name); // "Sylas" → "賽勒斯"
    }

    console.log(`Loaded ${championNameMap.size} champion names (zh_TW)`);
    return championNameMap;
  } catch (err) {
    console.warn('Failed to load champion names, falling back to English:', err);
    // 回傳空 Map，caller 會 fallback 到英文名
    championNameMap = new Map();
    return championNameMap;
  }
}

/**
 * 查詢英雄中文名。若查無則回傳原始英文名。
 */
export function getChampionNameZh(englishName: string): string {
  return championNameMap?.get(englishName) ?? englishName;
}
