export const metadata = { title: '7ならべ（Protected）' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja"><body>{children}</body></html>
  );
}
