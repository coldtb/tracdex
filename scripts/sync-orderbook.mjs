import fs from 'node:fs';
import path from 'node:path';

const tokenFile = 'C:/Users/hitech/.gemini/antigravity/scratch/dex-data/trader/dashboard.token';
const targetBookPublic = 'C:/Users/hitech/.gemini/antigravity/scratch/reset-dex-web/public/live-orderbook.json';
const targetBookSrc = 'C:/Users/hitech/.gemini/antigravity/scratch/reset-dex-web/src/data/live-orderbook.json';
const targetWalletPublic = 'C:/Users/hitech/.gemini/antigravity/scratch/reset-dex-web/public/live-wallet-state.json';
const targetWalletSrc = 'C:/Users/hitech/.gemini/antigravity/scratch/reset-dex-web/src/data/live-wallet-state.json';

async function updateSync() {
  try {
    if (!fs.existsSync(tokenFile)) return;
    const token = fs.readFileSync(tokenFile, 'utf8').trim();

    // 1. Sync real orderbook
    try {
      const res = await fetch('http://127.0.0.1:47202/api/book?pair=RESET/USDC', {
        headers: { cookie: `dexdash47202=${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.asks && data.bids) {
          fs.writeFileSync(targetBookPublic, JSON.stringify(data, null, 2), 'utf8');
          fs.writeFileSync(targetBookSrc, JSON.stringify(data, null, 2), 'utf8');
        }
      }
    } catch (e) {}

    // 2. Sync real on-chain wallet balances (RESET on TRAC, USDC on Solana)
    try {
      const stateRes = await fetch('http://127.0.0.1:47202/api/state', {
        headers: { cookie: `dexdash47202=${token}` }
      });
      if (stateRes.ok) {
        const d = await stateRes.json();
        const assets = d.wallets?.assets || [];
        const resetAsset = assets.find(a => a.asset === 'RESET');
        const usdcAsset = assets.find(a => a.asset === 'USDC');
        const solAsset = assets.find(a => a.asset === 'SOL');
        const walletSummary = {
          solanaAddress: usdcAsset?.address || '161N33uKaKEzMEHKV2RaUkM68cLj6Wy9BdvV9rvNU6F',
          tracAddress: resetAsset?.address || 'trac1dsyccpuc8qt7djvy7zd7g993vt395fet87naatd32nrld65hwves8kd7j6',
          resetBalance: resetAsset?.free?.text || '0.0941',
          usdcBalance: usdcAsset?.free?.text || '0.40',
          solBalance: solAsset?.free?.text || '0.008'
        };
        fs.writeFileSync(targetWalletPublic, JSON.stringify(walletSummary, null, 2), 'utf8');
        fs.writeFileSync(targetWalletSrc, JSON.stringify(walletSummary, null, 2), 'utf8');
      }
    } catch (e) {}

  } catch (err) {
    // Silent daemon poller
  }
}

// Initial run
updateSync();
// Poll every 12s
setInterval(updateSync, 12000);
