'use client';

// src/hooks/useExpressionController.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { parseExpressionCSV } from '../data/expressions';
import { EXPRESSIONS_CSV } from '../data/expressions_data';
import { EventKey } from '../data/events';

// Vercel画像ベースURL（固定）
const VERCEL_BASE = 'https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app';

// 表情名（7種類・固定）
export type Expression =
  | 'neutral'
  | 'happy'
  | 'surprised'
  | 'confident'
  | 'thinking'
  | 'nervous'
  | 'disappointed';

// CPUごとの利用可能な表情（サーバーに実際に存在する画像のみ）
const AVAILABLE_EXPRESSIONS_PER_CPU: Record<string, Expression[]> = {
  'cpu-01': ['neutral', 'happy', 'confident', 'thinking', 'nervous', 'disappointed'],
  'cpu-02': ['neutral', 'happy', 'confident', 'thinking', 'nervous', 'disappointed'],
  'cpu-03': ['neutral', 'happy', 'confident', 'thinking', 'nervous', 'disappointed'],
  'cpu-04': ['neutral', 'happy', 'confident', 'thinking', 'nervous', 'disappointed'],
  'cpu-05': ['neutral', 'happy', 'confident', 'thinking', 'nervous', 'disappointed'],
  'cpu-06': ['neutral', 'happy', 'confident', 'thinking', 'nervous', 'disappointed'],
  'cpu-07': ['neutral', 'happy', 'confident', 'thinking', 'nervous', 'disappointed'],
  'cpu-08': ['neutral', 'happy', 'confident', 'thinking', 'nervous', 'disappointed'],
  'cpu-09': ['neutral', 'happy', 'confident', 'thinking', 'nervous', 'disappointed'],
  'cpu-10': ['neutral', 'happy', 'confident', 'thinking', 'nervous', 'disappointed'],
  'cpu-11': ['neutral', 'happy', 'confident', 'thinking', 'nervous', 'disappointed'],
};

// 表情の代替マッピング（存在しない表情の代替案）
const EXPRESSION_FALLBACKS: Record<Expression, Expression[]> = {
  surprised: ['nervous', 'thinking', 'neutral'],
  confident: ['happy', 'neutral'],
  thinking: ['nervous', 'neutral'],
  nervous: ['thinking', 'disappointed', 'neutral'],
  disappointed: ['nervous', 'neutral'],
  happy: ['confident', 'neutral'],
  neutral: ['neutral'], // 最終フォールバック
};

// プレイヤーIDを2桁形式に変換（cpu-1 → "01"）
export function formatPlayerId(playerId: string): string {
  const match = playerId.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    return num.toString().padStart(2, '0');
  }
  return '01'; // デフォルト
}

// CPUの利用可能な表情を取得
function getAvailableExpressions(playerId: string): Expression[] {
  return AVAILABLE_EXPRESSIONS_PER_CPU[playerId] || ['neutral', 'happy', 'confident', 'thinking'];
}

// 表情の適用可能性をチェックして、必要に応じて代替表情を選択
function validateAndFallbackExpression(playerId: string, requestedExpression: Expression): Expression {
  const availableExpressions = getAvailableExpressions(playerId);

  // 要求された表情が利用可能ならそのまま返す
  if (availableExpressions.includes(requestedExpression)) {
    return requestedExpression;
  }

  // 利用できない場合は代替案を探す
  const fallbacks = EXPRESSION_FALLBACKS[requestedExpression] || ['neutral'];
  for (const fallback of fallbacks) {
    if (availableExpressions.includes(fallback)) {
      console.debug(
        `[ExpressionController] ${playerId}: ${requestedExpression} -> ${fallback} (fallback)`
      );
      return fallback;
    }
  }

  // 最終的にneutralにフォールバック
  console.warn(
    `[ExpressionController] ${playerId}: ${requestedExpression} -> neutral (final fallback)`
  );
  return 'neutral';
}

// 表情画像URLを生成（検証済み表情のみ）
export function getExpressionSrc(playerId: string, expression: Expression): string {
  const formattedId = formatPlayerId(playerId);
  const validatedExpression = validateAndFallbackExpression(playerId, expression);
  return `${VERCEL_BASE}/${formattedId}/${validatedExpression}.png`;
}

// 表情状態管理
interface ExpressionState {
  current: Expression;
  timeoutId: number | null;
  lastSet: number;
  isPermanent: boolean; // 永続表情フラグ（セリフのisProtectedと同様）
  epoch: number; // ★ 追加：世代トークン（レース排除用）
}

// 表情TTL（ミリ秒）
const EXPRESSION_TTL = {
  thinking: () => 600 + Math.random() * 600, // 600-1200ms
  neutral: () => 600 + Math.random() * 600, // 600-1200ms
  default: () => 1800 + Math.random() * 400, // 1800-2200ms
};

// 表情TTL（ミリ秒）の下あたりに追加
const MIN_SWITCH_INTERVAL_MS = 180; // ★ 追加: 最小切替間隔

/**
 * 表情制御フック
 * - 同表情連続抑止（neutralは例外）
 * - TTL経過後neutral復帰（epochで競合排除）
 * - イベント駆動表情切替（CSV）
 * - 永続表情（順位確定など）
 */
export function useExpressionController() {
  const [expressions, setExpressions] = useState<Record<string, ExpressionState>>({});
  const timeoutsRef = useRef<Record<string, number>>({});
  const stateRef = useRef<Record<string, ExpressionState>>({}); // ★ 最新状態を常に参照
  const lastEventRef = useRef<Record<string, { eventKey: EventKey; timestamp: number }>>({});

  // CSV-based表情マップ（1回だけパース）
  const expressionMapRef = useRef<Record<string, Expression[]>>({});
  if (Object.keys(expressionMapRef.current).length === 0) {
    expressionMapRef.current = parseExpressionCSV(EXPRESSIONS_CSV);
    console.debug('[ExpressionController] CSV-based expression map initialized');
  }

  // expressions が更新されるたびに Ref も同期（setTimeout の古いクロージャ対策）
  useEffect(() => {
    stateRef.current = expressions;
  }, [expressions]);

  // 表情設定（同表情連続抑止 + TTL管理 + 永続表情保護 + 表情検証 + epoch）
  const setExpression = useCallback(
    (playerId: string, expression: Expression, options?: { ttlMs?: number; reason?: string; forcePermanent?: boolean }) => {
      const now = Date.now();
      const currentState = stateRef.current[playerId]; // ★ Ref から読む

      // ★永続表情が設定されている場合は上書きしない（forcePermanentの場合は除く）
      if (currentState?.isPermanent && !options?.forcePermanent) {
        console.debug(
          `[ExpressionController] Permanent expression exists for ${playerId}, ignoring ${expression} (${options?.reason || 'no reason'})`
        );
        return;
      }

      // 表情検証とフォールバック適用
      const validatedExpression = validateAndFallbackExpression(playerId, expression);

      // ★ 同表情連続抑止（neutral は例外：neutral→neutral は弾くが、neutral→別表情は通す）
      if (
        currentState?.current === validatedExpression &&
        validatedExpression !== 'neutral' &&
        now - currentState.lastSet < 500
      ) {
        return;
      }

     // ★ クールダウン: 前回から一定時間未満ならスキップ
     if (currentState && now - currentState.lastSet < MIN_SWITCH_INTERVAL_MS) {
       // 同じ表情なら無視、違う表情でも直近すぎるなら捨てる
       if (!options?.forcePermanent) {
         return;
       }
     }

      // 既存タイマークリア
      if (timeoutsRef.current[playerId]) {
        clearTimeout(timeoutsRef.current[playerId]);
        delete timeoutsRef.current[playerId];
      }

      // ★ epoch をインクリメントして“この適用の世代”を固定
      const nextEpoch = (currentState?.epoch ?? 0) + 1;

      // 新表情設定（検証済み表情を使用）
      setExpressions(prev => {
        const next: Record<string, ExpressionState> = {
          ...prev,
          [playerId]: {
            current: validatedExpression,
            timeoutId: null,
            lastSet: now,
            isPermanent: options?.forcePermanent || false,
            epoch: nextEpoch,
          },
        };
        stateRef.current = next; // ★ Ref 同期
        return next;
      });

      // neutral復帰タイマー設定（neutralの場合や永続表情の場合は除く）
      if (validatedExpression !== 'neutral' && !options?.forcePermanent) {
        const ttl =
          options?.ttlMs ||
          (validatedExpression === 'thinking' ? EXPRESSION_TTL.thinking() : EXPRESSION_TTL.default());

        const myEpoch = nextEpoch; // ★ 予約時点の epoch を捕捉
        const timeoutId = window.setTimeout(() => {
          const current = stateRef.current[playerId]; // ★ 最新状態を参照
          // 表情が変わっている／状態がない／epochがズレている → スキップ
          if (!current || current.current !== validatedExpression || current.epoch !== myEpoch) {
            console.debug(
              `[ExpressionController] ${playerId}: neutral復帰キャンセル（競合 or 古いタイマー）`
            );
            return;
          }
          setExpression(playerId, 'neutral');
          delete timeoutsRef.current[playerId];
        }, ttl);

        timeoutsRef.current[playerId] = timeoutId;
      }

      // ログは元の表情と検証済み表情の両方を表示
      const logMessage =
        expression !== validatedExpression
          ? `${expression} -> ${validatedExpression} (validated)`
          : validatedExpression;
      console.debug(
        `[ExpressionController] ✓ APPLY ${playerId}: ${logMessage} (perm=${options?.forcePermanent || false}, epoch=${(currentState?.epoch ?? 0) + 1}, reason=${options?.reason || 'no reason'})`
      );
    },
    []
  );

  // 表情取得
  const getExpression = useCallback(
    (playerId: string): Expression => stateRef.current[playerId]?.current || 'neutral',
    []
  );

  // 表情画像URL取得
  const getExpressionUrl = useCallback(
    (playerId: string): string => {
      const expression = getExpression(playerId);
      const url = getExpressionSrc(playerId, expression);
      // Only log when expression changes from neutral to avoid spam
      if (expression !== 'neutral') {
        console.debug(`[ExpressionController] ${playerId}: ${expression} -> ${url}`);
      }
      return url;
    },
    [getExpression]
  );

  // クリーンアップ
  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(timeoutId => clearTimeout(timeoutId));
      timeoutsRef.current = {};
      lastEventRef.current = {};
      stateRef.current = {};
    };
  }, []);

  // CSV-basedイベント駆動表情設定（デバウンス機能付き + 利用可能表情フィルタリング）
  const setExpressionFromEvent = useCallback(
    (playerId: string, eventKey: EventKey, options?: { ttlMs?: number; reason?: string }) => {
      // ★EVT_PLAYERS_CONFIRMEDは表情設定をスキップ（特殊セリフ後の不要な表情変更を防ぐ）
      if (eventKey === 'EVT_PLAYERS_CONFIRMED') {
        console.debug(
          `[ExpressionController] Skipping expression for ${playerId}: ${eventKey} (prevented expression override)`
        );
        return;
      }

      if (!expressionMapRef.current) {
        console.warn('[ExpressionController] Expression map not initialized');
        return;
      }

      const now = Date.now();
      const lastEvent = lastEventRef.current[playerId];

      // イベント単位でのデバウンス（同一イベントの300ms以内の重複実行を防ぐ）
      if (lastEvent && lastEvent.eventKey === eventKey && now - lastEvent.timestamp < 300) {
        console.debug(
          `[ExpressionController] Debounced duplicate event for ${playerId}: ${eventKey} (${now - lastEvent.timestamp}ms ago)`
        );
        return;
      }

      // 既に永続表情が設定されている場合はスキップ
      const currentState = stateRef.current[playerId];
      if (currentState?.isPermanent) {
        console.debug(
          `[ExpressionController] Permanent expression exists for ${playerId}, ignoring event ${eventKey}`
        );
        return;
      }

           // ★ クールダウン: 直近の切替から短すぎる場合は無視
     if (currentState && now - currentState.lastSet < MIN_SWITCH_INTERVAL_MS) {
       return;
     }

      // イベントに対応する表情候補を取得
      const eventExpressions = expressionMapRef.current[eventKey] || [];
      const availableExpressions = getAvailableExpressions(playerId);

      // 利用可能な表情のみにフィルタリング
      const validExpressions = eventExpressions.filter(expr => availableExpressions.includes(expr));

      // 利用可能な表情がない場合はフォールバック
      let expression: Expression;
      if (validExpressions.length > 0) {
        // ランダムに選択
        expression = validExpressions[Math.floor(Math.random() * validExpressions.length)];
      } else {
        // 元の表情を取得してフォールバック適用
        const originalExpression = (eventExpressions[0] || 'neutral') as Expression;
        expression = validateAndFallbackExpression(playerId, originalExpression);
      }

      const reason = `event:${eventKey}`;

      // 最後のイベント記録を更新
      lastEventRef.current[playerId] = { eventKey, timestamp: now };

      console.debug(
        `[ExpressionController] Setting expression for ${playerId}: ${expression} (${reason}) - Event OK`
      );
      setExpression(playerId, expression, { ...options, reason });
    },
    [setExpression]
  );

  // 永続表情設定（順位確定時）（デバウンス機能付き）
  const setPermanentExpression = useCallback(
    (playerId: string, expression: Expression, reason?: string) => {
      const now = Date.now();
      const currentState = stateRef.current[playerId];

      // 表情検証とフォールバック適用
      const validatedExpression = validateAndFallbackExpression(playerId, expression);

      // 永続表情の重複設定を防ぐ（既に同じ永続表情が設定されている場合はスキップ）
      if (
        currentState?.isPermanent &&
        currentState.current === validatedExpression &&
        now - currentState.lastSet < 500
      ) {
        console.debug(
          `[ExpressionController] Duplicate permanent expression ignored for ${playerId}: ${validatedExpression} (${reason})`
        );
        return;
      }

      // 強制的に永続表情を設定（検証済み表情を使用）
      const logMessage =
        expression !== validatedExpression
          ? `${expression} -> ${validatedExpression} (validated permanent)`
          : `${validatedExpression} (permanent)`;
      console.debug(
        `[ExpressionController] Setting permanent expression for ${playerId}: ${logMessage} (${
          reason || 'permanent'
        })`
      );
      setExpression(playerId, validatedExpression, { forcePermanent: true, reason: reason || 'permanent' });
    },
    [setExpression]
  );

  return {
    setExpression,
    setExpressionFromEvent,
    setPermanentExpression,
    getExpression,
    getExpressionUrl,
    expressions,
  };
}
