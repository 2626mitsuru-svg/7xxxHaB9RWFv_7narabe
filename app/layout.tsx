'use client';

import type { ReactNode } from 'react';

export const metadata = { title: '七並べ（Protected）' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
