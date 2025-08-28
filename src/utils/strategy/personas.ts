export type PassWeights = {
  oppThreat: number;    // 相手脅威
  lanePressure: number; // レーン圧
  blockLeverage: number;// ブロック保持価値
  selfSafety: number;   // 自分の安全（高い=パスしやすい）
  handShape: number;    // 手札形状（温存価値）
  tempoBias: number;    // 手番距離バイアス（先に動かせたい=パス）
  baseBias: number;     // ベースオフセット
  threshold: number;    // 発火しきい値
  maxConsecutiveDamp: number; // 連続パス減衰率(0.0〜1.0)
};

// 3,5,8,10 のチューニング例
export const STRATEGIC_PERSONAS: Record<string, PassWeights> = {
  // 3主: 冷静コントローラ（ブロック重視・自己保全も高め）
  "3": { 
    oppThreat: 0.9, 
    lanePressure: 0.7, 
    blockLeverage: 1.2, 
    selfSafety: 1.1, 
    handShape: 0.6, 
    tempoBias: 0.3, 
    baseBias: 0.0, 
    threshold: 1.2, 
    maxConsecutiveDamp: 0.5 
  },

  // 5主: バランス型（全体中庸）
  "5": { 
    oppThreat: 0.8, 
    lanePressure: 0.8, 
    blockLeverage: 1.0, 
    selfSafety: 0.9, 
    handShape: 0.5, 
    tempoBias: 0.4, 
    baseBias: 0.0, 
    threshold: 1.4, 
    maxConsecutiveDamp: 0.5 
  },

  // 8主: 様子見カウンター（相手脅威・レーン圧に敏感、基礎しきい低め）
  "8": { 
    oppThreat: 1.1, 
    lanePressure: 1.0, 
    blockLeverage: 1.0, 
    selfSafety: 0.8, 
    handShape: 0.4, 
    tempoBias: 0.5, 
    baseBias: 0.1, 
    threshold: 1.0, 
    maxConsecutiveDamp: 0.6 
  },

  // 10主: 攻撃的ブロッカー（ブロック保持を最重視、しきいは高め＝選ぶ時は強い理由）
  "10": { 
    oppThreat: 0.7, 
    lanePressure: 0.6, 
    blockLeverage: 1.4, 
    selfSafety: 0.8, 
    handShape: 0.7, 
    tempoBias: 0.2, 
    baseBias: -0.1, 
    threshold: 1.6, 
    maxConsecutiveDamp: 0.4 
  },
};

export function getPersonaWeights(characterCode: string): PassWeights | null {
  return STRATEGIC_PERSONAS[characterCode] || null;
}