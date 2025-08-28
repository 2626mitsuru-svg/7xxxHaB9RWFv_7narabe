/**
 * 対戦開始時のCPU組み合わせによる特殊セリフシステム
 */

import { speakByPlayerId } from "../data/events";

export interface CombinationRule {
  members: string[]; // 組み合わせメンバー（例: ["1主", "3主"]）
  speaker: string; // 発言者
  text: string; // 発言内容
}

// 組み合わせルールの定義
export const COMBINATION_RULES: CombinationRule[] = [
  // 1主 + 3主
  {
    members: ["1主", "3主"],
    speaker: "1主",
    text: "ご先祖！負けないぞ",
  },
  {
    members: ["1主", "3主"],
    speaker: "3主",
    text: "先祖様の力を見せてやる",
  },

  // 2主 + 3主
  {
    members: ["2主", "3主"],
    speaker: "2主",
    text: "ごせんぞ！まけないぞ",
  },

  // 4主 + 8主
  {
    members: ["4主", "8主"],
    speaker: "8主",
    text: "トリさんが相手なら楽勝ですかねぇ",
  },
  {
    members: ["4主", "8主"],
    speaker: "4主",
    text: "爬虫類にトランプとかわかるのか？",
  },

  // 4主 + 5主 + 6主 + 8主
  {
    members: ["4主", "5主", "6主", "8主"],
    speaker: "8主",
    text: "げげ、天空組とですか…",
  },

  // 8主 + 9主 + 7主 + 10主
  {
    members: ["8主", "9主", "7主", "10主"],
    speaker: "9主",
    text: "10主くんも果汁組の一員ですよね！",
  },

  // 3主 + 4主
  {
    members: ["3主", "4主"],
    speaker: "3主",
    text: "勇者対決ってやつ？",
  },

  // 9主 + 10主
  {
    members: ["9主", "10主"],
    speaker: "9主",
    text: "先輩の力見せますよ！",
  },

  // 7主 + 8主 + 9主
  {
    members: ["7主", "8主", "9主"],
    speaker: "7主",
    text: "果汁リーダーは僕だよ！",
  },
  {
    members: ["7主", "8主", "9主"],
    speaker: "8主",
    text: "勝ったら次の果汁サミットの議長は僕ですよ",
  },

  // 7主 + 8主 + 9主 + 4主
  {
    members: ["7主", "8主", "9主", "4主"],
    speaker: "8主",
    text: "果汁組で4主さんをやっつけましょう！",
  },
  {
    members: ["7主", "8主", "9主", "4主"],
    speaker: "4主",
    text: "なんで俺ここに混ぜられてんの？",
  },

  // 7主 + 8主 + 9主 + 3主
  {
    members: ["7主", "8主", "9主", "3主"],
    speaker: "3主",
    text: "なんで俺ここに混ぜられてんの？",
  },

  // 5主 + 7主
  {
    members: ["5主", "7主"],
    speaker: "7主",
    text: "ゲーム中でも羊さんは呼ぶからね",
  },
  {
    members: ["5主", "7主"],
    speaker: "5主",
    text: "何にも賭けられないの？惜しいなあ…",
  },

  // 3主 + 11主
  {
    members: ["3主", "11主"],
    speaker: "11主",
    text: "ロトの先輩と…！恥ずかしい！",
  },

  // 7主 + 11主
  {
    members: ["7主", "11主"],
    speaker: "7主",
    text: "セブンイレブンだね！",
  },

  // 6主 + 11主
  {
    members: ["6主", "11主"],
    speaker: "6主",
    text: "おっ11主！よろしくな！",
  },

  // 8主 + 10主
  {
    members: ["8主", "10主"],
    speaker: "8主",
    text: "僕が勝ったら錬金素材がほしいなあ…",
  },

  // 4主 + 6主
  {
    members: ["4主", "6主"],
    speaker: "6主",
    text: "4女ちゃんは？妹は？",
  },

  // 9主 + 6主
  {
    members: ["9主", "6主"],
    speaker: "6主",
    text: "9女ちゃんは？妹は？",
  },

  // 3主 + 6主
  {
    members: ["3主", "6主"],
    speaker: "6主",
    text: "3女ちゃんは？妹は？",
  },

  // 1主 + 6主
  {
    members: ["1主", "6主"],
    speaker: "1主",
    text: "勝ったら気球に乗せてくれよ",
  },

  // 9主 + 10主
  {
    members: ["9主", "10主"],
    speaker: "10主",
    text: "お、9主先輩。よろしくな",
  },

  // 8主 + 7主 + 10主
  {
    members: ["8主", "7主", "10主"],
    speaker: "10主",
    text: "今日は9主はいないのか？",
  },

  // 2主 + 4主
  {
    members: ["2主", "4主"],
    speaker: "2主",
    text: "べんきょうのせいかをみせてやる！",
  },

  // 6主 + 7主 + 8主 + 9主
  {
    members: ["6主", "7主", "8主", "9主"],
    speaker: "6主",
    text: "人数足りてる？分裂しようか？",
  },
];

/**
 * playerId（例: "cpu-1", "cpu-09"）をキャラクター名（例: "1主", "9主"）に変換
 * 先頭の0を削除して正規化
 */
function playerIdToCharacter(playerId: string): string {
  const match = playerId.match(/(\d+)/);
  if (match) {
    // parseIntで先頭の0を削除してから文字列に戻す
    const num = parseInt(match[1], 10);
    return `${num}主`;
  }
  return playerId;
}

/**
 * 選択されたCPUの組み合わせから適用可能なルールを検索
 */
export function findApplicableRules(
  selectedCPUs: string[],
): CombinationRule[] {
  const characters = selectedCPUs.map(playerIdToCharacter);
  const applicableRules: CombinationRule[] = [];

  console.debug(
    "[CombinationSpeech] Converting selectedCPUs:",
    selectedCPUs,
    "->",
    characters,
  );

  for (const rule of COMBINATION_RULES) {
    // ルールのメンバーが全て選択されたキャラクターに含まれているかチェック
    const isApplicable = rule.members.every((member) =>
      characters.includes(member),
    );

    if (isApplicable) {
      console.debug(
        "[CombinationSpeech] Found applicable rule:",
        rule,
      );
      applicableRules.push(rule);
    }
  }

  console.debug(
    "[CombinationSpeech] Total applicable rules found:",
    applicableRules.length,
  );

  return applicableRules;
}

/**
 * 適用可能なルールからランダムに1つ選択
 */
export function selectRandomRule(
  applicableRules: CombinationRule[],
): CombinationRule | null {
  if (applicableRules.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(
    Math.random() * applicableRules.length,
  );
  const selectedRule = applicableRules[randomIndex];

  console.debug(
    "[CombinationSpeech] Selected rule:",
    selectedRule,
  );
  return selectedRule;
}

/**
 * キャラクター名からplayerIdに変換（例: "1主" -> "cpu-01"）
 * ゼロパディングで正規化（selectedCPUsと形式を合わせる）
 */
export function characterToPlayerId(character: string): string {
  const match = character.match(/(\d+)主/);
  if (match) {
    const num = parseInt(match[1], 10);
    return `cpu-${num.toString().padStart(2, '0')}`;
  }
  return character;
}

/**
 * 組み合わせ特殊セリフを実行
 * @returns 特殊セリフが適用された場合はspeakerのplayerId、適用されなかった場合はnull
 */
export function executeSpecialCombinationSpeech(
  selectedCPUs: string[],
  setPlayerSpeeches: React.Dispatch<React.SetStateAction<any>>,
): string | null {
  const applicableRules = findApplicableRules(selectedCPUs);
  const selectedRule = selectRandomRule(applicableRules);

  if (!selectedRule) {
    console.debug(
      "[CombinationSpeech] No special combination found, will use default EVT_PLAYERS_CONFIRMED",
    );
    return null;
  }

  const speakerPlayerId = characterToPlayerId(
    selectedRule.speaker,
  );

  console.debug(
    `[CombinationSpeech] Executing special speech: ${selectedRule.speaker} (${speakerPlayerId}) says: "${selectedRule.text}"`,
  );

  // ★特殊セリフを設定（保護フラグ付きで3秒表示）
  setPlayerSpeeches((prev: any) => ({
    ...prev,
    [speakerPlayerId]: {
      playerId: speakerPlayerId,
      text: selectedRule.text,
      timestamp: Date.now(),
      isProtected: true, // ★保護フラグで自動消去を防ぐ
    },
  }));

  // ★3秒後に保護解除
  setTimeout(() => {
    setPlayerSpeeches((prev: any) => ({
      ...prev,
      [speakerPlayerId]: {
        ...prev[speakerPlayerId],
        isProtected: false,
      },
    }));
  }, 3000);

  // 他のプレイヤーはEVT_PLAYERS_CONFIRMEDを発言（一括処理）
  const otherPlayers = selectedCPUs.filter(playerId => playerId !== speakerPlayerId);
  
  console.debug(
    `[CombinationSpeech] Speaker exclusion - speakerPlayerId: "${speakerPlayerId}", selectedCPUs: [${selectedCPUs.map(id => `"${id}"`).join(', ')}], otherPlayers: [${otherPlayers.map(id => `"${id}"`).join(', ')}]`
  );
  
  if (otherPlayers.length > 0) {
    // 少し遅延してEVT_PLAYERS_CONFIRMEDの発言を設定
    setTimeout(() => {
      const speechUpdates: any = {};
      
      otherPlayers.forEach((playerId) => {
        const message = speakByPlayerId(playerId, "EVT_PLAYERS_CONFIRMED");
        if (message) {
          speechUpdates[playerId] = {
            playerId,
            text: message,
            timestamp: Date.now(),
            isProtected: true, // ★保護フラグで3秒表示
          };
        }
      });

      if (Object.keys(speechUpdates).length > 0) {
        setPlayerSpeeches((prev: any) => ({
          ...prev,
          ...speechUpdates,
        }));

        // ★3秒後に一括で保護解除（タイマーは一つだけ）
        setTimeout(() => {
          setPlayerSpeeches((prev: any) => {
            const updates = { ...prev };
            Object.keys(speechUpdates).forEach((playerId) => {
              if (updates[playerId]) {
                updates[playerId] = {
                  ...updates[playerId],
                  isProtected: false,
                };
              }
            });
            return updates;
          });
        }, 3000);
      }
    }, 50);
  }

  return speakerPlayerId; // 特殊セリフが適用された、speakerのplayerIdを返す
}