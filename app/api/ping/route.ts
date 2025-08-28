export async function GET() {
  const hasUser = !!process.env.BASIC_USER;
  const hasPass = !!process.env.BASIC_PASS;
  return new Response(JSON.stringify({ hasUser, hasPass }), {
    headers: { 'content-type': 'application/json' },
  });
}
