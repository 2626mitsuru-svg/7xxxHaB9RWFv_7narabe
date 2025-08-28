import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // ← これが超重要。Vite成果物を /site 配下に置くので参照も /site/ にする
  base: '/site/',
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      // バージョン付きの別名は不要。プロジェクト内参照用だけ残す
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'build', // ← package.json の mv build public/site と一致
  },
  // 開発用。Vercel本番には影響しません（残してOK/消してOK）
  server: {
    port: 3000,
    open: true,
  },
});
