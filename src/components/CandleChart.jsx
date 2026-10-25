import React, { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, CrosshairMode, LineStyle } from 'lightweight-charts';
import marketSnapshot from '../data/market-snapshot.json';

// Authentic supported intervals on reset.much.fun DEX
export const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D'];

const SECONDS = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1D': 86400,
};

// Pure on-chain candle aggregator without artificial gap distortion
function aggregateRawCandles(baseCandles, interval) {
  if (!baseCandles || !baseCandles.length) return [];
  const sec = SECONDS[interval] || 900;

  const buckets = new Map();
  for (const c of baseCandles) {
    const t = Number(c.t);
    const bTime = t - (((t % sec) + sec) % sec);
    if (!buckets.has(bTime)) buckets.set(bTime, []);
    buckets.get(bTime).push(c);
  }

  const aggregated = [];
  for (const [t, items] of buckets.entries()) {
    items.sort((a, b) => Number(a.t) - Number(b.t));
    const o = parseFloat(items[0].o);
    const cl = parseFloat(items[items.length - 1].c);
    const h = Math.max(...items.map((x) => parseFloat(x.h)));
    const l = Math.min(...items.map((x) => parseFloat(x.l)));
    const vol = items.reduce((acc, x) => acc + parseFloat(x.v?.text || x.v || '0'), 0);
    aggregated.push({
      time: t,
      open: o,
      high: h,
      low: l,
      close: cl,
      volume: Number(vol.toFixed(4)),
    });
  }

  aggregated.sort((a, b) => a.time - b.time);
  return aggregated;
}

export default function CandleChart({ pair = 'RESET/USDC', currentPrice = '40.00' }) {
  const [interval, setIntervalVal] = useState('15m');
  const [activeCandle, setActiveCandle] = useState(null);
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const seriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const latestCandleRef = useRef(null);

  // Initialize TradingView Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#13161b' },
        textColor: '#7a838f',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1a1e25', style: LineStyle.Solid },
        horzLines: { color: '#1a1e25', style: LineStyle.Solid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#7a838f',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1a1e24',
        },
        horzLine: {
          color: '#7a838f',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1a1e24',
        },
      },
      rightPriceScale: {
        borderColor: '#252a33',
        entireTextOnly: false,
        autoScale: true,
        scaleMargins: { top: 0.1, bottom: 0.22 },
      },
      timeScale: {
        borderColor: '#252a33',
        rightOffset: 8,
        barSpacing: 14,
        minBarSpacing: 3,
        fixLeftEdge: false,
        fixRightEdge: false,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: { time: true, price: true },
        mouseWheel: true,
        pinch: true,
      },
      kineticScroll: { touch: true, mouse: true },
    });

    // Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#2ebd85',
      downColor: '#f0616d',
      borderUpColor: '#2ebd85',
      borderDownColor: '#f0616d',
      wickUpColor: '#2ebd85',
      wickDownColor: '#f0616d',
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    // Add Volume Series with dedicated scale
    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    volSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
      visible: false,
    });

    // Crosshair hover listener
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData || !candleSeries) {
        if (latestCandleRef.current) {
          setActiveCandle(latestCandleRef.current);
        }
        return;
      }
      const cData = param.seriesData.get(candleSeries);
      const vData = volSeries ? param.seriesData.get(volSeries) : null;
      if (cData) {
        setActiveCandle({
          time: param.time,
          open: cData.open,
          high: cData.high,
          low: cData.low,
          close: cData.close,
          volume: vData?.value || 0,
        });
      }
    });

    chartInstanceRef.current = chart;
    seriesRef.current = candleSeries;
    volumeSeriesRef.current = volSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Fetch real candles for the selected interval & load into chart
  useEffect(() => {
    if (!seriesRef.current || !chartInstanceRef.current) return;

    let isCancelled = false;

    async function loadCandles() {
      let rawBars = [];

      // 1. Attempt to fetch real interval candles from live backend
      try {
        const res = await fetch(`/api/live-candles?pair=RESET/USDC&interval=${interval}`);
        if (res.ok) {
          const json = await res.json();
          if (json.candles && json.candles.length) {
            rawBars = json.candles.map(c => ({
              time: Number(c.t),
              open: parseFloat(c.o),
              high: parseFloat(c.h),
              low: parseFloat(c.l),
              close: parseFloat(c.c),
              volume: parseFloat(c.v || '0')
            }));
          }
        }
      } catch (e) {
        // Fallback to static snapshot below
      }

      // 2. Fallback to snapshot if live fetch returned empty
      if (!rawBars.length) {
        const base = marketSnapshot?.candles || [];
        rawBars = aggregateRawCandles(base, interval);
      }

      if (isCancelled || !rawBars.length) return;

      // Ensure monotonic unique timestamps
      const uniqueBars = [];
      const seenTimes = new Set();
      for (const b of rawBars) {
        if (!seenTimes.has(b.time)) {
          seenTimes.add(b.time);
          uniqueBars.push(b);
        }
      }
      uniqueBars.sort((a, b) => a.time - b.time);

      const candlePoints = uniqueBars.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      const volPoints = uniqueBars.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(46, 189, 133, 0.5)' : 'rgba(240, 97, 109, 0.5)',
      }));

      seriesRef.current.setData(candlePoints);
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(volPoints);
      }

      // Smoothly focus on the most recent 50 bars
      const count = candlePoints.length;
      const visibleCount = Math.min(count, 50);
      chartInstanceRef.current.timeScale().setVisibleLogicalRange({
        from: Math.max(0, count - visibleCount),
        to: count + 4,
      });

      const latest = uniqueBars[uniqueBars.length - 1];
      latestCandleRef.current = latest;
      setActiveCandle(latest);
    }

    loadCandles();

    return () => {
      isCancelled = true;
    };
  }, [pair, interval]);

  // Update only the latest live bar smoothly when price changes without re-rendering the whole chart
  useEffect(() => {
    if (!seriesRef.current || !latestCandleRef.current) return;
    const liveP = parseFloat(currentPrice);
    if (!liveP || isNaN(liveP)) return;
    const last = { ...latestCandleRef.current };
    last.close = liveP;
    if (liveP > last.high) last.high = liveP;
    if (liveP < last.low) last.low = liveP;

    seriesRef.current.update({
      time: last.time,
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
    });
    latestCandleRef.current = last;
  }, [currentPrice]);

  // Derive real default candle for display
  const realDefault = (() => {
    const c = marketSnapshot?.candles;
    if (c && c.length) {
      const l = c[c.length - 1];
      return { open: parseFloat(l.o), high: parseFloat(l.h), low: parseFloat(l.l), close: parseFloat(l.c), volume: parseFloat(l.v || 0) };
    }
    return { open: 40.00, high: 40.00, low: 40.00, close: 40.00, volume: 0.8 };
  })();

  const active = activeCandle || latestCandleRef.current || realDefault;
  const move = active.open ? (active.close - active.open) / active.open : 0;
  const movePct = (move * 100).toFixed(2) + '%';
  const isUp = move >= 0;

  return (
    <div className="chart-panel">
      {/* Timeframes Bar */}
      <div className="chart-bar">
        <div className="tfs" role="group" aria-label="Timeframe">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              className="tf"
              aria-pressed={String(interval === tf)}
              onClick={() => setIntervalVal(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Body with Absolute Readout */}
      <div className="chart-body" style={{ flex: 1, position: 'relative', minHeight: '440px' }}>
        <div ref={chartContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />

        {/* OHLC Readout */}
        <div className="readout">
          <span style={{ color: 'var(--muted)' }}>O</span>
          <span style={{ color: isUp ? 'var(--up)' : 'var(--down)' }}>{active.open?.toFixed(2)}</span>
          <span style={{ color: 'var(--muted)' }}>H</span>
          <span style={{ color: isUp ? 'var(--up)' : 'var(--down)' }}>{active.high?.toFixed(2)}</span>
          <span style={{ color: 'var(--muted)' }}>L</span>
          <span style={{ color: isUp ? 'var(--up)' : 'var(--down)' }}>{active.low?.toFixed(2)}</span>
          <span style={{ color: 'var(--muted)' }}>C</span>
          <span style={{ color: isUp ? 'var(--up)' : 'var(--down)' }}>{active.close?.toFixed(2)}</span>
          <span style={{ color: isUp ? 'var(--up)' : 'var(--down)', fontWeight: '600' }}>{movePct}</span>
          <span style={{ color: 'var(--muted)', marginLeft: '4px' }}>Vol</span>
          <span style={{ color: 'var(--text)' }}>{typeof active.volume === 'number' ? active.volume.toFixed(2) : active.volume}</span>
        </div>
      </div>

      {/* Credit Watermark */}
      <p className="credit">
        Chart by <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">TradingView</a> Lightweight Charts™
      </p>
    </div>
  );
}
