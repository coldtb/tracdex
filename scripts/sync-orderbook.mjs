import fs from 'node:fs';
import path from 'node:path';

const tokenFile = 'C:/Users/hitech/.gemini/antigravity/scratch/dex-data/trader/dashboard.token';
const targetPublic = 'C:/Users/hitech/.gemini/antigravity/scratch/reset-dex-web/public/live-orderbook.json';
const targetSrc = 'C:/Users/hitech/.gemini/antigravity/scratch/reset-dex-web/src/data/live-orderbook.json';

async function updateOrderbook() {
  try {
    if (!fs.existsSync(tokenFile)) return;
    const token = fs.readFileSync(tokenFile, 'utf8').trim();
    const res = await fetch('http://127.0.0.1:47202/api/book?pair=RESET/USDC', {
      headers: { cookie: `dexdash47202=${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.asks && data.bids) {
        fs.writeFileSync(targetPublic, JSON.stringify(data, null, 2), 'utf8');
        fs.writeFileSync(targetSrc, JSON.stringify(data, null, 2), 'utf8');
        console.log(`[${new Date().toISOString()}] Synced real orderbook: ${data.asks.length} asks, ${data.bids.length} bids`);
      }
    }
  } catch (err) {
    // Silent daemon poller
  }
}

// Initial run
updateOrderbook();
// Poll every 15s
setInterval(updateOrderbook, 15000);
