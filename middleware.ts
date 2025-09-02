import { NextRequest, NextResponse } from 'next/server';

const BASIC_USER = process.env.BASIC_USER || '';
const BASIC_PASS = process.env.BASIC_PASS || '';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export default function middleware(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    try {
      const base64 = auth.split(' ')[1] || '';
      const decoded = atob(base64);
      const [user, pass] = decoded.split(':');
      if (user === BASIC_USER && pass === BASIC_PASS) {
        return NextResponse.next();
      }
    } catch {}
  }
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Protected", charset="UTF-8"' },
  });
}
