/**
 * CPU キャラクター別カラーパレット（厳密一致版・ゼロ詰め対応）
 * ロジックは一切変更せず、UI表示のみに使用
 */

export interface CPUColorConfig {
  id: string;
  primary: string;
  name: string;
  rgb: string; // アニメーション用のRGB値
}

// ★修正：指定色を厳密一致で固定
export const CPU_COLORS: Record<string, CPUColorConfig> = {
  '1': {
    id: '1',
    primary: '#191970', // ★指定色
    name: '1主',
    rgb: '25, 25, 112'
  },
  '2': {
    id: '2',
    primary: '#1e90ff', // ★指定色
    name: '2主',
    rgb: '30, 144, 255'
  },
  '3': {
    id: '3',
    primary: '#0000cd', // ★指定色
    name: '3主',
    rgb: '0, 0, 205'
  },
  '4': {
    id: '4',
    primary: '#3cb371', // ★指定色
    name: '4主',
    rgb: '60, 179, 113'
  },
  '5': {
    id: '5',
    primary: '#7b68ee', // ★指定色
    name: '5主',
    rgb: '123, 104, 238'
  },
  '6': {
    id: '6',
    primary: '#00bfff', // ★指定色
    name: '6主',
    rgb: '0, 191, 255'
  },
  '7': {
    id: '7',
    primary: '#20b2aa', // ★指定色
    name: '7主',
    rgb: '32, 178, 170'
  },
  '8': {
    id: '8',
    primary: '#ff8c00', // ★指定色
    name: '8主',
    rgb: '255, 140, 0'
  },
  '9': {
    id: '9',
    primary: '#da70d6', // ★指定色
    name: '9主',
    rgb: '218, 112, 214'
  },
  '10': {
    id: '10',
    primary: '#b22222', // ★指定色
    name: '10主',
    rgb: '178, 34, 34'
  },
  '11': {
    id: '11',
    primary: '#9932cc', // ★指定色
    name: '11主',
    rgb: '153, 50, 204'
  }
};

/**
 * ★修正：プレイヤーIDからCPU番号を抽出（先頭ゼロ除去・拡張正規表現）
 * cpu-01, cpu01, cpu_11, cpu-1, 11 に対応
 */
export function extractCPUNumber(playerId: string): string {
  // cpu-01, cpu01, cpu_11, cpu-1, 11 に対応
  const m = playerId.match(/cpu[-_]?(\d+)/i) || playerId.match(/^(\d+)$/);
  let raw = m ? m[1] : '1';

  // ★先頭ゼロ除去（"01"→"1"）
  const n = parseInt(raw, 10);
  if (Number.isFinite(n) && n >= 1 && n <= 11) {
    return String(n);
  }

  console.warn('[cpuColors] fallback to 1: playerId=', playerId, ' raw=', raw);
  return '1';
}

/**
 * ★修正：プレイヤーIDからカラー設定を取得（ロバスト版）
 */
export function getCPUColor(playerId: string): CPUColorConfig {
  const cpuNumber = extractCPUNumber(playerId); // ← ここで "01"→"1" に正規化される
  const color = CPU_COLORS[cpuNumber];
  
  if (!color) {
    console.warn(`[cpuColors] color not found for cpuNumber=${cpuNumber}, playerId=${playerId}`);
    return CPU_COLORS['1']; // フォールバック
  }
  
  return color;
}

/**
 * 手数に基づくバッジ内容を生成
 */
export function generateCardBadge(playerId: string, moveNumber?: number, isEliminated?: boolean): {
  backgroundColor: string;
  content: string;
  textColor: string;
} {
  const color = getCPUColor(playerId);
  
  return {
    backgroundColor: color.primary,
    content: isEliminated ? '⚰️' : (moveNumber?.toString() || '?'),
    textColor: '#ffffff'
  };
}

/**
 * プレイヤーの枠色を取得（アクティブ時の光る効果用）
 */
export function getPlayerBorderColor(playerId: string, isActive: boolean = false): string {
  const color = getCPUColor(playerId);
  if (isActive) {
    return `0 0 20px rgba(${color.rgb}, 0.6), 0 0 40px rgba(${color.rgb}, 0.4)`;
  }
  return `0 0 5px rgba(${color.rgb}, 0.3)`;
}

/**
 * カード配置アニメーション用のCSS変数を生成
 */
export function getCardAnimationVars(playerId: string): Record<string, string> {
  const color = getCPUColor(playerId);
  return {
    '--card-glow-color': `rgba(${color.rgb}, 0.4)`,
    '--card-border-color': color.primary,
  };
}

/**
 * システムプレイヤー用の色（保険埋め用）
 */
export function getSystemColor(): CPUColorConfig {
  return {
    id: 'system',
    primary: '#666666',
    name: 'システム',
    rgb: '102, 102, 102'
  };
}