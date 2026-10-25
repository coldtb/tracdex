import fs from 'fs';

async function sync() {
  console.log('Fetching live on-chain market feed from https://reset.much.fun ...');
  
  // 1. Fetch real candles
  const resCandles = await fetch('https://reset.much.fun/v1/market/candles?pair=RESET%2FUSDC&interval=15m&limit=500');
  const candleData = await resCandles.json();
  console.log('Real candles received:', candleData.candles?.length);

  // 2. Fetch real trades
  const resTrades = await fetch('https://reset.much.fun/v1/market/trades?pair=RESET%2FUSDC&limit=200');
  const tradeData = await resTrades.json();
  console.log('Real trades received:', tradeData.rows?.length);

  // 3. Inspect recent candles
  const recentCandles = candleData.candles || [];
  console.log('Latest 5 real candles:', recentCandles.slice(-5));
  console.log('Latest 5 real trades:', tradeData.rows?.slice(0, 5));
}

sync().catch(err => console.error('Sync error:', err));
