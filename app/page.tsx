// app/page.tsx
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';   // 事前レンダ回避
export default function Page() {
  redirect('/site/index.html');
}
