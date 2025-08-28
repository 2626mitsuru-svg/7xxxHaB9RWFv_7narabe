// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const BASIC_USER = (process.env.BASIC_USER || '').trim();
const BASIC_PASS = (process.env.BASIC_PASS || '').trim();

export const config = {
  // /site 以下だけを保護。_next や / は素通しにして干渉を無くす
  matcher: ['/site/:path*'],
};

export default function middleware(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    try {
      const b64 = auth.split(' ')[1] || '';
      const [u = '', p = ''] = atob(b64).split(':'); // ※ パスワードに「:」は使わない
      if (u === BASIC_USER && p === BASIC_PASS) {
        const res = NextResponse.next();
        res.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
        return res;
      }
    } catch { /* noop */ }
  }
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Protected", charset="UTF-8"' },
  });
}
