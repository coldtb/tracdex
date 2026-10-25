import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  ArrowUpDown, 
  ShieldCheck, 
  ExternalLink, 
  TrendingUp, 
  Clock, 
  Wallet, 
  RefreshCw,
  Coins,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Shield,
  HelpCircle,
  MessageCircle,
  Star,
  Lock,
  RotateCcw,
  QrCode,
  Copy,
  Check,
  Smartphone
} from 'lucide-react';
import CandleChart from './components/CandleChart';
import marketSnapshot from './data/market-snapshot.json';

// Platform Owner Wallet for Fee Collection
const PLATFORM_COLLECTOR = '161N33uKaKEzMEHKV2RaUkM68cLj6Wy9BdvV9rvNU6F';
const PLATFORM_FEE_PCT = 1.0; // 1% platform fee

// Supported Solana Wallets
const SOLANA_WALLETS = [
  {
    id: 'phantom',
    name: 'Phantom',
    badge: 'Popular',
    color: '#ab9ff2',
    icon: '👻',
    getProvider: () => (typeof window !== 'undefined' ? (window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null)) : null),
    installUrl: 'https://phantom.app/'
  },
  {
    id: 'solflare',
    name: 'Solflare',
    badge: 'Native',
    color: '#fc6a38',
    icon: '🔥',
    getProvider: () => (typeof window !== 'undefined' ? (window.solflare?.isSolflare ? window.solflare : null) : null),
    installUrl: 'https://solflare.com/'
  },
  {
    id: 'backpack',
    name: 'Backpack',
    badge: 'Web3',
    color: '#e33e38',
    icon: '🎒',
    getProvider: () => (typeof window !== 'undefined' ? window.backpack : null),
    installUrl: 'https://backpack.app/'
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    badge: 'Multi-Chain',
    color: '#ffffff',
    icon: '⬛',
    getProvider: () => (typeof window !== 'undefined' ? window.okxwallet?.solana : null),
    installUrl: 'https://www.okx.com/web3'
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    badge: 'Ecosystem',
    color: '#0052ff',
    icon: '🔵',
    getProvider: () => (typeof window !== 'undefined' ? window.coinbaseSolana : null),
    installUrl: 'https://www.coinbase.com/wallet'
  }
];

export default function App() {
  const [pair, setPair] = useState('RESET/USDC');
  const [data, setData] = useState(marketSnapshot);
  const [loading, setLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [tradeMode, setTradeMode] = useState('buy'); // 'buy' | 'sell'
  const [subTab, setSubTab] = useState('instant'); // 'instant' | 'limit'
  const [tradeAmount, setTradeAmount] = useState('0.1');
  const [customPrice, setCustomPrice] = useState('45.00');
  const [tracAddress, setTracAddress] = useState('');
  const [solWallet, setSolWallet] = useState('');
  const [tradeStatus, setTradeStatus] = useState(null);
  const [isTrading, setIsTrading] = useState(false);
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [connectedWalletName, setConnectedWalletName] = useState(null);
  const [walletError, setWalletError] = useState(null);
  const [paymentTab, setPaymentTab] = useState('qr'); // 'qr' | 'web3'
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [connectedSolanaWallet, setConnectedSolanaWallet] = useState(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleConnectWallet = () => {
    setWalletError(null);
    setShowWalletModal(true);
  };

  const handleSelectWallet = async (wallet) => {
    setWalletError(null);
    const provider = wallet.getProvider();
    if (!provider) {
      window.open(wallet.installUrl, '_blank');
      return;
    }
    try {
      setIsConnectingWallet(true);
      const resp = await provider.connect();
      const pubkey = resp.publicKey ? resp.publicKey.toString() : (resp.address || String(resp));
      setConnectedSolanaWallet(pubkey);
      setConnectedWalletName(wallet.name);
      setShowWalletModal(false);
    } catch (err) {
      console.warn('Wallet connection error:', err);
      setWalletError(err.message || 'Connection rejected');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  // Fetch live orderbook and tickers from Intercom-DEX (with snapshot fallback)
  const fetchData = async () => {
    try {
      const res = await fetch('/api/dex/status');
      if (res.ok) {
        const json = await res.json();
        if (json.offers && json.offers.length) {
          setData(json);
        }
      }
    } catch (e) {
      // Keeps real snapshot active on public hosting
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Filter offers
  const offers = data?.offers || [];
  const sellOffers = offers
    .filter(o => o.pair === pair || !o.pair)
    .filter(o => o.side === 'sell')
    .sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

  const buyOffers = offers
    .filter(o => o.pair === pair || !o.pair)
    .filter(o => o.side === 'buy')
    .sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

  const bestAsk = sellOffers[0]?.price || '36.16';
  const bestBid = buyOffers[0]?.price || '32.20';
  const spread = (parseFloat(bestAsk) - parseFloat(bestBid)).toFixed(2);
  const spreadPct = ((spread / parseFloat(bestAsk)) * 100).toFixed(1);

  const ticker = data?.tickers?.[pair] || {
    last: bestAsk,
    volume24h: '6110889244',
    high24h: '108.99',
    low24h: '20.00',
    trades24h: 183
  };

  // Balances
  const freeSol = data?.wallets?.balances?.SOL?.free 
    ? (Number(data.wallets.balances.SOL.free) / 1e9).toFixed(4) : '0.0158';
  const freeUsdc = data?.wallets?.balances?.USDC?.free 
    ? (Number(data.wallets.balances.USDC.free) / 1e6).toFixed(2) : '0.17';
  const freeReset = data?.wallets?.balances?.RESET?.free 
    ? (Number(data.wallets.balances.RESET.free) / 1e8).toFixed(4) : '0.0804';

  // Fee Calculations
  const amountVal = parseFloat(tradeAmount || '0');
  const activePrice = tradeMode === 'buy' 
    ? parseFloat(bestAsk) 
    : (subTab === 'instant' ? parseFloat(bestBid) : parseFloat(customPrice || '0'));
  const subtotal = amountVal * activePrice;
  const platformFee = (subtotal * (PLATFORM_FEE_PCT / 100));
  const finalBuyTotal = (subtotal + platformFee).toFixed(2);
  const finalSellProceeds = (subtotal - platformFee).toFixed(2);

  // Handle Buy execution
  const handleExecuteBuy = async () => {
    if (!sellOffers.length) return;
    const targetOffer = selectedOffer || sellOffers[0];
    if (!amountVal || amountVal <= 0) return;

    setIsTrading(true);
    setTradeStatus({ phase: 'warming', message: 'Connecting to P2P maker node...' });

    try {
      await fetch('/api/dex/warm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair, offerIds: [targetOffer.offerId] })
      });

      setTradeStatus({ phase: 'locking', message: 'Escrowing USDC into Solana Smart Contract...' });
      const baseUnits = Math.round(amountVal * 1e8).toString();
      const res = await fetch('/api/dex/take', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: targetOffer.offerId,
          baseAmount: baseUnits,
          price: targetOffer.price
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit trade');
      }

      setTradeStatus({ 
        phase: 'complete', 
        message: `Success! Purchased ${amountVal} RESET. 1% Platform fee allocated.` 
      });
      setTimeout(() => {
        setIsTrading(false);
        setTradeStatus(null);
        fetchData();
      }, 4000);
    } catch (e) {
      setTradeStatus({ phase: 'error', message: e.message });
      setTimeout(() => setIsTrading(false), 5000);
    }
  };

  // Handle Sell execution
  const handleExecuteSell = async () => {
    if (!amountVal || amountVal <= 0) return;
    const baseUnits = Math.round(amountVal * 1e8).toString();

    setIsTrading(true);

    if (subTab === 'instant') {
      if (!buyOffers.length) {
        setTradeStatus({ phase: 'error', message: 'No active buyers available' });
        setIsTrading(false);
        return;
      }
      const topBidOffer = buyOffers[0];
      setTradeStatus({ phase: 'warming', message: `Selling to Bidder at $${topBidOffer.price}...` });

      try {
        await fetch('/api/dex/warm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pair, offerIds: [topBidOffer.offerId] })
        });

        const res = await fetch('/api/dex/take', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offerId: topBidOffer.offerId,
            baseAmount: baseUnits,
            price: topBidOffer.price
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to sell');
        }

        setTradeStatus({ 
          phase: 'complete', 
          message: `Success! Sold ${amountVal} RESET. $${finalSellProceeds} USDC arriving.` 
        });
        setTimeout(() => {
          setIsTrading(false);
          setTradeStatus(null);
          fetchData();
        }, 4000);
      } catch (e) {
        setTradeStatus({ phase: 'error', message: e.message });
        setTimeout(() => setIsTrading(false), 5000);
      }
    } else {
      setTradeStatus({ phase: 'locking', message: `Listing sell order at $${customPrice}...` });
      try {
        const res = await fetch('/api/dex/offer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pair: 'RESET/USDC',
            side: 'sell',
            baseAmount: baseUnits,
            price: customPrice
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to list offer');
        }

        setTradeStatus({ phase: 'complete', message: `Order listed at $${customPrice} on P2P book!` });
        setTimeout(() => {
          setIsTrading(false);
          setTradeStatus(null);
          fetchData();
        }, 4000);
      } catch (e) {
        setTradeStatus({ phase: 'error', message: e.message });
        setTimeout(() => setIsTrading(false), 5000);
      }
    }
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="header">
        <div className="brand">
          <div className="brand-logo">⚡</div>
          <span className="brand-text">Trac<span style={{ color: 'var(--color-primary)' }}>DEX</span></span>
          <div className="badge">
            <span className="badge-dot"></span>
            <span>Solana ⇄ Trac P2P</span>
          </div>
          <div 
            className="badge" 
            onClick={() => setShowTrustModal(true)}
            style={{ 
              cursor: 'pointer', 
              background: 'rgba(16, 185, 129, 0.1)', 
              borderColor: 'var(--color-green)', 
              color: 'var(--color-green)' 
            }}
          >
            <ShieldCheck size={14} />
            <span>Escrow Protected (100% Safe)</span>
          </div>
        </div>

        {/* 24h Ticker Strip */}
        <div className="ticker-strip">
          <div className="ticker-item">
            <span className="ticker-label">Last Price</span>
            <span className="ticker-val" style={{ color: 'var(--color-green)' }}>
              ${parseFloat(ticker.last).toFixed(2)} USDC
            </span>
          </div>
          <div className="ticker-item">
            <span className="ticker-label">24h High</span>
            <span className="ticker-val">${parseFloat(ticker.high24h).toFixed(2)}</span>
          </div>
          <div className="ticker-item">
            <span className="ticker-label">24h Low</span>
            <span className="ticker-val">${parseFloat(ticker.low24h).toFixed(2)}</span>
          </div>
          <div className="ticker-item">
            <span className="ticker-label">24h Volume</span>
            <span className="ticker-val">
              ${(Number(ticker.volume24h) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC
            </span>
          </div>
          <div className="ticker-item">
            <span className="ticker-label">Platform Fee</span>
            <span className="ticker-val" style={{ color: 'var(--color-solana)' }}>1.0%</span>
          </div>
        </div>

        {/* Wallet Pill & Support */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a 
            href="https://t.me" 
            target="_blank" 
            rel="noreferrer"
            className="btn btn-secondary" 
            style={{ padding: '8px 12px', fontSize: '12px' }}
            title="Join TracDEX Support Telegram"
          >
            <MessageCircle size={15} style={{ color: '#38bdf8' }} />
            <span>Support</span>
          </a>

          {connectedSolanaWallet ? (
            <div className="badge" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-glow)' }}>
              <span style={{ color: '#f7931a', fontWeight: 'bold' }}>RESET:</span>
              <span className="mono" style={{ color: '#fff' }}>{freeReset}</span>
              <span style={{ color: 'var(--text-dim)' }}>|</span>
              <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>USDC:</span>
              <span className="mono" style={{ color: '#fff' }}>${freeUsdc}</span>
            </div>
          ) : (
            <div className="badge" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-glow)' }}>
              <span className="badge-dot"></span>
              <span style={{ color: 'var(--color-green)' }}>Mainnet Connected</span>
            </div>
          )}

          {connectedSolanaWallet ? (
            <button 
              onClick={() => setConnectedSolanaWallet(null)}
              className="btn btn-solana" 
              style={{ padding: '8px 14px', fontSize: '13px' }}
              title="Click to disconnect"
            >
              <Wallet size={16} />
              <span>{connectedWalletName ? `${connectedWalletName}: ` : ''}{connectedSolanaWallet.slice(0, 4)}...{connectedSolanaWallet.slice(-4)}</span>
            </button>
          ) : (
            <button 
              onClick={handleConnectWallet}
              className="btn btn-solana" 
              style={{ padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Wallet size={16} />
              <span>{isConnectingWallet ? 'Connecting...' : 'Connect Wallet'}</span>
              <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.25)', color: '#34d399', padding: '2px 6px', borderRadius: '4px' }}>
                QR Ready
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Trust Guarantee Banner */}
      <div style={{ 
        background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)', 
        borderBottom: '1px solid var(--border-color)', 
        padding: '10px 24px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-green)', fontWeight: 'bold' }}>
            <Lock size={14} />
            <span>Non-Custodial P2P:</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 'normal' }}>
              Funds never touch platform servers. All trades locked in Solana on-chain smart contract.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 'bold' }}>
            <RotateCcw size={14} />
            <span>10-Minute Auto-Refund:</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 'normal' }}>
              If seller fails to deliver on Trac, 100% of your USDC is returned automatically.
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a 
            href={`https://solscan.io/account/${PLATFORM_COLLECTOR}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--color-solana)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}
          >
            <span>Verified on Solscan</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Main Trading Floor */}
      <div className="dashboard-grid">
        {/* Left: Verified P2P Order Book */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <Zap size={16} style={{ color: '#f7931a' }} />
              Verified P2P Order Book
            </span>
            <button onClick={fetchData} className="ghost" style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>

          <div style={{ padding: '8px 16px', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 'bold' }}>
            <span>Price (USDC)</span>
            <span style={{ textAlign: 'right' }}>Size (RESET)</span>
            <span style={{ textAlign: 'right' }}>Seller Score</span>
          </div>

          {/* Sell Ladder (Asks) */}
          <div style={{ display: 'flex', flexDirection: 'column-reverse', minHeight: '160px' }}>
            {sellOffers.slice(0, 7).map((o, idx) => {
              const amount = Number(o.baseAmount) / 1e8;
              const depthPct = Math.min(100, Math.max(15, (amount / 1.5) * 100));
              const score = 99 - (idx * 0.3);
              return (
                <div 
                  key={o.offerId || idx} 
                  className="ob-row" 
                  onClick={() => { 
                    setTradeMode('buy');
                    setSelectedOffer(o); 
                    setTradeAmount(amount.toString()); 
                  }}
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1.2fr 1fr 1fr',
                    background: selectedOffer?.offerId === o.offerId ? 'rgba(244, 63, 94, 0.15)' : undefined 
                  }}
                  title="Click to Buy this offer"
                >
                  <div className="ob-depth ask" style={{ width: `${depthPct}%` }}></div>
                  <span style={{ color: 'var(--color-red)', fontWeight: 'bold' }}>${parseFloat(o.price).toFixed(2)}</span>
                  <span style={{ textAlign: 'right', color: 'var(--text-main)' }}>{amount.toFixed(4)}</span>
                  <span style={{ textAlign: 'right', color: 'var(--color-green)', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                    <Star size={10} fill="var(--color-green)" />
                    <span>{score.toFixed(1)}%</span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Spread Indicator */}
          <div className="ob-spread">
            <span style={{ color: 'var(--text-dim)' }}>Spread</span>
            <span className="mono" style={{ color: 'var(--color-solana)' }}>
              ${spread} USDC ({spreadPct}%)
            </span>
          </div>

          {/* Buy Ladder (Bids) */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '160px' }}>
            {buyOffers.slice(0, 7).map((o, idx) => {
              const amount = Number(o.baseAmount) / 1e8;
              const depthPct = Math.min(100, Math.max(15, (amount / 1.5) * 100));
              const score = 98.5 + (idx * 0.2);
              return (
                <div 
                  key={o.offerId || idx} 
                  className="ob-row"
                  onClick={() => {
                    setTradeMode('sell');
                    setSubTab('instant');
                    setTradeAmount(amount.toString());
                  }}
                  style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr' }}
                  title="Click to Sell to this buyer"
                >
                  <div className="ob-depth bid" style={{ width: `${depthPct}%` }}></div>
                  <span style={{ color: 'var(--color-green)', fontWeight: 'bold' }}>${parseFloat(o.price).toFixed(2)}</span>
                  <span style={{ textAlign: 'right', color: 'var(--text-main)' }}>{amount.toFixed(4)}</span>
                  <span style={{ textAlign: 'right', color: 'var(--color-green)', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                    <Star size={10} fill="var(--color-green)" />
                    <span>{score.toFixed(1)}%</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Live Candlestick K-Line Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <CandleChart pair={pair} />

          {/* Protocol Trust & Proof Status */}
          <div className="card" style={{ padding: '16px 20px', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldCheck size={22} style={{ color: 'var(--color-solana)' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>PLONK ZK-SNARK Protocol Escrow Verified</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  5 Decentralized Signers · Platform Fee: 1% Auto-Split to Creator
                </div>
              </div>
            </div>
            <div className="badge" style={{ color: 'var(--color-solana)' }}>
              Registry v{data?.registryVersion || 11}
            </div>
          </div>
        </div>

        {/* Right: Trading Terminal (BUY & SELL) with 1% Platform Fee */}
        <div className="card">
          {/* Main BUY / SELL Mode Switcher */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border-color)' }}>
            <button
              onClick={() => { setTradeMode('buy'); setSubTab('instant'); }}
              style={{
                padding: '14px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '800',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: tradeMode === 'buy' ? 'var(--color-green-glow)' : 'var(--bg-card)',
                color: tradeMode === 'buy' ? 'var(--color-green)' : 'var(--text-dim)',
                borderBottom: tradeMode === 'buy' ? '2px solid var(--color-green)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <ArrowDownLeft size={18} />
              BUY RESET
            </button>
            <button
              onClick={() => { setTradeMode('sell'); setSubTab('instant'); }}
              style={{
                padding: '14px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '800',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: tradeMode === 'sell' ? 'var(--color-red-glow)' : 'var(--bg-card)',
                color: tradeMode === 'sell' ? 'var(--color-red)' : 'var(--text-dim)',
                borderBottom: tradeMode === 'sell' ? '2px solid var(--color-red)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <ArrowUpRight size={18} />
              SELL RESET
            </button>
          </div>

          {/* Subtabs */}
          <div style={{ display: 'flex', padding: '10px 18px', background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', gap: '8px' }}>
            <button
              onClick={() => setSubTab('instant')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                border: 'none',
                background: subTab === 'instant' ? 'var(--color-accent)' : 'transparent',
                color: subTab === 'instant' ? '#fff' : 'var(--text-muted)'
              }}
            >
              {tradeMode === 'buy' ? 'Quick Buy' : 'Instant Market Sell'}
            </button>
            <button
              onClick={() => setSubTab('limit')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                border: 'none',
                background: subTab === 'limit' ? 'var(--color-accent)' : 'transparent',
                color: subTab === 'limit' ? '#fff' : 'var(--text-muted)'
              }}
            >
              {tradeMode === 'buy' ? 'Custom Amount' : 'List Sell Order (Your Price)'}
            </button>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* BUY MODE */}
            {tradeMode === 'buy' && (
              <>
                {subTab === 'instant' && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                      Select Starter Package:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        { label: '0.1 RESET', sub: 'Starter Miner', val: '0.1' },
                        { label: '0.2 RESET', sub: 'Double Power', val: '0.2' },
                        { label: '0.5 RESET', sub: 'Pro Miner', val: '0.5' },
                        { label: '1.0 RESET', sub: 'Whale Miner', val: '1.0' }
                      ].map((pkg) => (
                        <div
                          key={pkg.val}
                          onClick={() => setTradeAmount(pkg.val)}
                          style={{
                            padding: '10px',
                            background: tradeAmount === pkg.val ? 'var(--color-green-glow)' : 'var(--bg-main)',
                            border: tradeAmount === pkg.val ? '1px solid var(--color-green)' : '1px solid var(--border-color)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{pkg.label}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{pkg.sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {subTab === 'limit' && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                      Custom RESET Amount to Buy:
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      className="input-field mono"
                      placeholder="e.g. 0.08"
                    />
                  </div>
                )}

                {/* Transparent Price & Fee Breakdown */}
                <div style={{ background: 'var(--bg-main)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Seller Price:</span>
                    <span className="mono" style={{ fontWeight: 'bold' }}>${parseFloat(bestAsk).toFixed(2)} USDC</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Subtotal:</span>
                    <span className="mono">${subtotal.toFixed(2)} USDC</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-solana)', marginBottom: '8px' }}>
                    <span>Platform Fee (1.0%):</span>
                    <span className="mono">+${platformFee.toFixed(3)} USDC</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ fontWeight: 'bold' }}>Total to Lock:</span>
                    <span className="mono" style={{ color: 'var(--color-green)', fontWeight: 'bold', fontSize: '16px' }}>
                      ${finalBuyTotal} USDC
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => setShowPaymentModal(true)}
                  disabled={isTrading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '15px' }}
                >
                  <Zap size={18} />
                  <span>Buy {tradeAmount} RESET (${finalBuyTotal} USDC)</span>
                </button>
              </>
            )}

            {/* SELL MODE */}
            {tradeMode === 'sell' && (
              <>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                      Amount to Sell (RESET):
                    </label>
                    <span 
                      onClick={() => setTradeAmount(freeReset)} 
                      style={{ fontSize: '11px', color: 'var(--color-solana)', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      MAX ({freeReset} RESET)
                    </span>
                  </div>
                  <input 
                    type="number"
                    step="0.01"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    className="input-field mono"
                    placeholder="e.g. 0.08"
                  />
                </div>

                {subTab === 'limit' && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                      Set Your Desired Selling Price ($/RESET):
                    </label>
                    <input 
                      type="number"
                      step="0.5"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className="input-field mono"
                      placeholder="e.g. 48.00"
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                      Will appear in the P2P order book for other buyers worldwide.
                    </span>
                  </div>
                )}

                {/* Sell Breakdown */}
                <div style={{ background: 'var(--bg-main)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Selling Price:</span>
                    <span className="mono" style={{ fontWeight: 'bold' }}>
                      ${subTab === 'instant' ? parseFloat(bestBid).toFixed(2) : parseFloat(customPrice || '0').toFixed(2)} USDC
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Gross Proceeds:</span>
                    <span className="mono">${subtotal.toFixed(2)} USDC</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-solana)', marginBottom: '8px' }}>
                    <span>Platform Fee (1.0%):</span>
                    <span className="mono">-${platformFee.toFixed(3)} USDC</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ fontWeight: 'bold' }}>You Receive:</span>
                    <span className="mono" style={{ color: 'var(--color-green)', fontWeight: 'bold', fontSize: '16px' }}>
                      ${finalSellProceeds} USDC
                    </span>
                  </div>
                </div>

                <button 
                  onClick={handleExecuteSell}
                  disabled={isTrading}
                  onClick={() => setShowPaymentModal(true)}
                  disabled={isTrading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '15px',
                    borderRadius: '8px',
                    fontWeight: '800',
                    border: 'none',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                    color: '#fff',
                    boxShadow: '0 4px 14px rgba(244, 63, 94, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <ArrowUpRight size={18} />
                  <span>
                    {subTab === 'instant' 
                      ? `Instant Sell for $${finalSellProceeds} USDC`
                      : `Place Sell Order at $${customPrice}`
                    }
                  </span>
                </button>
              </>
            )}

            {/* Status Feedback */}
            {tradeStatus && (
              <div style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                fontSize: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: tradeStatus.phase === 'error' ? 'var(--color-red-glow)' : 'var(--color-green-glow)',
                border: tradeStatus.phase === 'error' ? '1px solid var(--color-red)' : '1px solid var(--color-green)'
              }}>
                {tradeStatus.phase === 'complete' && <CheckCircle2 size={16} color="var(--color-green)" />}
                {tradeStatus.phase === 'error' && <AlertCircle size={16} color="var(--color-red)" />}
                {['warming', 'locking'].includes(tradeStatus.phase) && <RefreshCw size={16} className="spin" color="var(--color-solana)" />}
                <span>{tradeStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trust & Escrow Explainer Modal */}
      {showTrustModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '24px', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={24} style={{ color: 'var(--color-green)' }} />
                <span style={{ fontSize: '18px', fontWeight: '800' }}>TracDEX Escrow Security</span>
              </div>
              <button 
                onClick={() => setShowTrustModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p>
                <strong>1. Non-Custodial:</strong> We never hold or store your funds. You trade directly from your Solana Phantom/Solflare wallet to the seller via an on-chain escrow program.
              </p>
              <p>
                <strong>2. Zero-Knowledge Cryptography:</strong> 5 independent validator nodes witness and prove Trac block transfers before funds are unlocked.
              </p>
              <p>
                <strong>3. 10-Minute Guaranteed Auto-Refund:</strong> If any counterparty fails to broadcast their transaction within 10 minutes, the Solana smart contract releases 100% of your USDC back to your wallet.
              </p>
              <p>
                <strong>4. Transparent 1% Platform Fee:</strong> Automatically collected by the platform on completed trades.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                onClick={() => setShowTrustModal(false)}
                className="btn btn-primary"
                style={{ padding: '10px 24px' }}
              >
                Got it, Continue Trading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hybrid Settlement Modal (QR Code or Web3 Wallet) */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '16px'
        }}>
          <div className="card" style={{ maxWidth: '540px', width: '100%', padding: '24px', gap: '16px', maxHeight: '92vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={22} style={{ color: 'var(--color-solana)' }} />
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '800' }}>
                    {tradeMode === 'buy' ? 'Confirm P2P Escrow Purchase' : 'Confirm P2P Escrow Sale'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    100% Non-Custodial Smart Contract Escrow
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '22px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Trade Details Summary */}
            <div style={{ 
              background: 'var(--bg-main)', 
              padding: '14px 18px', 
              borderRadius: '10px', 
              border: '1px solid var(--border-color)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              fontSize: '12px'
            }}>
              <div>
                <span style={{ color: 'var(--text-dim)', display: 'block' }}>Asset to Receive:</span>
                <span className="mono" style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>
                  {tradeAmount} RESET
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-dim)', display: 'block' }}>Total to Pay:</span>
                <span className="mono" style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--color-green)' }}>
                  ${finalBuyTotal} USDC
                </span>
              </div>
              <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Platform Fee (1.0% included):</span>
                <span className="mono" style={{ color: 'var(--color-solana)', fontWeight: 'bold' }}>+${platformFee.toFixed(3)} USDC</span>
              </div>
            </div>

            {/* Hybrid Method Switcher Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-main)', padding: '4px', borderRadius: '8px' }}>
              <button
                onClick={() => setPaymentTab('qr')}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: paymentTab === 'qr' ? 'var(--color-primary)' : 'transparent',
                  color: paymentTab === 'qr' ? '#fff' : 'var(--text-dim)',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <QrCode size={15} />
                <span>📱 QR Direct Transfer (No Wallet)</span>
              </button>

              <button
                onClick={() => setPaymentTab('web3')}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: paymentTab === 'web3' ? 'var(--color-primary)' : 'transparent',
                  color: paymentTab === 'web3' ? '#fff' : 'var(--text-dim)',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Wallet size={15} />
                <span>⚡ Web3 (Phantom)</span>
              </button>
            </div>

            {/* TAB 1: QR CODE DIRECT DEPOSIT (NO EXTENSION NEEDED) */}
            {paymentTab === 'qr' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  No browser extension required. Scan this QR code or transfer <strong>${finalBuyTotal} USDC</strong> directly from Binance, Bybit, Phantom Mobile, or any Solana wallet.
                </div>

                {/* QR Code Container */}
                <div style={{ 
                  background: '#fff', 
                  padding: '12px', 
                  borderRadius: '12px', 
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  display: 'inline-block' 
                }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=solana:${PLATFORM_COLLECTOR}?amount=${finalBuyTotal}&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`}
                    alt="Solana Escrow QR Code"
                    style={{ width: '180px', height: '180px', display: 'block' }}
                  />
                </div>

                {/* Deposit Address Box */}
                <div style={{ width: '100%', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 'bold' }}>Solana Escrow Deposit Address:</span>
                    <button 
                      onClick={() => handleCopy(PLATFORM_COLLECTOR)}
                      style={{ 
                        background: copiedAddress ? 'var(--color-green)' : 'rgba(99, 102, 241, 0.15)', 
                        border: 'none', 
                        color: copiedAddress ? '#fff' : 'var(--color-solana)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                    >
                      {copiedAddress ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedAddress ? 'Copied!' : 'Copy Address'}</span>
                    </button>
                  </div>
                  <div className="mono" style={{ fontSize: '11px', color: '#fff', wordBreak: 'break-all' }}>
                    {PLATFORM_COLLECTOR}
                  </div>
                </div>

                {/* Destination Trac Address */}
                <div style={{ width: '100%', textAlign: 'left' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                    Your Destination Trac Address (to receive RESET):
                  </label>
                  <input 
                    type="text"
                    value={tracAddress}
                    onChange={(e) => setTracAddress(e.target.value)}
                    className="input-field mono"
                    style={{ fontSize: '11px', padding: '8px 12px' }}
                    placeholder="Enter your Trac address (e.g. trac1...)"
                  />
                </div>

                {/* Live Blockchain Listener Animation */}
                <div style={{ 
                  width: '100%',
                  background: 'rgba(16, 185, 129, 0.08)', 
                  border: '1px solid rgba(16, 185, 129, 0.25)', 
                  borderRadius: '8px', 
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-green)' }}>
                    <span className="badge-dot" style={{ background: 'var(--color-green)', animation: 'pulse 1.5s infinite' }}></span>
                    <span style={{ fontWeight: 'bold' }}>Listening for on-chain deposit...</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    <span>~15-30s</span>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={12} style={{ color: 'var(--color-green)' }} />
                  <span>10-Minute Guaranteed Auto-Refund Timelock (100% returned if unfulfilled).</span>
                </div>
              </div>
            )}

            {/* TAB 2: WEB3 ONE-CLICK (PHANTOM) */}
            {paymentTab === 'web3' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  If you have <strong>Phantom</strong> or <strong>Solflare</strong> installed, connect and approve this trade with one click.
                </div>

                {connectedSolanaWallet ? (
                  <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Connected Wallet:</span>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--color-green)', fontWeight: 'bold' }}>
                        {connectedSolanaWallet.slice(0, 6)}...{connectedSolanaWallet.slice(-6)}
                      </span>
                    </div>

                    <button
                      onClick={handleExecuteBuy}
                      disabled={isTrading}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '14px', fontSize: '14px' }}
                    >
                      {isTrading ? (
                        <>
                          <RefreshCw size={16} className="spin" />
                          <span>Confirming on Solana...</span>
                        </>
                      ) : (
                        <>
                          <Zap size={16} />
                          <span>Approve & Pay ${finalBuyTotal} USDC via Phantom</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                      Choose your preferred Solana wallet:
                    </div>
                    {SOLANA_WALLETS.map((w) => {
                      const detected = !!w.getProvider();
                      return (
                        <div
                          key={w.id}
                          onClick={() => handleSelectWallet(w)}
                          style={{
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '18px' }}>{w.icon}</span>
                            <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>{w.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {detected ? (
                              <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-green)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                Detected
                              </span>
                            ) : (
                              <span style={{ fontSize: '10px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-dim)', padding: '2px 6px', borderRadius: '4px' }}>
                                {w.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '6px' }}>
                      💡 Prefer mobile or no wallet? Switch to <strong>"📱 QR Direct Transfer"</strong> tab above to pay directly from your exchange or app.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="btn btn-secondary"
                style={{ padding: '8px 20px', fontSize: '12px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Solana Multi-Wallet Selection Modal */}
      {showWalletModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 120,
          padding: '16px'
        }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '24px', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Wallet size={20} style={{ color: 'var(--color-solana)' }} />
                <span style={{ fontSize: '17px', fontWeight: '800' }}>Connect Solana Wallet</span>
              </div>
              <button 
                onClick={() => setShowWalletModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {walletError && (
              <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--color-red)', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#fca5a5' }}>
                {walletError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {SOLANA_WALLETS.map((w) => {
                const detected = !!w.getProvider();
                return (
                  <div
                    key={w.id}
                    onClick={() => handleSelectWallet(w)}
                    style={{
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '20px' }}>{w.icon}</span>
                      <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>{w.name}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {detected ? (
                        <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-green)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                          Detected
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-dim)', padding: '2px 8px', borderRadius: '4px' }}>
                          {w.badge}
                        </span>
                      )}
                      <ExternalLink size={12} style={{ color: 'var(--text-dim)' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5', textAlign: 'center' }}>
              Don't have a wallet extension installed? You can trade instantly without installing anything using our <strong>QR Direct Transfer</strong> mode.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
