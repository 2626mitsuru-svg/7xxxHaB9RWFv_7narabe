import { PersonalityTraits } from '../utils/cpuPersonalitySystem';

/**
 * CPU プレイヤーデータ（Joker個性対応）
 * 各キャラクターのjokerAversion値を設定
 */

export interface CPUPlayer {
  id: string;
  name: string;
  description: string;
  personality: PersonalityTraits;
  avatar: string;
}

// ★G. キャラ別 Joker 個性を反映したCPUプレイヤー定義
export const CPU_PLAYERS: CPUPlayer[] = [
  {
    id: 'cpu-01',
    name: '1主',
    description: '慎重派の戦略家。Jokerは大事に温存する傾向',
    personality: {
      aggressiveness: 0.3,
      conservativeness: 0.8,
      riskTolerance: 0.4,
      reading: 0.7,
      jokerAversion: 0.75,  // 大事にしがち
    },
    avatar: 'https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/01/neutral.png'
  },
  {
    id: 'cpu-02',
    name: '2主',
    description: 'バランス型の安定プレイヤー。Jokerは慎重に使用',
    personality: {
      aggressiveness: 0.4,
      conservativeness: 0.7,
      riskTolerance: 0.5,
      reading: 0.6,
      jokerAversion: 0.70,  // 大事にしがち
    },
    avatar: 'https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/02/neutral.png'
  },
  {
    id: 'cpu-03',
    name: '3主',
    description: '攻撃的なスピード重視。Jokerも積極的に活用',
    personality: {
      aggressiveness: 0.8,
      conservativeness: 0.2,
      riskTolerance: 0.9,
      reading: 0.5,
      jokerAversion: 0.30,  // 出しがち
    },
    avatar: 'https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/03/neutral.png'
  },
  {
    id: 'cpu-04',
    name: '4主',
    description: '場読みが得意な中級者。Jokerは状況を見て判断',
    personality: {
      aggressiveness: 0.5,
      conservativeness: 0.6,
      riskTolerance: 0.6,
      reading: 0.8,
      jokerAversion: 0.70,  // 大事にしがち
    },
    avatar: 'https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/04/neutral.png'
  },
  {
    id: 'cpu-05',
    name: '5主',
    description: '柔軟な発想の持ち主。Jokerは計画的に温存',
    personality: {
      aggressiveness: 0.6,
      conservativeness: 0.5,
      riskTolerance: 0.7,
      reading: 0.7,
      jokerAversion: 0.65,  // 大事にしがち
    },
    avatar: 'https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/05/neutral.png'
  },
  {
    id: 'cpu-06',
    name: '6主',
    description: 'リスクを恐れない果敢な挑戦者。Jokerも躊躇なく使用',
    personality: {
      aggressiveness: 0.7,
      conservativeness: 0.3,
      riskTolerance: 0.8,
      reading: 0.6,
      jokerAversion: 0.35,  // 出しがち
    },
    avatar: 'https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/06/neutral.png'
  },
  {
    id: 'cpu-07',
    name: '7主',
    description: '超攻撃的な短期決戦型。Jokerは早期に投入',
    personality: {
      aggressiveness: 0.9,
      conservativeness: 0.1,
      riskTolerance: 0.9,
      reading: 0.4,
      jokerAversion: 0.30,  // 出しがち
    },
    avatar: 'https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/07/neutral.png'
  },
  {
    id: 'cpu-08',
    name: '8主',
    description: '観察眼に優れた堅実派。Jokerは切り札として温存',
    personality: {
      aggressiveness: 0.4,
      conservativeness: 0.7,
      riskTolerance: 0.5,
      reading: 0.8,
      jokerAversion: 0.70,  // 大事にしがち
    },
    avatar: 'https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/08/neutral.png'
  },
  {
    id: 'cpu-09',
    name: '9主',
    description: 'センスが光る技巧派。Jokerは効果的なタイミングで使用',
    personality: {
      aggressiveness: 0.8,
      conservativeness: 0.2,
      riskTolerance: 0.8,
      reading: 0.6,
      jokerAversion: 0.35,  // 出しがち
    },
    avatar: 'https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/09/neutral.png'
  },
  {
    id: 'cpu-10',
    name: '10主',
    description: '豪胆な勝負師。Jokerも一気に勝負を決めに行く',
    personality: {
      aggressiveness: 0.9,
      conservativeness: 0.1,
      riskTolerance: 1.0,
      reading: 0.3,
      jokerAversion: 0.30,  // 出しがち
    },
    avatar: 'https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/10/neutral.png'
  },
  {
    id: 'cpu-11',
    name: '11主',
    description: 'パワープレイが持ち味。Jokerは積極的に展開に使用',
    personality: {
      aggressiveness: 0.8,
      conservativeness: 0.2,
      riskTolerance: 0.9,
      reading: 0.5,
      jokerAversion: 0.30,  // 出しがち
    },
    avatar: 'https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/11/neutral.png'
  }
];

/**
 * IDからCPUプレイヤー情報を取得
 */
export function getCPUPlayer(id: string): CPUPlayer | null {
  return CPU_PLAYERS.find(player => player.id === id) || null;
}

/**
 * 全CPUプレイヤーのIDリストを取得
 */
export function getAllCPUIds(): string[] {
  return CPU_PLAYERS.map(player => player.id);
}

/**
 * ランダムにCPUを選択（指定数）
 */
export function getRandomCPUs(count: number): CPUPlayer[] {
  const shuffled = [...CPU_PLAYERS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, CPU_PLAYERS.length));
}

/**
 * jokerAversionによるCPU分類
 */
export function getCPUsByJokerTendency(): {
  conservative: CPUPlayer[];  // Joker温存派 (aversion >= 0.6)
  balanced: CPUPlayer[];      // バランス派 (0.4 <= aversion < 0.6)
  aggressive: CPUPlayer[];    // Joker積極派 (aversion < 0.4)
} {
  const conservative = CPU_PLAYERS.filter(cpu => cpu.personality.jokerAversion >= 0.6);
  const balanced = CPU_PLAYERS.filter(cpu => 
    cpu.personality.jokerAversion >= 0.4 && cpu.personality.jokerAversion < 0.6
  );
  const aggressive = CPU_PLAYERS.filter(cpu => cpu.personality.jokerAversion < 0.4);

  return { conservative, balanced, aggressive };
}

/**
 * ★デバッグ用：Joker傾向の統計情報
 */
export function getJokerAversionStats() {
  const { conservative, balanced, aggressive } = getCPUsByJokerTendency();
  
  return {
    total: CPU_PLAYERS.length,
    conservative: {
      count: conservative.length,
      players: conservative.map(p => `${p.name}(${p.personality.jokerAversion})`)
    },
    balanced: {
      count: balanced.length,
      players: balanced.map(p => `${p.name}(${p.personality.jokerAversion})`)
    },
    aggressive: {
      count: aggressive.length,
      players: aggressive.map(p => `${p.name}(${p.personality.jokerAversion})`)
    },
    averageAversion: CPU_PLAYERS.reduce((sum, p) => sum + p.personality.jokerAversion, 0) / CPU_PLAYERS.length
  };
}