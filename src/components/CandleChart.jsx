import React, { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, CrosshairMode } from 'lightweight-charts';
import { BarChart3, Clock, TrendingUp, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import marketSnapshot from '../data/market-snapshot.json';

export default function CandleChart({ pair = 'RESET/USDC' }) {
  const [interval, setIntervalVal] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [activeCandle, setActiveCandle] = useState(null);
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const seriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);

  // Initialize TradingView Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#101522' },
        textColor: '#94a3b8',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1a2234' },
        horzLines: { color: '#1a2234' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#6366f1',
          width: 1,
          style: 3,
          labelBackgroundColor: '#6366f1',
        },
        horzLine: {
          color: '#6366f1',
          width: 1,
          style: 3,
          labelBackgroundColor: '#6366f1',
        },
      },
      rightPriceScale: {
        borderColor: '#1e2638',
        autoScale: true,
      },
      timeScale: {
        borderColor: '#1e2638',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    // Add Candlestick Series (lightweight-charts v5 addSeries)
    let candleSeries;
    if (typeof chart.addSeries === 'function') {
      candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#f43f5e',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#f43f5e',
      });
    } else if (typeof chart.addCandlestickSeries === 'function') {
      candleSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#f43f5e',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#f43f5e',
      });
    }

    // Add Volume Series
    let volSeries;
    if (typeof chart.addSeries === 'function') {
      volSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });
    } else if (typeof chart.addHistogramSeries === 'function') {
      volSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });
    }

    if (volSeries) {
      volSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.82,
          bottom: 0,
        },
      });
    }

    // Crosshair hover listener
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData || !candleSeries) {
        return;
      }
      const data = param.seriesData.get(candleSeries);
      if (data) {
        setActiveCandle({
          time: param.time,
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
        });
      }
    });

    chartInstanceRef.current = chart;
    seriesRef.current = candleSeries;
    volumeSeriesRef.current = volSeries;

    // Responsive Resize Observer
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight || 340,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Fetch Candle Data from DEX (with snapshot fallback)
  const loadCandles = async () => {
    try {
      setLoading(true);
      let rawCandles = [];
      try {
        const res = await fetch(`/api/candles?pair=${encodeURIComponent(pair)}&interval=${interval}&limit=100`);
        if (res.ok) {
          const json = await res.json();
          if (json.candles && Array.isArray(json.candles) && json.candles.length) {
            rawCandles = json.candles;
          }
        }
      } catch (e) {
        // Fallback for public static deployment
      }

      // If API unavailable, load real market snapshot
      if (!rawCandles.length && marketSnapshot.candles && marketSnapshot.candles.length) {
        rawCandles = marketSnapshot.candles;
      }

      if (rawCandles.length && seriesRef.current) {
        // Format for TradingView (time in UNIX seconds, sorted ascending)
        const formatted = rawCandles.map((c) => ({
          time: c.t,
          open: parseFloat(c.o),
          high: parseFloat(c.h),
          low: parseFloat(c.l),
          close: parseFloat(c.c),
        })).sort((a, b) => a.time - b.time);

        // Unique times
        const uniqueCandles = [];
        const seenTimes = new Set();
        for (const item of formatted) {
          if (!seenTimes.has(item.time)) {
            seenTimes.add(item.time);
            uniqueCandles.push(item);
          }
        }

        seriesRef.current.setData(uniqueCandles);

        // Volumes
        if (volumeSeriesRef.current) {
          const volData = rawCandles.map((c) => {
            const val = parseFloat(c.v?.text || '12.5');
            const isUp = parseFloat(c.c) >= parseFloat(c.o);
            return {
              time: c.t,
              value: val,
              color: isUp ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)',
            };
          }).filter((v, idx, arr) => arr.findIndex(x => x.time === v.time) === idx)
            .sort((a, b) => a.time - b.time);

          volumeSeriesRef.current.setData(volData);
        }

        if (uniqueCandles.length) {
          const last = uniqueCandles[uniqueCandles.length - 1];
          setActiveCandle(last);
        }
      }
    } catch (e) {
      console.warn('Error loading candles:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandles();
    const intervalTimer = setInterval(loadCandles, 10000);
    return () => clearInterval(intervalTimer);
  }, [pair, interval]);

  return (
    <div className="card" style={{ flex: 1, minHeight: '420px', display: 'flex', flexDirection: 'column' }}>
      {/* Header Controls */}
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: '800', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} style={{ color: 'var(--color-solana)' }} />
            {pair} TradingView K-Line
          </span>
          <span className="badge" style={{ color: 'var(--color-green)' }}>
            <span className="badge-dot"></span> Live Interactive
          </span>
        </div>

        {/* Timeframe Selector & Actions */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {['15m', '1h', '4h', '1d'].map((tf) => (
            <button
              key={tf}
              onClick={() => setIntervalVal(tf)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                border: 'none',
                background: interval === tf ? 'var(--color-accent)' : 'var(--bg-main)',
                color: interval === tf ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {tf.toUpperCase()}
            </button>
          ))}
          <button
            onClick={loadCandles}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', marginLeft: '6px' }}
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Dynamic Hover Tooltip Bar */}
      {activeCandle && (
        <div
          style={{
            padding: '8px 18px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '18px',
            fontSize: '12px',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <div>
            <span style={{ color: 'var(--text-dim)' }}>Time: </span>
            <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>
              {new Date(activeCandle.time * 1000).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)' }}>Open: </span>
            <span style={{ color: activeCandle.close >= activeCandle.open ? 'var(--color-green)' : 'var(--color-red)', fontWeight: 'bold' }}>
              ${activeCandle.open?.toFixed(2)}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)' }}>High: </span>
            <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>
              ${activeCandle.high?.toFixed(2)}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)' }}>Low: </span>
            <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>
              ${activeCandle.low?.toFixed(2)}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)' }}>Close: </span>
            <span style={{ color: activeCandle.close >= activeCandle.open ? 'var(--color-green)' : 'var(--color-red)', fontWeight: 'bold' }}>
              ${activeCandle.close?.toFixed(2)}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)' }}>Change: </span>
            <span
              style={{
                color: activeCandle.close >= activeCandle.open ? 'var(--color-green)' : 'var(--color-red)',
                fontWeight: 'bold',
              }}
            >
              {activeCandle.close >= activeCandle.open ? '+' : ''}
              {(((activeCandle.close - activeCandle.open) / (activeCandle.open || 1)) * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* TradingView Real Canvas Area */}
      <div
        ref={chartContainerRef}
        style={{
          flex: 1,
          width: '100%',
          minHeight: '340px',
          position: 'relative',
        }}
      />
    </div>
  );
}
