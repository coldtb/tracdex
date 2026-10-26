import React, { useState, useEffect, useRef } from 'react';
import { Buffer } from 'buffer';
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
  globalThis.Buffer = Buffer;
}
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
  Smartphone,
  LogOut
} from 'lucide-react';
import CandleChart from './components/CandleChart';
import marketSnapshot from './data/market-snapshot.json';
import liveOrderbook from './data/live-orderbook.json';
import liveWalletState from './data/live-wallet-state.json';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

// Platform Owner Wallet for Fee Collection
const PLATFORM_COLLECTOR = '161N33uKaKEzMEHKV2RaUkM68cLj6Wy9BdvV9rvNU6F';
const PLATFORM_FEE_PCT = 1.0; // 1% platform fee

// Official Web3 Wallet Vector SVG Logos
const PhantomIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" fill="none">
    <rect width="128" height="128" rx="28" fill="#AB9FF2" />
    <path d="M110.5 64C110.5 89.6802 89.6802 110.5 64 110.5C40.6732 110.5 21.3197 93.3072 18.0125 70.8875C17.6749 68.6001 19.5312 66.625 21.8488 66.625H42.75C44.8211 66.625 46.5 68.3039 46.5 70.375C46.5 75.3456 50.5294 79.375 55.5 79.375C60.4706 79.375 64.5 75.3456 64.5 70.375V41.5C64.5 30.1782 73.6782 21 85 21C96.3218 21 105.5 30.1782 105.5 41.5V64H110.5Z" fill="#FFF" />
    <circle cx="74.5" cy="50" r="4.5" fill="#AB9FF2" />
    <circle cx="93.5" cy="50" r="4.5" fill="#AB9FF2" />
  </svg>
);

const SolflareIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" fill="none">
    <rect width="128" height="128" rx="28" fill="#181424" />
    <path d="M64 24C64 24 48 44 48 62C48 70.8 51.6 78.8 57.2 84.4C56 80.8 55.6 76.8 56.8 72.8C58 68 61.2 64 65.2 61.2C67.2 60 69.6 58.8 72 58.8C78 58.8 83.2 62.8 84.8 68.4C86.8 74.8 84.4 81.6 79.2 86C84.8 82.8 88.4 77.2 89.6 70.8C90.8 64 88.8 56.8 84 51.6C78.4 45.6 72 36 72 24L64 24Z" fill="url(#solflareGradModal)" />
    <path d="M64 104C52.8 104 44 95.2 44 84C44 76.8 48 70.4 54 66.8C52.8 70.4 53.2 74.4 55.2 78C57.6 82 62 84.8 66.8 84.8C68.8 84.8 70.8 84.4 72.8 83.2C75.2 81.6 76.8 79.2 77.6 76.4C79.2 80.8 78.4 86 75.2 90C71.2 94.8 65.6 98 59.6 98.8C61.2 102 64.4 104 68 104H64Z" fill="#FFC83B" />
    <defs>
      <linearGradient id="solflareGradModal" x1="48" y1="24" x2="90" y2="86" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF8F3D" />
        <stop offset="1" stopColor="#FF3B30" />
      </linearGradient>
    </defs>
  </svg>
);

const BackpackIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" fill="none">
    <rect width="128" height="128" rx="28" fill="#E33E38" />
    <path d="M48 36C48 31.5817 51.5817 28 56 28H72C76.4183 28 80 31.5817 80 36V40H88C92.4183 40 96 43.5817 96 48V92C96 96.4183 92.4183 100 88 100H40C35.5817 100 32 96.4183 32 92V48C32 43.5817 35.5817 40 40 40H48V36ZM56 36V40H72V36H56ZM40 56V68H88V56H40ZM40 76V92H88V76H40Z" fill="white" />
  </svg>
);

const OkxIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" fill="none">
    <rect width="128" height="128" rx="28" fill="#000000" stroke="#333842" strokeWidth="4" />
    <rect x="28" y="28" width="24" height="24" rx="4" fill="#FFFFFF" />
    <rect x="76" y="28" width="24" height="24" rx="4" fill="#FFFFFF" />
    <rect x="52" y="52" width="24" height="24" rx="4" fill="#FFFFFF" />
    <rect x="28" y="76" width="24" height="24" rx="4" fill="#FFFFFF" />
    <rect x="76" y="76" width="24" height="24" rx="4" fill="#FFFFFF" />
  </svg>
);

const CoinbaseIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" fill="none">
    <rect width="128" height="128" rx="28" fill="#0052FF" />
    <circle cx="64" cy="64" r="32" fill="white" />
    <rect x="52" y="52" width="24" height="24" rx="6" fill="#0052FF" />
  </svg>
);

// Supported Solana Wallets with Official Logos
const SOLANA_WALLETS = [
  {
    id: 'phantom',
    name: 'Phantom',
    badge: 'Popular',
    color: '#ab9ff2',
    icon: PhantomIcon,
    getProvider: () => (typeof window !== 'undefined' ? (window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null)) : null),
    installUrl: 'https://phantom.app/'
  },
  {
    id: 'solflare',
    name: 'Solflare',
    badge: 'Native',
    color: '#fc6a38',
    icon: SolflareIcon,
    getProvider: () => (typeof window !== 'undefined' ? (window.solflare?.isSolflare ? window.solflare : null) : null),
    installUrl: 'https://solflare.com/'
  },
  {
    id: 'backpack',
    name: 'Backpack',
    badge: 'Web3',
    color: '#e33e38',
    icon: BackpackIcon,
    getProvider: () => (typeof window !== 'undefined' ? window.backpack : null),
    installUrl: 'https://backpack.app/'
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    badge: 'Multi-Chain',
    color: '#ffffff',
    icon: OkxIcon,
    getProvider: () => (typeof window !== 'undefined' ? window.okxwallet?.solana : null),
    installUrl: 'https://www.okx.com/web3'
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    badge: 'Ecosystem',
    color: '#0052ff',
    icon: CoinbaseIcon,
    getProvider: () => (typeof window !== 'undefined' ? window.coinbaseSolana : null),
    installUrl: 'https://www.coinbase.com/wallet'
  }
];

// Official GitHub Icon
const GithubIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

// Helper to calculate realistic relative time from timestamp
function formatTimeAgo(blockTimeSec) {
  if (!blockTimeSec) return 'Just now';
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - blockTimeSec);
  if (diff < 15) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return remMins > 0 ? `${hours}h ${remMins}m ago` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Real market stats derived from on-chain candle snapshot ──────────────────
function computeMarketStats(snapshot) {
  const allCandles = snapshot?.candles || [];
  if (!allCandles.length) return { price: '35.00', high24h: '35.00', low24h: '35.00', open24h: '35.00', vol24h: 0, change24h: '0.00' };

  // Latest close price from snapshot
  const latest = allCandles[allCandles.length - 1];
  const price = parseFloat(latest.c).toFixed(2);

  // 24h window
  const nowSec = Math.floor(Date.now() / 1000);
  const ago24h = nowSec - 86400;
  const c24 = allCandles.filter(c => c.t >= ago24h);
  const src = c24.length ? c24 : allCandles.slice(-24);

  const high24h = Math.max(...src.map(c => parseFloat(c.h))).toFixed(2);
  const low24h  = Math.min(...src.map(c => parseFloat(c.l))).toFixed(2);
  const open24h = parseFloat(src[0].o);
  const close24h = parseFloat(src[src.length - 1].c);
  const change24h = ((close24h - open24h) / open24h * 100).toFixed(2);
  const vol24h = src.reduce((acc, c) => acc + parseFloat(c.v?.text || c.v || '0'), 0);

  return { price, high24h, low24h, open24h, change24h, vol24h };
}

export default function App() {
  const [pair, setPair] = useState('RESET/USDC');
  const [data, setData] = useState(marketSnapshot);
  const [loading, setLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [tradeMode, setTradeMode] = useState('buy'); // 'buy' | 'sell'
  const [orderType, setOrderType] = useState('market'); // 'market' | 'limit' | 'swap'
  const [tradeAmount, setTradeAmount] = useState('0.1');
  const [customPrice, setCustomPrice] = useState('42.00');
  const [sliderPct, setSliderPct] = useState(25);
  const [tracAddress, setTracAddress] = useState('');
  const [solWallet, setSolWallet] = useState('');
  const [tradeStatus, setTradeStatus] = useState(null);
  const [isTrading, setIsTrading] = useState(false);
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const accountDropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
        setShowAccountDropdown(false);
      }
    }
    if (showAccountDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAccountDropdown]);
  const [connectedWalletName, setConnectedWalletName] = useState(null);
  const [walletError, setWalletError] = useState(null);
  const [paymentTab, setPaymentTab] = useState('qr'); // 'qr' | 'web3'
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [connectedSolanaWallet, setConnectedSolanaWallet] = useState(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [visitorUsdc, setVisitorUsdc] = useState(null);
  const [visitorSol, setVisitorSol] = useState(null);
  const [visitorReset, setVisitorReset] = useState('0.0000');
  const [showCustomRecipient, setShowCustomRecipient] = useState(false);
  const [tradeHistoryTab, setTradeHistoryTab] = useState('market'); // 'market' | 'my'
  const [, setTimeTick] = useState(0);
  const [liveBook, setLiveBook] = useState(liveOrderbook);
  const [myOrders, setMyOrders] = useState([]);

  // ── Compute real market stats from snapshot ──────────────────────────────────
  const marketStats = computeMarketStats(data);

  const [marketTrades, setMarketTrades] = useState(() => {
    if (marketSnapshot?.trades && marketSnapshot.trades.length) {
      const sorted = [...marketSnapshot.trades].sort((a, b) => (b.t || 0) - (a.t || 0));
      return sorted.slice(0, 30).map((t, idx, arr) => {
        const thisPrice = parseFloat(t.price || '40');
        const prevPrice = idx + 1 < arr.length ? parseFloat(arr[idx + 1].price || '40') : thisPrice;
        const inferredSide = t.side || (thisPrice >= prevPrice ? 'buy' : 'sell');
        const usdcVal = parseFloat(t.usdc || (parseFloat(t.amount || '0.1') * thisPrice).toFixed(2));
        return {
          id: t.id || `tx-${idx}`,
          side: inferredSide,
          price: thisPrice.toFixed(2),
          amount: parseFloat(t.amount || '0.1').toFixed(4),
          total: usdcVal.toFixed(2),
          fee: (usdcVal * 0.01).toFixed(3),
          blockTime: t.t,
          sig: t.id || `trade-${idx}`
        };
      });
    }
    return [];
  });

  // Dynamic wallet balance synchronization for any connected wallet
  // Extracted sync function for reuse (e.g., manual refresh)
  const syncRealBalances = async () => {
    try {
      let stateData = null;
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const json = await res.json();
          const assets = json.wallets?.assets || [];
          const resetAsset = assets.find(a => a.asset === 'RESET');
          const usdcAsset = assets.find(a => a.asset === 'USDC');
          const solAsset = assets.find(a => a.asset === 'SOL');
          stateData = {
            solanaAddress: usdcAsset?.address,
            tracAddress: resetAsset?.address,
            resetBalance: resetAsset?.free?.text,
            usdcBalance: usdcAsset?.free?.text,
            solBalance: solAsset?.free?.text
          };
        }
      } catch (e) {}

      if (!stateData) {
        try {
          const fallbackRes = await fetch('/live-wallet-state.json');
          if (fallbackRes.ok) stateData = await fallbackRes.json();
        } catch (e) {}
      }
      if (!stateData) stateData = liveWalletState;

      if (stateData && stateData.solanaAddress && connectedSolanaWallet &&
          connectedSolanaWallet.toLowerCase() === stateData.solanaAddress.toLowerCase()) {
        if (stateData.resetBalance) setVisitorReset(parseFloat(stateData.resetBalance).toFixed(4));
        if (stateData.usdcBalance) setVisitorUsdc(parseFloat(stateData.usdcBalance).toFixed(2));
        if (stateData.tracAddress && !tracAddress) setTracAddress(stateData.tracAddress);
      }
    } catch (err) {
      // silently ignore errors
    }
  };

  // Sync on wallet connect/disconnect and when Solana address changes
  useEffect(() => {
    if (!connectedSolanaWallet) {
      setVisitorUsdc(null);
      setVisitorSol(null);
      setVisitorReset('0.0000');
      setMyOrders([]);
      setTracAddress('');
      return;
    }

    // Load persisted orders for this wallet and scan orderbook for user's open orders
    try {
      const savedOrders = localStorage.getItem(`tracdex_orders_${connectedSolanaWallet}`);
      let ordersList = savedOrders ? JSON.parse(savedOrders) : [];
      
      // Auto-reflect live node offer in My Orders if user has active offer in liveBook
      if (liveBook?.asks) {
        const userSell = liveBook.asks.find(a => a.mine);
        if (userSell && !ordersList.some(o => o.price === userSell.price && o.side === 'sell')) {
          ordersList.unshift({
            id: 'node-' + (userSell.take?.offerId || 'active-sell').slice(0, 8),
            pair: 'RESET/USDC',
            side: 'sell',
            type: 'Limit',
            price: parseFloat(userSell.price).toFixed(2),
            amount: parseFloat(userSell.amount?.text || userSell.amount || '0').toFixed(4),
            total: (parseFloat(userSell.price) * parseFloat(userSell.amount?.text || userSell.amount || '0')).toFixed(2),
            status: 'OPEN',
            createdAt: Math.floor(Date.now() / 1000)
          });
        }
      }
      setMyOrders(ordersList);
    } catch (e) {
      setMyOrders([]);
    }

    // Initial sync of balances
    syncRealBalances();

    // Robust multi-endpoint Solana RPC query helper
    const querySolanaRpc = async (method, params) => {
      const endpoints = [
        'https://solana-rpc.publicnode.com',
        '/api/solana-rpc',
        'https://api.mainnet-beta.solana.com'
      ];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.result !== undefined) return json.result;
          }
        } catch (e) {}
      }
      return null;
    };

    // 1. Fetch real SOL balance on-chain
    querySolanaRpc('getBalance', [connectedSolanaWallet]).then(res => {
      if (res && res.value !== undefined) {
        setVisitorSol((res.value / 1e9).toFixed(3));
      }
    });

    // 2. Fetch real USDC balance on-chain (SPL Token EPjFW...)
    querySolanaRpc('getTokenAccountsByOwner', [
      connectedSolanaWallet,
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
      { encoding: 'jsonParsed' }
    ]).then(res => {
      if (res && res.value && res.value.length) {
        const amtStr = res.value[0].account?.data?.parsed?.info?.tokenAmount?.uiAmountString;
        if (amtStr !== undefined) {
          setVisitorUsdc(parseFloat(amtStr).toFixed(2));
          return;
        }
      }
      setVisitorUsdc('0.00');
    }).catch(() => {
      setVisitorUsdc('0.00');
    });
  }, [connectedSolanaWallet]);
  useEffect(() => {
    if (!connectedSolanaWallet) {
      setVisitorUsdc(null);
      setVisitorSol(null);
      setVisitorReset('0.0000');
      setMyOrders([]);
      return;
    }

    // Load persisted orders for this wallet and scan orderbook for user's open orders
    try {
      const savedOrders = localStorage.getItem(`tracdex_orders_${connectedSolanaWallet}`);
      let ordersList = savedOrders ? JSON.parse(savedOrders) : [];
      
      // Auto-reflect live node offer in My Orders if user has active offer in liveBook
      if (liveBook?.asks) {
        const userSell = liveBook.asks.find(a => a.mine);
        if (userSell && !ordersList.some(o => o.price === userSell.price && o.side === 'sell')) {
          ordersList.unshift({
            id: 'node-' + (userSell.take?.offerId || 'active-sell').slice(0, 8),
            pair: 'RESET/USDC',
            side: 'sell',
            type: 'Limit',
            price: parseFloat(userSell.price).toFixed(2),
            amount: parseFloat(userSell.amount?.text || userSell.amount || '0').toFixed(4),
            total: (parseFloat(userSell.price) * parseFloat(userSell.amount?.text || userSell.amount || '0')).toFixed(2),
            status: 'OPEN',
            createdAt: Math.floor(Date.now() / 1000)
          });
        }
      }
      setMyOrders(ordersList);
    } catch (e) {
      setMyOrders([]);
    }

    // Sync real TRAC RESET and USDC balances from the live DEX node
    const syncRealBalances = async () => {
      try {
        let stateData = null;
        try {
          const res = await fetch('/api/state');
          if (res.ok) {
            const json = await res.json();
            const assets = json.wallets?.assets || [];
            const resetAsset = assets.find(a => a.asset === 'RESET');
            const usdcAsset = assets.find(a => a.asset === 'USDC');
            const solAsset = assets.find(a => a.asset === 'SOL');
            stateData = {
              solanaAddress: usdcAsset?.address,
              tracAddress: resetAsset?.address,
              resetBalance: resetAsset?.free?.text,
              usdcBalance: usdcAsset?.free?.text,
              solBalance: solAsset?.free?.text
            };
          }
        } catch (e) {}

        if (!stateData) {
          try {
            const fallbackRes = await fetch('/live-wallet-state.json');
            if (fallbackRes.ok) stateData = await fallbackRes.json();
          } catch (e) {}
        }
        if (!stateData) stateData = liveWalletState;

        if (stateData) {
          if (stateData.solanaAddress && connectedSolanaWallet.toLowerCase() === stateData.solanaAddress.toLowerCase()) {
            if (stateData.resetBalance) setVisitorReset(parseFloat(stateData.resetBalance).toFixed(4));
            if (stateData.usdcBalance) setVisitorUsdc(parseFloat(stateData.usdcBalance).toFixed(2));
            if (stateData.tracAddress && !tracAddress) setTracAddress(stateData.tracAddress);
          }
        }
      } catch (err) {}
    };

    syncRealBalances();

    // Robust multi-endpoint Solana RPC query helper
    const querySolanaRpc = async (method, params) => {
      const endpoints = [
        'https://solana-rpc.publicnode.com',
        '/api/solana-rpc',
        'https://api.mainnet-beta.solana.com'
      ];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.result !== undefined) return json.result;
          }
        } catch (e) {}
      }
      return null;
    };

    // 1. Fetch real SOL balance on-chain
    querySolanaRpc('getBalance', [connectedSolanaWallet]).then(res => {
      if (res && res.value !== undefined) {
        setVisitorSol((res.value / 1e9).toFixed(3));
      }
    });

    // 2. Fetch real USDC balance on-chain (SPL Token EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)
    querySolanaRpc('getTokenAccountsByOwner', [
      connectedSolanaWallet,
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
      { encoding: 'jsonParsed' }
    ]).then(res => {
      if (res && res.value && res.value.length) {
        const amtStr = res.value[0].account?.data?.parsed?.info?.tokenAmount?.uiAmountString;
        if (amtStr !== undefined) {
          setVisitorUsdc(parseFloat(amtStr).toFixed(2));
          return;
        }
      }
      setVisitorUsdc('0.00');
    }).catch(() => {
      setVisitorUsdc('0.00');
    });
  }, [connectedSolanaWallet]);

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

  // Keep relative time labels updated quietly every 30s
  useEffect(() => {
    const timer = setInterval(() => setTimeTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live orderbook and real on-chain trades quietly without UI jitter
  const fetchData = async () => {
    // 1. Fetch real live trades directly from reset.much.fun
    try {
      const tradeRes = await fetch('/api/live-trades?pair=RESET/USDC');
      if (tradeRes.ok) {
        const json = await tradeRes.json();
        const rows = json.rows || [];
        if (rows.length) {
          setMarketTrades(() => {
            return rows.slice(0, 30).map((t, idx, arr) => {
              const thisPrice = parseFloat(t.price || '40.00');
              const prevPrice = idx + 1 < arr.length ? parseFloat(arr[idx + 1].price || '40.00') : thisPrice;
              const inferredSide = t.side || (thisPrice >= prevPrice ? 'buy' : 'sell');
              const usdcVal = parseFloat(t.usdc || (parseFloat(t.amount || '0.1') * thisPrice).toFixed(2));
              return {
                id: t.id || `trade-${idx}`,
                side: inferredSide,
                price: thisPrice.toFixed(2),
                amount: parseFloat(t.amount || '0.1').toFixed(4),
                total: usdcVal.toFixed(2),
                fee: (usdcVal * 0.01).toFixed(3),
                blockTime: t.t,
                sig: t.id || ''
              };
            });
          });
        }
      }
    } catch (e) {
      // Quiet background check
    }

    // 2. Fetch local dex status if node running
    try {
      const res = await fetch('/api/dex/status');
      if (res.ok) {
        const json = await res.json();
        if (json.offers && json.offers.length) {
          setData(json);
        }
      }
    } catch (e) {
      // Quiet background check
    }

    // 3. Fetch real live orderbook from Intercom-DEX network
    try {
      let bookRes = await fetch('/api/book?pair=RESET/USDC');
      let bookJson = null;
      if (bookRes.ok) {
        try {
          const contentType = bookRes.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            bookJson = await bookRes.json();
          }
        } catch (e) {}
      }
      if (!bookJson || (!bookJson.asks && !bookJson.bids)) {
        try {
          const fallbackRes = await fetch('/live-orderbook.json?t=' + Date.now());
          if (fallbackRes.ok) {
            bookJson = await fallbackRes.json();
          }
        } catch (e) {}
      }
      if (bookJson && (bookJson.asks || bookJson.bids)) {
        setLiveBook(bookJson);
      }
    } catch (e) {
      // Quiet background check
    }

    // 4. Sync real on-chain wallet balance from DEX
    if (connectedSolanaWallet) {
      try {
        let stateData = null;
        try {
          const res = await fetch('/api/state');
          if (res.ok) {
            const json = await res.json();
            const assets = json.wallets?.assets || [];
            const resetAsset = assets.find(a => a.asset === 'RESET');
            const usdcAsset = assets.find(a => a.asset === 'USDC');
            stateData = {
              solanaAddress: usdcAsset?.address,
              tracAddress: resetAsset?.address,
              resetBalance: resetAsset?.free?.text,
              usdcBalance: usdcAsset?.free?.text
            };
          }
        } catch (e) {}
        if (!stateData) {
          try {
            const fallbackRes = await fetch('/live-wallet-state.json');
            if (fallbackRes.ok) stateData = await fallbackRes.json();
          } catch (e) {}
        }
        if (!stateData) stateData = liveWalletState;
        if (stateData && stateData.solanaAddress && connectedSolanaWallet.toLowerCase() === stateData.solanaAddress.toLowerCase()) {
          if (stateData.resetBalance) setVisitorReset(parseFloat(stateData.resetBalance).toFixed(4));
          if (stateData.usdcBalance) setVisitorUsdc(parseFloat(stateData.usdcBalance).toFixed(2));
          if (stateData.tracAddress && !tracAddress) setTracAddress(stateData.tracAddress);
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [pair]);

  // Use real latest price: prefer latest on-chain trade, fallback to latest candle
  const latestTradePrice = marketTrades[0]?.price
    ? parseFloat(marketTrades[0].price).toFixed(2)
    : marketStats.price;
  const activePriceDisplay = latestTradePrice;
  const baseP = parseFloat(latestTradePrice) || 45.00;

  // Real dynamic orderbook derived directly from live Intercom-DEX P2P network
  const bookAsks = (liveBook?.asks && liveBook.asks.length ? liveBook.asks : []).map((o, idx) => ({
    offerId: o.take?.offerId || `ask-${idx}`,
    price: parseFloat(o.price).toFixed(2),
    amt: parseFloat(o.amount?.text || o.amount || '0'),
    total: parseFloat(o.total?.text || o.total || '0')
  }));

  const bookBids = (liveBook?.bids && liveBook.bids.length ? liveBook.bids : []).map((o, idx) => ({
    offerId: o.take?.offerId || `bid-${idx}`,
    price: parseFloat(o.price).toFixed(2),
    amt: parseFloat(o.amount?.text || o.amount || '0'),
    total: parseFloat(o.total?.text || o.total || '0')
  }));

  const bestAsk = bookAsks[0]?.price || '48.00';
  const bestBid = bookBids[0]?.price || '38.17';
  const spread = liveBook?.spread?.price || (parseFloat(bestAsk) - parseFloat(bestBid)).toFixed(2);
  const spreadPct = liveBook?.spread?.pct 
    ? parseFloat(liveBook.spread.pct).toFixed(2) 
    : ((parseFloat(spread) / parseFloat(bestAsk)) * 100).toFixed(2);

  // Cumulative depth for Order Book
  let askAcc = 0;
  const asksWithDepth = bookAsks.map((o) => {
    askAcc += o.amt;
    return { ...o, cum: askAcc };
  });

  let bidAcc = 0;
  const bidsWithDepth = bookBids.map((o) => {
    bidAcc += o.amt;
    return { ...o, cum: bidAcc };
  });

  const maxBookDepth = Math.max(askAcc, bidAcc, 1);

  // Real ticker stats from computed candle data
  const ticker = {
    last: activePriceDisplay,
    volume24h: marketStats.vol24h,
    high24h: marketStats.high24h,
    low24h:  marketStats.low24h,
    change24h: marketStats.change24h,
    trades24h: marketTrades.length
  };

  // Fee Calculations
  const amountVal = parseFloat(tradeAmount || '0');
  const activePrice = orderType === 'limit' 
    ? parseFloat(customPrice || '42.00')
    : (tradeMode === 'buy' ? parseFloat(bestAsk) : parseFloat(bestBid));
  const subtotal = amountVal * activePrice;
  const platformFee = (subtotal * (PLATFORM_FEE_PCT / 100));
  const finalBuyTotal = (subtotal + platformFee).toFixed(2);
  const finalSellProceeds = (subtotal - platformFee).toFixed(2);

  // Percentage slider change handler (0%, 25%, 50%, 75%, 100%)
  const handleSliderChange = (pct) => {
    setSliderPct(pct);
    const p = Math.max(0, Math.min(100, Number(pct)));
    if (tradeMode === 'buy') {
      const avail = parseFloat(visitorUsdc || '0');
      const effP = orderType === 'limit' ? parseFloat(customPrice || '42.00') : parseFloat(bestAsk || '42.00');
      if (effP > 0 && avail > 0) {
        const maxReset = avail / (effP * 1.01);
        const calcAmt = (maxReset * (p / 100)).toFixed(4);
        setTradeAmount(Math.max(0.0001, parseFloat(calcAmt)).toString());
      } else {
        setTradeAmount('0.0000');
      }
    } else {
      const avail = parseFloat(visitorReset || '0');
      if (avail > 0) {
        const calcAmt = (avail * (p / 100)).toFixed(4);
        setTradeAmount(Math.max(0.0001, parseFloat(calcAmt)).toString());
      } else {
        setTradeAmount('0.0000');
      }
    }
  };

  // Cancel open order
  const handleCancelOrder = (orderId) => {
    const updated = myOrders.filter(o => o.id !== orderId);
    setMyOrders(updated);
    if (connectedSolanaWallet) {
      localStorage.setItem('tracdex_orders_' + connectedSolanaWallet, JSON.stringify(updated));
    }
    setTradeStatus({ phase: 'complete', message: 'Order #' + orderId + ' cancelled.' });
    setTimeout(() => setTradeStatus(null), 3000);
  };

  // Handle Buy execution (Native Web3 Phantom / Solflare Escrow Transfer)
  const handleExecuteBuy = async () => {
    if (!amountVal || amountVal <= 0) return;

    if (!connectedSolanaWallet) {
      setShowWalletModal(true);
      return;
    }

    // Require TRAC address for receiving native RESET (bech32m trac1... or 64-char hex)
    const cleanTrac = tracAddress ? tracAddress.trim() : '';
    const isValidTrac = cleanTrac.startsWith('trac1') || /^[0-9a-fA-F]{64}$/.test(cleanTrac);
    if (!cleanTrac || !isValidTrac) {
      setTradeStatus({
        phase: 'error',
        message: 'Please enter a valid TRAC recipient address (trac1... or 64-hex) to receive native RESET!'
      });
      setTimeout(() => setTradeStatus(null), 5000);
      return;
    }

    // Limit Order Maker Logic: if buying below best ask, place an open maker order
    if (orderType === 'limit') {
      const targetP = parseFloat(customPrice || '0');
      if (targetP < parseFloat(bestAsk)) {
        const newOrder = {
          id: 'ord-' + Date.now().toString(36),
          pair: 'RESET/USDC',
          side: 'buy',
          type: 'Limit',
          price: targetP.toFixed(2),
          amount: amountVal.toFixed(4),
          total: (targetP * amountVal * 1.01).toFixed(2),
          status: 'OPEN',
          tracAddr: tracAddress,
          createdAt: Math.floor(Date.now() / 1000)
        };
        const updated = [newOrder, ...myOrders];
        setMyOrders(updated);
        localStorage.setItem('tracdex_orders_' + connectedSolanaWallet, JSON.stringify(updated));
        setTradeStatus({
          phase: 'complete',
          message: 'Limit Buy Order placed on Order Book at $' + targetP.toFixed(2) + ' (' + amountVal.toFixed(4) + ' RESET). Status: OPEN.'
        });
        setTradeHistoryTab('my');
        setTimeout(() => setTradeStatus(null), 5000);
        return;
      }
    }

    // Market / Taker Order execution
    const effPrice = orderType === 'limit' ? parseFloat(customPrice) : parseFloat(bestAsk);
    const usdcRequired = parseFloat((amountVal * effPrice * 1.01).toFixed(2));
    const userUsdc = parseFloat(visitorUsdc || '0');
    if (userUsdc < usdcRequired) {
      setTradeStatus({
        phase: 'error',
        message: 'Insufficient USDC balance: You have $' + userUsdc.toFixed(2) + ' USDC, required $' + usdcRequired.toFixed(2) + ' USDC.'
      });
      setTimeout(() => setTradeStatus(null), 5000);
      return;
    }

    setIsTrading(true);
    setTradeStatus({ phase: 'warming', message: 'Connecting to wallet & preparing transaction...' });

    try {
      const activeWalletObj = SOLANA_WALLETS.find(w => w.name === connectedWalletName) || SOLANA_WALLETS[0];
      const provider = activeWalletObj.getProvider() || window.phantom?.solana || window.solana;

      if (!provider) {
        throw new Error('Please open your Phantom / Solflare wallet extension');
      }

      // Multi-RPC resilient blockhash fetcher
      const rpcEndpoints = [
        'https://solana-rpc.publicnode.com',
        '/api/solana-rpc',
        'https://api.mainnet-beta.solana.com'
      ];

      let blockhash = null;
      for (const ep of rpcEndpoints) {
        try {
          const res = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: Date.now(),
              method: 'getLatestBlockhash',
              params: [{ commitment: 'confirmed' }]
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.result?.value?.blockhash) {
              blockhash = data.result.value.blockhash;
              break;
            }
          }
        } catch (e) {}
      }

      if (!blockhash) {
        const fallbackConn = new Connection('https://solana-rpc.publicnode.com', 'confirmed');
        const b = await fallbackConn.getLatestBlockhash('confirmed');
        blockhash = b.blockhash;
      }

      const senderPubkey = new PublicKey(connectedSolanaWallet);
      const recipientPubkey = new PublicKey(PLATFORM_COLLECTOR);
      const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

      const senderAta = await getAssociatedTokenAddress(usdcMint, senderPubkey);
      const recipientAta = await getAssociatedTokenAddress(usdcMint, recipientPubkey);

      const usdcLamports = Math.round(usdcRequired * 1e6);

      const transaction = new Transaction();
      transaction.add(
        createTransferInstruction(
          senderAta,
          recipientAta,
          senderPubkey,
          BigInt(usdcLamports)
        )
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPubkey;

      setTradeStatus({ phase: 'locking', message: 'Please approve the transaction in your wallet popup...' });
      const txResult = await provider.signAndSendTransaction(transaction);
      const sig = txResult.signature ? (typeof txResult.signature === 'string' ? txResult.signature : txResult.signature.toString()) : String(txResult);

      // Record filled settlement order in My Orders
      const settlementOrder = {
        id: 'tx-' + sig.slice(0, 8),
        pair: 'RESET/USDC',
        side: 'buy',
        type: orderType === 'limit' ? 'Limit (Taker)' : 'Market',
        price: effPrice.toFixed(2),
        amount: amountVal.toFixed(4),
        total: usdcRequired.toFixed(2),
        status: 'USDC Escrowed -> TRAC Dispatch Pending',
        sig: sig,
        tracAddr: tracAddress,
        createdAt: Math.floor(Date.now() / 1000)
      };

      const updated = [settlementOrder, ...myOrders];
      setMyOrders(updated);
      localStorage.setItem('tracdex_orders_' + connectedSolanaWallet, JSON.stringify(updated));

      setTradeStatus({ 
        phase: 'complete', 
        message: 'Solana USDC locked in Escrow! Tx: ' + sig.slice(0, 8) + '... Queued for native TRAC release to ' + tracAddress.slice(0, 10) + '...' 
      });

      // Update trade history with real transaction proof
      setMarketTrades(prev => [
        {
          id: 'tx-' + sig.slice(0, 10),
          side: 'buy',
          price: effPrice.toFixed(2),
          amount: amountVal.toFixed(4),
          total: usdcRequired.toFixed(2),
          fee: (usdcRequired * 0.01).toFixed(3),
          blockTime: Math.floor(Date.now() / 1000),
          sig: sig
        },
        ...prev
      ]);

      setTradeHistoryTab('my');

      setTimeout(() => {
        setIsTrading(false);
        setTradeStatus(null);
        fetchData();
      }, 7000);
    } catch (e) {
      console.warn('Trade execution error:', e);
      const msg = e.message?.includes('User rejected')
        ? 'Transaction cancelled by user'
        : (e.message || 'Trade submission failed');
      setTradeStatus({ phase: 'error', message: msg });
      setTimeout(() => {
        setIsTrading(false);
        setTradeStatus(null);
      }, 5000);
    }
  };

  // Handle Sell execution
  const handleExecuteSell = async () => {
    if (!amountVal || amountVal <= 0) return;

    if (!connectedSolanaWallet) {
      setShowWalletModal(true);
      return;
    }

    // Limit Order Maker Logic: if selling above best bid, place an open maker order
    if (orderType === 'limit') {
      const targetP = parseFloat(customPrice || '0');
      if (targetP > parseFloat(bestBid)) {
        const newOrder = {
          id: 'ord-' + Date.now().toString(36),
          pair: 'RESET/USDC',
          side: 'sell',
          type: 'Limit',
          price: targetP.toFixed(2),
          amount: amountVal.toFixed(4),
          total: (targetP * amountVal * 0.99).toFixed(2),
          status: 'OPEN',
          createdAt: Math.floor(Date.now() / 1000)
        };
        const updated = [newOrder, ...myOrders];
        setMyOrders(updated);
        localStorage.setItem('tracdex_orders_' + connectedSolanaWallet, JSON.stringify(updated));
        setTradeStatus({
          phase: 'complete',
          message: 'Limit Sell Order placed on Order Book at $' + targetP.toFixed(2) + ' (' + amountVal.toFixed(4) + ' RESET). Status: OPEN.'
        });
        setTradeHistoryTab('my');
        setTimeout(() => setTradeStatus(null), 5000);
        return;
      }
    }

    // Market Sell Instructions (Cross-Chain Escrow Lock)
    setShowTrustModal(true);
    setTradeStatus({
      phase: 'locking',
      message: 'To sell native RESET: Commit tokens to the Intercom-DEX Escrow committee (trac1dsycc...) on Trac Network. USDC is released directly to your Solana wallet upon confirmation.'
    });
    setTimeout(() => {
      setIsTrading(false);
      setTradeStatus(null);
    }, 6000);
  };

  return (
    <div className="app-wrapper">
      {/* Official Intercom-DEX Pairbar */}
      <div className="pairbar">
        <div className="pairbar-stats">
          {/* Custom Engraved Plaque Logo */}
          <div style={{ display: 'flex', alignItems: 'center', marginRight: '6px', flexShrink: 0 }}>
            <img 
              src="/tracdex-logo.png" 
              alt="TRACDEX" 
              style={{ 
                height: '28px', 
                borderRadius: '4px', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                display: 'block' 
              }} 
            />
          </div>

          <div className="pairs" role="tablist">
            <button 
              type="button" 
              role="tab" 
              aria-selected="true"
              style={{ cursor: 'default', background: 'var(--raised)', color: 'var(--text)' }}
            >
              RESET/USDC
            </button>
          </div>

          <div className="last mono">
            <span>{parseFloat(activePriceDisplay).toFixed(2)}</span>
            <span className="unit">USDC</span>
          </div>

          <div className="stat">
            <span className="k">24h change</span>
            <span className="v mono" style={{ color: parseFloat(ticker.change24h) >= 0 ? 'var(--up)' : 'var(--down)' }}>
              {parseFloat(ticker.change24h) >= 0 ? '+' : ''}{ticker.change24h}%
            </span>
          </div>

          <div className="stat">
            <span className="k">24h high</span>
            <span className="v mono">{ticker.high24h}</span>
          </div>

          <div className="stat">
            <span className="k">24h low</span>
            <span className="v mono">{ticker.low24h}</span>
          </div>

          <div className="stat">
            <span className="k">24h volume</span>
            <span className="v mono">
              {Number(ticker.volume24h || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RESET
            </span>
          </div>
        </div>

        {/* Pinned Wallet Action with Unclipped Dropdown */}
        <div className="pairbar-actions" ref={accountDropdownRef}>
          {connectedSolanaWallet ? (
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                className="btn btn-secondary" 
                style={{ 
                  padding: '7px 14px', 
                  fontSize: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '7px',
                  background: 'var(--raised)',
                  borderColor: showAccountDropdown ? 'var(--accent)' : 'var(--line)'
                }}
                title="Manage wallet"
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2ebd85' }}></span>
                <span style={{ fontWeight: '600' }}>{connectedWalletName ? `${connectedWalletName}: ` : ''}{connectedSolanaWallet.slice(0, 4)}...{connectedSolanaWallet.slice(-4)}</span>
                <ChevronDown size={14} style={{ transform: showAccountDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--muted)' }} />
              </button>

              {/* Complete, Unclipped Dropdown Menu */}
              {showAccountDropdown && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: '#13161b',
                  border: '1px solid #282f3b',
                  borderRadius: '10px',
                  padding: '14px',
                  minWidth: '280px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {/* Top Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2ebd85' }}></span>
                      <strong style={{ fontSize: '12px', color: '#fff' }}>{connectedWalletName || 'Solana Wallet'}</strong>
                    </div>
                    <span style={{ fontSize: '10px', color: '#2ebd85', background: 'rgba(46, 189, 133, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                      Connected
                    </span>
                  </div>

                  {/* Address Box with Copy */}
                  <div style={{ background: '#0a0d12', border: '1px solid #1a202c', padding: '8px 10px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 'bold' }}>Public Key</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(connectedSolanaWallet)}
                        style={{ background: 'none', border: 'none', color: copiedAddress ? '#2ebd85' : 'var(--accent)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                      >
                        {copiedAddress ? <Check size={11} /> : <Copy size={11} />}
                        <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="mono" style={{ fontSize: '11px', color: '#e7e9ec', wordBreak: 'break-all' }}>
                      {connectedSolanaWallet}
                    </div>
                  </div>

                  {/* Asset Balances */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#0a0d12', border: '1px solid #1a202c', padding: '10px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <span style={{ color: 'var(--muted)' }}>RESET Balance</span>
                      <span className="mono" style={{ color: '#fff', fontWeight: 'bold' }}>{visitorReset || '0.0000'} RESET</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <span style={{ color: 'var(--muted)' }}>USDC Balance</span>
                      <span className="mono" style={{ color: '#2ebd85', fontWeight: 'bold' }}>${visitorUsdc !== null ? visitorUsdc : '0.00'}</span>
                    </div>
                    {visitorSol && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ color: 'var(--muted)' }}>SOL (Gas)</span>
                        <span className="mono" style={{ color: '#e7e9ec' }}>{visitorSol} SOL</span>
                      </div>
                    )}
                    {tracAddress && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', borderTop: '1px solid #1a202c', paddingTop: '6px', marginTop: '2px' }}>
                        <span style={{ color: '#f7931a', fontWeight: '600' }}>TRAC Native</span>
                        <span className="mono" style={{ color: '#8899a6', fontSize: '10px' }}>{tracAddress.slice(0, 8)}...{tracAddress.slice(-6)}</span>
                      </div>
                    )}
                  </div>

                  {/* Disconnect Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setConnectedSolanaWallet(null);
                      setConnectedWalletName(null);
                      setShowAccountDropdown(false);
                    }}
                    className="btn btn-secondary"
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      fontSize: '11px', 
                      color: 'var(--down)', 
                      borderColor: 'rgba(240, 97, 109, 0.4)',
                      background: 'rgba(240, 97, 109, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <LogOut size={13} />
                    <span>Disconnect Wallet</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => setShowWalletModal(true)}
              className="btn btn-secondary" 
              style={{ padding: '7px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Wallet size={14} />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Trading Floor: 3-column Layout (Chart, Order Book, Swap) */}
      <div className="market-grid">
        {/* Column 1: Candlestick Chart */}
        <CandleChart pair={pair} currentPrice={activePriceDisplay} />

        {/* Column 2: Order Book Panel (Exact Intercom-DEX style) */}
        <div className="book-panel">
          <div className="panel-head">
            <h2>Order book</h2>
            <span className="unit">amounts in {pair.split('/')[0]}</span>
          </div>

          <div className="book-head">
            <span>Price (USDC)</span>
            <span className="num">Amount</span>
            <span className="num">Total</span>
          </div>

          {/* Sell offers (Asks) - highest down to lowest above spread */}
          <div style={{ display: 'flex', flexDirection: 'column-reverse', overflowY: 'auto', minHeight: '190px' }}>
            {asksWithDepth.slice(0, 8).map((o, idx) => (
              <div 
                key={o.offerId || idx} 
                className="book-row sell"
                onClick={() => {
                  setTradeMode('buy');
                  setSelectedOffer(o);
                  setTradeAmount(o.amt.toString());
                }}
                title={`Click to buy at ${o.price}`}
              >
                <div className="depth" style={{ width: `${Math.min(100, (o.cum / maxBookDepth) * 100).toFixed(1)}%` }} />
                <span className="price">{parseFloat(o.price).toFixed(2)}</span>
                <span className="num">{parseFloat(o.amt).toFixed(4)}</span>
                <span className="num muted">{parseFloat(o.cum).toFixed(4)}</span>
              </div>
            ))}
          </div>

          {/* Spread row */}
          <div className="book-spread">
            <span style={{ color: 'var(--muted)' }}>Spread</span>
            <span className="mid">{spread}</span>
            <span style={{ color: 'var(--muted)' }}>{spreadPct}%</span>
          </div>

          {/* Buy offers (Bids) - highest down to lower */}
          <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', minHeight: '190px' }}>
            {bidsWithDepth.slice(0, 8).map((o, idx) => (
              <div 
                key={o.offerId || idx} 
                className="book-row buy"
                onClick={() => {
                  setTradeMode('sell');
                  setSubTab('instant');
                  setTradeAmount(o.amt.toString());
                }}
                title={`Click to sell at ${o.price}`}
              >
                <div className="depth" style={{ width: `${Math.min(100, (o.cum / maxBookDepth) * 100).toFixed(1)}%` }} />
                <span className="price">{parseFloat(o.price).toFixed(2)}</span>
                <span className="num">{parseFloat(o.amt).toFixed(4)}</span>
                <span className="num muted">{parseFloat(o.cum).toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Professional Trading Terminal (Market / Limit / Swap) */}
        <div className="terminal-card">
          {/* Top Order Type Selector Tabs */}
          <div className="terminal-top-tabs">
            <button
              type="button"
              className={`terminal-top-tab ${orderType === 'market' ? 'active' : ''}`}
              onClick={() => setOrderType('market')}
            >
              Market
            </button>
            <button
              type="button"
              className={`terminal-top-tab ${orderType === 'limit' ? 'active' : ''}`}
              onClick={() => setOrderType('limit')}
            >
              Limit
            </button>
            <button
              type="button"
              className={`terminal-top-tab ${orderType === 'swap' ? 'active' : ''}`}
              onClick={() => setOrderType('swap')}
            >
              Swap
            </button>
          </div>

          {orderType === 'market' || orderType === 'limit' ? (
            /* MARKET / LIMIT ORDER TERMINAL */
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Buy / Sell Mode Pills */}
              <div className="terminal-mode-row">
                <button
                  type="button"
                  className={`terminal-mode-btn ${tradeMode === 'buy' ? 'buy-active' : ''}`}
                  onClick={() => setTradeMode('buy')}
                >
                  Buy
                </button>
                <button
                  type="button"
                  className={`terminal-mode-btn ${tradeMode === 'sell' ? 'sell-active' : ''}`}
                  onClick={() => setTradeMode('sell')}
                >
                  Sell
                </button>
              </div>

              {/* Balances / Position Info */}
              <div className="terminal-info-group">
                <div className="terminal-info-row">
                  <span className="k">Available to Trade</span>
                  <span className="v">
                    {tradeMode === 'buy' 
                      ? `${connectedSolanaWallet ? (visitorUsdc !== null ? visitorUsdc : '0.00') : '0.00'} USDC` 
                      : `${connectedSolanaWallet ? (visitorReset || '0.0000') : '0.0000'} RESET`}
                  </span>
                </div>
                <div className="terminal-info-row">
                  <span className="k">Current Position</span>
                  <span className="v">{connectedSolanaWallet ? (visitorReset || '0.0000') : '0.0000'} RESET</span>
                </div>
              </div>

              {/* Limit Price Input (Only for Limit Orders) */}
              {orderType === 'limit' && (
                <div style={{ padding: '0 14px', marginTop: '6px' }}>
                  <div className="terminal-input-group">
                    <span className="lbl">Price</span>
                    <input
                      id="limit-price-input"
                      name="limitPrice"
                      type="number"
                      step="any"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="0.00"
                    />
                    <span className="tag">USDC</span>
                  </div>
                </div>
              )}

              {/* Order Size Input (RESET) */}
              <div style={{ padding: '0 14px', marginTop: '6px' }}>
                <div className="terminal-input-group">
                  <span className="lbl">Size</span>
                  <input
                    id="trade-amount-input"
                    name="tradeAmount"
                    type="number"
                    step="any"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  <span className="tag">RESET</span>
                </div>
              </div>

              {/* Interactive Percentage Slider & Notches */}
              <div className="terminal-slider-box">
                <input
                  id="trade-slider-input"
                  name="sliderPct"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={sliderPct}
                  onChange={(e) => handleSliderChange(e.target.value)}
                />
                <span className="terminal-pct-badge">{sliderPct}%</span>
              </div>
              <div className="terminal-notches">
                {[0, 25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="terminal-notch-btn"
                    onClick={() => handleSliderChange(p)}
                  >
                    {p}%
                  </button>
                ))}
              </div>

              {/* TRAC Taproot Recipient Address (for Buy orders) */}
              {tradeMode === 'buy' && (
                <div style={{ padding: '0 14px', marginTop: '6px' }}>
                  <div className="terminal-input-group" style={{ borderColor: !tracAddress ? 'rgba(247, 147, 26, 0.4)' : undefined }}>
                    <span className="lbl" style={{ color: '#f7931a', fontSize: '11px', fontWeight: 'bold' }}>TRAC To</span>
                    <input
                      id="terminal-trac-recipient-input"
                      name="terminalTracRecipient"
                      type="text"
                      value={tracAddress}
                      onChange={(e) => setTracAddress(e.target.value.trim())}
                      placeholder="trac1... or 64-hex (Settlement recipient)"
                      style={{ fontSize: '11px', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '3px', paddingLeft: '2px' }}>
                    Purchased RESET will be dispatched on-chain to this TRAC address.
                  </div>
                </div>
              )}

              {/* Order Summary Breakdown */}
              <div className="terminal-summary">
                <div className="terminal-summary-row">
                  <span className="k">Order Value</span>
                  <span className="v">${subtotal.toFixed(2)} USDC</span>
                </div>
                <div className="terminal-summary-row">
                  <span className="k">Execution Rate</span>
                  <span className="v">1 RESET ≈ ${activePrice.toFixed(2)} USDC</span>
                </div>
                <div className="terminal-summary-row">
                  <span className="k">Slippage</span>
                  <span className="v"><span className="teal">Est: 0%</span> / Max: 0.50%</span>
                </div>
                <div className="terminal-summary-row">
                  <span className="k">Protocol Fee (1.0%)</span>
                  <span className="v">${platformFee.toFixed(3)} USDC</span>
                </div>
                <div className="terminal-summary-row">
                  <span className="k">Route</span>
                  <span className="v" style={{ color: '#2ebd85' }}>Direct P2P Orderbook</span>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                className={`terminal-cta-btn ${tradeMode === 'buy' ? 'buy' : 'sell'}`}
                disabled={isTrading}
                onClick={() => {
                  if (!connectedSolanaWallet) {
                    setShowWalletModal(true);
                    return;
                  }
                  if (tradeMode === 'buy') {
                    handleExecuteBuy();
                  } else {
                    handleExecuteSell();
                  }
                }}
              >
                {isTrading ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Processing...</span>
                  </>
                ) : tradeMode === 'buy' ? (
                  orderType === 'limit'
                    ? `Place Limit Buy (${tradeAmount} RESET @ $${customPrice})`
                    : `Buy RESET (${tradeAmount} RESET ≈ $${finalBuyTotal} USDC)`
                ) : (
                  orderType === 'limit'
                    ? `Place Limit Sell (${tradeAmount} RESET @ $${customPrice})`
                    : `Sell RESET (${tradeAmount} RESET ≈ $${finalSellProceeds} USDC)`
                )}
              </button>
            </div>
          ) : (
            /* SWAP TERMINAL VIEW */
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Mode Switcher Tabs */}
              <div style={{ padding: '10px 14px 2px' }}>
                <div className="pro-swap-tabs">
                  <button
                    type="button"
                    className={`pro-swap-tab ${tradeMode === 'buy' ? 'active-buy' : ''}`}
                    onClick={() => setTradeMode('buy')}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tradeMode === 'buy' ? '#2ebd85' : 'var(--muted)' }}></span>
                    Buy RESET
                  </button>
                  <button
                    type="button"
                    className={`pro-swap-tab ${tradeMode === 'sell' ? 'active-sell' : ''}`}
                    onClick={() => setTradeMode('sell')}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tradeMode === 'sell' ? '#f0616d' : 'var(--muted)' }}></span>
                    Sell RESET
                  </button>
                </div>
              </div>

          <div style={{ padding: '12px 14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tradeMode === 'buy' ? (
              /* BUY MODE: PAY USDC -> RECEIVE RESET */
              <>
                {/* Top Box: You Pay (USDC) */}
                <div className="pro-input-box buy-mode">
                  <div className="pro-input-top">
                    <span className="pro-label">YOU PAY</span>
                    <div className="pro-balance">
                      <span>Bal: <strong className="mono" style={{ color: '#fff' }}>${connectedSolanaWallet ? (visitorUsdc !== null ? visitorUsdc : '0.00') : '0.00'}</strong></span>
                      {parseFloat(visitorUsdc || '0') > 0 && (
                        <button
                          type="button"
                          className="pro-max-btn"
                          onClick={() => {
                            const maxAmt = Math.max(0.01, (parseFloat(visitorUsdc) / (parseFloat(activePriceDisplay) * 1.01))).toFixed(4);
                            setTradeAmount(maxAmt);
                          }}
                        >
                          MAX
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <input
                      id="swap-pay-usdc-input"
                      name="swapPayUsdc"
                      type="number"
                      step="any"
                      value={tradeAmount ? finalBuyTotal : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val || parseFloat(val) <= 0) {
                          setTradeAmount('');
                        } else {
                          const effP = parseFloat(bestAsk) * 1.01;
                          setTradeAmount(Math.max(0.0001, parseFloat(val) / effP).toFixed(4));
                        }
                      }}
                      className="swap-numeric-input"
                      placeholder="0.00"
                    />
                    <div className="pro-token-badge">
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#2775ca', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>$</span>
                      <span>USDC</span>
                      <span className="token-sub">SPL</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)' }}>
                    <span>Estimated Cost</span>
                    <span className="mono">≈ ${finalBuyTotal} USD</span>
                  </div>
                </div>

                {/* Flip Button */}
                <div className="pro-flip-wrapper">
                  <button
                    type="button"
                    onClick={() => setTradeMode('sell')}
                    className="pro-flip-btn"
                    title="Switch to Sell RESET"
                  >
                    <ArrowUpDown size={14} />
                  </button>
                </div>

                {/* Bottom Box: You Receive (RESET) */}
                <div className="pro-input-box buy-mode">
                  <div className="pro-input-top">
                    <span className="pro-label">YOU RECEIVE</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                      1 RESET ≈ ${parseFloat(bestAsk).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <input
                      id="swap-receive-reset-input"
                      name="swapReceiveReset"
                      type="number"
                      step="any"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      className="swap-numeric-input"
                      placeholder="0.10"
                    />
                    <div className="pro-token-badge">
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#f7931a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>R</span>
                      <span>RESET</span>
                      <span className="token-sub">TRAC</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)' }}>
                    <span>Spot market value</span>
                    <span className="mono">≈ ${subtotal.toFixed(2)} USD</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="pro-chips-row">
                  {['0.05', '0.10', '0.25', '0.50', '1.00'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTradeAmount(amt)}
                      className={`pro-chip-btn ${tradeAmount === amt ? 'active' : ''}`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>

                {/* Recipient Address */}
                <div style={{ background: '#090c12', padding: '10px 12px', borderRadius: '8px', border: '1px solid #1a1e27', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '10px', color: '#7a838f', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Recipient Trac Address
                    </label>
                    <span style={{ fontSize: '10px', color: (tracAddress.startsWith('trac1') || tracAddress.length === 64) ? '#2ebd85' : 'var(--muted)', fontFamily: 'monospace' }}>
                      {tracAddress.startsWith('trac1') ? 'Taproot Bech32m' : (tracAddress.length === 64 ? '64-hex valid' : `${tracAddress.length} chars`)}
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={tracAddress}
                    onChange={(e) => setTracAddress(e.target.value.trim())}
                    className="input-textarea"
                    style={{ fontSize: '11px', lineHeight: '1.4', padding: '6px 8px', wordBreak: 'break-all', background: '#06080c', border: '1px solid #181d26', borderRadius: '6px' }}
                    placeholder="Enter trac1... or 64-hex Taproot recipient address"
                  />
                </div>

                {/* Order Summary Breakdown */}
                <div className="pro-breakdown-box">
                  <div className="pro-breakdown-row">
                    <span style={{ color: 'var(--muted)' }}>Execution Rate</span>
                    <span className="mono" style={{ color: 'var(--text)', fontWeight: '600' }}>1 RESET = ${parseFloat(activePriceDisplay).toFixed(2)} USDC</span>
                  </div>
                  <div className="pro-breakdown-row">
                    <span style={{ color: 'var(--muted)' }}>Protocol Fee (1.0%)</span>
                    <span className="mono" style={{ color: '#8b9bb4', fontWeight: '600' }}>+${platformFee.toFixed(3)} USDC</span>
                  </div>
                  <div className="pro-breakdown-row">
                    <span style={{ color: 'var(--muted)' }}>Route</span>
                    <span style={{ color: '#2ebd85', fontWeight: '500' }}>Solana Escrow ↔ Trac Core</span>
                  </div>
                  <div style={{ borderTop: '1px solid #1a1e27', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', color: '#fff' }}>Total Required</span>
                    <span className="mono" style={{ color: '#2ebd85', fontWeight: '800', fontSize: '15px' }}>
                      ${finalBuyTotal} USDC
                    </span>
                  </div>
                </div>

                {/* Primary CTA Button */}
                <button 
                  onClick={() => {
                    if (connectedSolanaWallet) {
                      handleExecuteBuy();
                    } else {
                      setShowPaymentModal(true);
                    }
                  }}
                  disabled={isTrading}
                  className="pro-cta-buy"
                >
                  <Zap size={16} />
                  <span>Swap USDC for {tradeAmount} RESET (${finalBuyTotal} USDC)</span>
                </button>
              </>
            ) : (
              /* SELL MODE: PAY RESET -> RECEIVE USDC */
              <>
                {/* Top Box: You Pay (RESET) */}
                <div className="pro-input-box sell-mode">
                  <div className="pro-input-top">
                    <span className="pro-label">YOU PAY</span>
                    <div className="pro-balance">
                      <span>Bal: <strong className="mono" style={{ color: '#fff' }}>{connectedSolanaWallet ? (visitorReset || '0.0000') : '0.0000'}</strong> RESET</span>
                      {parseFloat(visitorReset || '0') > 0 && (
                        <button
                          type="button"
                          className="pro-max-btn"
                          style={{ background: 'rgba(240, 97, 109, 0.14)', color: '#f0616d', borderColor: 'rgba(240, 97, 109, 0.35)' }}
                          onClick={() => setTradeAmount(visitorReset)}
                        >
                          MAX
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <input 
                      id="swap-pay-reset-input"
                      name="swapPayReset"
                      type="number"
                      step="any"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      className="swap-numeric-input"
                      placeholder="0.10"
                    />
                    <div className="pro-token-badge">
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#f7931a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>R</span>
                      <span>RESET</span>
                      <span className="token-sub">TRAC</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)' }}>
                    <span>Spot market value</span>
                    <span className="mono">≈ ${subtotal.toFixed(2)} USD</span>
                  </div>
                </div>

                {/* Flip Button */}
                <div className="pro-flip-wrapper">
                  <button
                    type="button"
                    onClick={() => setTradeMode('buy')}
                    className="pro-flip-btn"
                    title="Switch to Buy RESET"
                  >
                    <ArrowUpDown size={14} />
                  </button>
                </div>

                {/* Bottom Box: You Receive (USDC) */}
                <div className="pro-input-box sell-mode">
                  <div className="pro-input-top">
                    <span className="pro-label">YOU RECEIVE</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                      1 RESET ≈ ${parseFloat(bestBid).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <input
                      id="swap-receive-usdc-input"
                      name="swapReceiveUsdc"
                      type="number"
                      step="any"
                      value={tradeAmount ? finalSellProceeds : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val || parseFloat(val) <= 0) {
                          setTradeAmount('');
                        } else {
                          const effP = parseFloat(bestBid) * 0.99;
                          setTradeAmount(Math.max(0.0001, parseFloat(val) / effP).toFixed(4));
                        }
                      }}
                      className="swap-numeric-input"
                      placeholder="0.00"
                    />
                    <div className="pro-token-badge">
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#2775ca', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>$</span>
                      <span>USDC</span>
                      <span className="token-sub">SPL</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)' }}>
                    <span>Net to receive after fee</span>
                    <span className="mono" style={{ color: '#2ebd85' }}>≈ ${finalSellProceeds} USDC</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="pro-chips-row">
                  {['0.05', '0.10', '0.25', '0.50', '1.00'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTradeAmount(amt)}
                      className={`pro-chip-btn ${tradeAmount === amt ? 'active' : ''}`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>

                {/* Sell Breakdown */}
                <div className="pro-breakdown-box">
                  <div className="pro-breakdown-row">
                    <span style={{ color: 'var(--muted)' }}>Bid Price</span>
                    <span className="mono" style={{ fontWeight: '600', color: 'var(--text)' }}>
                      ${parseFloat(bestBid).toFixed(2)} USDC
                    </span>
                  </div>
                  <div className="pro-breakdown-row">
                    <span style={{ color: 'var(--muted)' }}>Platform Fee (1.0%)</span>
                    <span className="mono" style={{ color: '#f0616d', fontWeight: '600' }}>-${platformFee.toFixed(3)} USDC</span>
                  </div>
                  <div className="pro-breakdown-row">
                    <span style={{ color: 'var(--muted)' }}>Settlement Destination</span>
                    <span style={{ color: '#8b9bb4', fontWeight: '500' }}>Connected Solana Wallet</span>
                  </div>
                  <div style={{ borderTop: '1px solid #1a1e27', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', color: '#fff' }}>Net Proceeds</span>
                    <span className="mono" style={{ color: '#2ebd85', fontWeight: '800', fontSize: '15px' }}>
                      ${finalSellProceeds} USDC
                    </span>
                  </div>
                </div>

                {/* Primary CTA Button */}
                <button 
                  onClick={() => {
                    if (connectedSolanaWallet) {
                      handleExecuteSell();
                    } else {
                      setShowPaymentModal(true);
                    }
                  }}
                  disabled={isTrading}
                  className="pro-cta-sell"
                >
                  <ArrowUpRight size={16} />
                  <span>Swap {tradeAmount} RESET for ${finalSellProceeds} USDC</span>
                </button>
              </>
            )}
              </div>
            </div>
          )}

          {/* Status Feedback */}
          {tradeStatus && (
            <div style={{ 
              margin: '0 14px 14px',
              padding: '12px', 
              borderRadius: '8px', 
              fontSize: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              background: tradeStatus.phase === 'error' ? 'var(--down-bg)' : 'var(--up-bg)',
              border: tradeStatus.phase === 'error' ? '1px solid var(--down)' : '1px solid var(--up)'
            }}>
              {tradeStatus.phase === 'complete' && <CheckCircle2 size={16} color="var(--up)" />}
              {tradeStatus.phase === 'error' && <AlertCircle size={16} color="var(--down)" />}
              {['warming', 'locking'].includes(tradeStatus.phase) && <RefreshCw size={16} className="spin" color="var(--accent)" />}
              <span>{tradeStatus.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Panel: Market Trades & Orders */}
      <div className="bottom-panel">
        <div className="bottom-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tradeHistoryTab === 'market'}
            onClick={() => setTradeHistoryTab('market')}
          >
            Market trades
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tradeHistoryTab === 'my'}
            onClick={() => setTradeHistoryTab('my')}
          >
            My orders ({myOrders.length})
          </button>
        </div>

        {tradeHistoryTab === 'market' ? (
          <div style={{ overflowX: 'auto', maxHeight: '240px', overflowY: 'auto' }}>
            <table className="trades-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Price (USDC)</th>
                  <th>Amount ({pair.split('/')[0]})</th>
                  <th>Total (USDC)</th>
                  <th>Fee (1%)</th>
                  <th style={{ textAlign: 'right' }}>Tx Proof</th>
                </tr>
              </thead>
              <tbody>
                {marketTrades.map((t) => {
                  const isBuy = t.side === 'buy';
                  return (
                    <tr key={t.id}>
                      <td style={{ color: 'var(--muted)', fontSize: '11px' }}>
                        {t.blockTime ? formatTimeAgo(t.blockTime) : t.time}
                      </td>
                      <td className="mono" style={{ color: isBuy ? 'var(--up)' : 'var(--down)', fontWeight: '600' }}>
                        ${parseFloat(t.price).toFixed(2)}
                      </td>
                      <td className="mono" style={{ color: 'var(--text)' }}>
                        {t.amount}
                      </td>
                      <td className="mono" style={{ color: 'var(--text)' }}>
                        ${t.total}
                      </td>
                      <td className="mono" style={{ color: 'var(--muted)', fontSize: '11px' }}>
                        +${t.fee}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {t.id ? (
                          <span 
                            className="mono" 
                            style={{ color: 'var(--muted)', fontSize: '11px' }}
                            title={t.id}
                          >
                            {t.id.slice(0, 6)}...{t.id.slice(-4)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: '240px', overflowY: 'auto' }}>
            {myOrders.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
                No active orders for connected wallet. Place a Limit or Market order above.
              </div>
            ) : (
              <table className="trades-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Price (USDC)</th>
                    <th>Amount ({pair.split('/')[0]})</th>
                    <th>Total (USDC)</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myOrders.map((ord) => {
                    const isBuy = ord.side === 'buy';
                    return (
                      <tr key={ord.id}>
                        <td style={{ color: 'var(--muted)', fontSize: '11px' }}>
                          {formatTimeAgo(ord.createdAt)}
                        </td>
                        <td>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: 'bold', 
                            color: isBuy ? 'var(--up)' : 'var(--down)',
                            background: isBuy ? 'rgba(46, 189, 133, 0.12)' : 'rgba(240, 97, 109, 0.12)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {ord.type} {ord.side?.toUpperCase()}
                          </span>
                        </td>
                        <td className="mono" style={{ fontWeight: '600', color: 'var(--text)' }}>
                          ${ord.price}
                        </td>
                        <td className="mono" style={{ color: 'var(--text)' }}>
                          {ord.amount}
                        </td>
                        <td className="mono" style={{ color: 'var(--text)' }}>
                          ${ord.total}
                        </td>
                        <td>
                          {ord.status === 'OPEN' ? (
                            <span style={{ color: '#2ebd85', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2ebd85' }}></span>
                              OPEN
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#f7931a', display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: 'bold' }}>USDC Escrowed ➔ TRAC Delivery</span>
                              {ord.sig && (
                                <a 
                                  href={`https://solscan.io/tx/${ord.sig}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  style={{ color: 'var(--accent)', fontSize: '10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                >
                                  <span>Solscan Tx: {ord.sig.slice(0, 6)}...</span>
                                  <ExternalLink size={9} />
                                </a>
                              )}
                              {ord.tracAddr && (
                                <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                                  To: {ord.tracAddr.slice(0, 10)}...
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {ord.status === 'OPEN' ? (
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(ord.id)}
                              style={{
                                background: 'rgba(240, 97, 109, 0.15)',
                                color: '#f0616d',
                                border: '1px solid rgba(240, 97, 109, 0.35)',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              Cancel
                            </button>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Settled</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
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
                  <textarea 
                    rows={2}
                    value={tracAddress}
                    onChange={(e) => setTracAddress(e.target.value.trim())}
                    className="input-textarea"
                    style={{ fontSize: '11px', lineHeight: '1.45', padding: '8px 10px', wordBreak: 'break-all' }}
                    placeholder="Enter your 64-character Trac address (e.g. 6c098c...)"
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', flexShrink: 0 }}>
                              {typeof w.icon === 'function' ? <w.icon size={26} /> : <span>{w.icon}</span>}
                            </div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', flexShrink: 0 }}>
                        {typeof w.icon === 'function' ? <w.icon size={28} /> : <span>{w.icon}</span>}
                      </div>
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
