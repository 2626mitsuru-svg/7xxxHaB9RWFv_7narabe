import { NextRequest, NextResponse } from 'next/server';

const BASIC_USER = process.env.BASIC_USER || '';
const BASIC_PASS = process.env.BASIC_PASS || '';

export const config = {
  // Nextのビルドアセット・faviconなどは素通し
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export default function middleware(req: NextRequest) {
  const auth = req.headers.get('authorization');

  if (auth?.startsWith('Basic ')) {
    try {
      const token = auth.split(' ')[1] || '';
      const decoded = atob(token);
      const [user, pass] = decoded.split(':');

      if (user === BASIC_USER && pass === BASIC_PASS) {
        // 認証通過時はキャッシュを避けたいなら必要に応じてヘッダ付与
        const res = NextResponse.next();
        res.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
        return res;
      }
    } catch {
      /* no-op */
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Protected", charset="UTF-8"' },
  });
}
