export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pair = url.searchParams.get('pair') || 'RESET/USDC';
  const targetUrl = `https://reset.much.fun/v1/market/trades?pair=${encodeURIComponent(pair)}`;

  try {
    const res = await fetch(targetUrl);
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=5'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
