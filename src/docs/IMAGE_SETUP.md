# 画像システム設定ガイド

## 概要

七並べ観戦アプリは表情画像システムを採用しており、CPU各プレイヤーの状況に応じて表情が変化します。

## 現在の状態

- **プレースホルダー画像**: `placehold.co` を使用したダミー画像
- **自動フェールバック**: 画像読み込み失敗時の代替表示
- **環境変数対応**: `.env` 設定による本番画像への切替機能

## 表情一覧

| 表情           | 説明     | 発生条件        |
| -------------- | -------- | --------------- |
| `neutral`      | 通常状態 | デフォルト      |
| `happy`        | 喜び     | 勝利、手札0枚   |
| `thinking`     | 思考中   | 現在の手番      |
| `confident`    | 自信満々 | 残り手札2枚以下 |
| `nervous`      | 緊張     | パス上限近い    |
| `surprised`    | 驚き     | カード出し後    |
| `disappointed` | 失望     | 脱落、敗北      |

## Vercel配置時の設定手順

### 1. 画像ファイルの準備

以下の構造で画像を配置：

```
/public/images/
├── 01/
│   ├── neutral.png
│   ├── happy.png
│   ├── thinking.png
│   ├── confident.png
│   ├── nervous.png
│   ├── surprised.png
│   └── disappointed.png
├── 02/
│   ├── neutral.png
│   └── ...
└── 11/
    ├── neutral.png
    └── ...
```

### 2. 画像仕様

- **サイズ**: 160x160px推奨
- **フォーマット**: PNG or WebP
- **背景**: 透明またはアプリテーマに合った色
- **ファイル名**: 表情名そのまま（例: `thinking.png`）
- **フォルダ名**: 2桁ゼロ詰め（例: `01`, `02`, ..., `11`）

### 3. 環境変数設定

`.env` ファイルに以下を追加：

```env
VITE_IMAGE_BASE=https://your-app.vercel.app/images
```

### 4. CORS設定（推奨）

`vercel.json` を作成：

```json
{
  "headers": [
    {
      "source": "/images/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

### 5. デプロイ

1. Vercelにプロジェクトをデプロイ
2. 画像ファイルをpublicディレクトリに配置
3. 環境変数を設定
4. アプリを再起動

## 画像作成ガイド

### デザインガイドライン

- **スタイル**: 統一されたアートスタイル
- **表情**: 明確で分かりやすい表情
- **色調**: アプリのダークテーマに合う色合い
- **キャラクター**: 各CPUの個性を反映

### 推奨ツール

- **AI生成**: Midjourney, DALL-E, Stable Diffusion
- **手描き**: Photoshop, Illustrator, Figma
- **無料ツール**: GIMP, Canva, Figma

### サンプルプロンプト（AI生成）

```
anime character portrait, [expression], simple background,
160x160px, game UI style, consistent art style,
high quality, detailed face, [character traits]
```

## トラブルシューティング

### 画像が表示されない

1. **ファイルパス確認**: フォルダ構造が正しいか
2. **ファイル名確認**: 表情名とファイル名が一致するか
3. **環境変数確認**: `VITE_IMAGE_BASE` が正しく設定されているか
4. **CORS確認**: ブラウザの開発者ツールでCORSエラーをチェック

### フェールバック動作

画像読み込みに失敗した場合：

1. 最初に指定された画像URL
2. エラー時にプレースホルダー画像
3. 最終的にテキスト表示

## 開発者向け情報

### 画像URL生成関数

```typescript
export const buildExpressionUrl = (
  id: string | number,
  exp: Expression,
): string => {
  const base = import.meta.env?.VITE_IMAGE_BASE?.trim();
  if (base) {
    return `${base}/${pad2(id)}/${exp}.png`;
  }
  return `https://placehold.co/160x160/2d3748/ffffff?text=${encodeURIComponent(`${pad2(id)}-${exp}`)}`;
};
```

### カスタマイズ

新しい表情を追加する場合：

1. `types/sevens.ts` の `Expression` 型に追加
2. 対応する画像ファイルを配置
3. `utils/uiAdapter.ts` で表情切替ロジックを追加

## 参考資料

- [Vercel静的ファイル配信](https://vercel.com/docs/concepts/projects/project-structure)
- [CORS設定](https://vercel.com/docs/concepts/edge-network/headers)
- [環境変数](https://vercel.com/docs/concepts/projects/environment-variables)