export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pair = url.searchParams.get('pair') || 'RESET/USDC';
  const interval = url.searchParams.get('interval') || '15m';
  const targetUrl = `https://reset.much.fun/v1/market/candles?pair=${encodeURIComponent(pair)}&interval=${encodeURIComponent(interval)}`;

  try {
    const res = await fetch(targetUrl);
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=10'
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
