import React, { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, CrosshairMode, LineStyle } from 'lightweight-charts';
import marketSnapshot from '../data/market-snapshot.json';

export const TIMEFRAMES = [
  '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '8h', '12h', '24h', '2d', '3d', '1W', '1M', '1Y'
];

const SECONDS = {
  '1m': 60, '3m': 180, '5m': 300, '15m': 900, '30m': 1800,
  '1h': 3600, '2h': 7200, '4h': 14400, '8h': 28800, '12h': 43200,
  '24h': 86400, '2d': 172800, '3d': 259200, '1W': 604800, '1M': 2592000, '1Y': 31536000
};

const mod = (v, n) => ((v % n) + n) % n;
const bucketStart = (s, i) => s - mod(s, SECONDS[i] || 900);
const nextBucket = (t, i, step = 1) => t + step * (SECONDS[i] || 900);

// Dense gap-filled authentic on-chain candle series (official intercom-dex algorithm)
function aggregateCandles(baseCandles, interval) {
  if (!baseCandles || !baseCandles.length) return [];
  const sec = SECONDS[interval] || 900;

  // Aggregate into requested bucket interval
  const buckets = new Map();
  for (const c of baseCandles) {
    const bTime = bucketStart(c.t, interval);
    if (!buckets.has(bTime)) buckets.set(bTime, []);
    buckets.get(bTime).push(c);
  }

  const aggregated = [];
  for (const [t, items] of buckets.entries()) {
    items.sort((a, b) => a.t - b.t);
    const o = parseFloat(items[0].o);
    const cl = parseFloat(items[items.length - 1].c);
    const h = Math.max(...items.map((x) => parseFloat(x.h)));
    const l = Math.min(...items.map((x) => parseFloat(x.l)));
    const vol = items.reduce((acc, x) => acc + parseFloat(x.v?.text || x.v || '0'), 0);
    aggregated.push({ t, o, h, l, c: cl, v: vol });
  }
  aggregated.sort((a, b) => a.t - b.t);

  // For small intervals (1m-15m): only fill gaps up to 6 hours back from last candle
  // For larger intervals: fill entire range (gaps are natural and rare)
  if (!aggregated.length) return [];
  const byT = new Map(aggregated.map(c => [c.t, c]));

  const lastTs = aggregated[aggregated.length - 1].t;
  const secPerBar = SECONDS[interval] || 900;
  // For fine-grained intervals, only show last 200 real+gap bars max to avoid chart clutter
  const maxBarsBack = Math.min(aggregated.length + 200, 400);
  const first = Math.max(aggregated[0].t, lastTs - maxBarsBack * secPerBar);

  let close = (() => {
    // Find the close price at or before `first`
    const beforeFirst = aggregated.filter(c => c.t <= first);
    return beforeFirst.length ? parseFloat(beforeFirst[beforeFirst.length - 1].c) : parseFloat(aggregated[0].o);
  })();

  const out = [];
  for (let t = first; t <= lastTs; t = nextBucket(t, interval)) {
    const c = byT.get(t);
    if (c) {
      out.push({
        time: t,
        open: parseFloat(c.o),
        high: parseFloat(c.h),
        low: parseFloat(c.l),
        close: parseFloat(c.c),
        volume: Number(parseFloat(c.v || 0).toFixed(2))
      });
      close = parseFloat(c.c);
    } else {
      out.push({
        time: t,
        open: close,
        high: close,
        low: close,
        close: close,
        volume: 0
      });
    }
  }
  return out;
}

export default function CandleChart({ pair = 'RESET/USDC', currentPrice = '36.00' }) {
  const [interval, setIntervalVal] = useState('15m');
  const [activeCandle, setActiveCandle] = useState(null);
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const seriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const latestCandleRef = useRef(null);
  const lastTfRef = useRef(null);

  // Initialize TradingView Lightweight Chart with intercom-dex color palette
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
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor: '#252a33',
        rightOffset: 6,
        barSpacing: 8,
        minBarSpacing: 2,
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
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true,
      },
      kineticScroll: {
        touch: true,
        mouse: true,
      },
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

    // Add Volume Series — separate overlay scale so it never contaminates price axis
    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
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

  // Load and apply candles when interval or pair changes
  useEffect(() => {
    if (!seriesRef.current || !chartInstanceRef.current) return;

    const baseData = marketSnapshot?.candles || [];
    // Filter only candles with actual trading activity (non-flat gap-fills) for sparse intervals
    const aggregated = aggregateCandles(baseData, interval);

    if (!aggregated.length) return;

    const candlePoints = aggregated.map((c) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volPoints = aggregated.map((c) => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(46, 189, 133, 0.45)' : 'rgba(240, 97, 109, 0.45)',
    }));

    seriesRef.current.setData(candlePoints);
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(volPoints);
    }

    const count = candlePoints.length;

    // Defer view positioning to AFTER TradingView finishes rendering the new data
    // Without this delay, fitContent() inside setData() overrides our range
    requestAnimationFrame(() => {
      if (!chartInstanceRef.current) return;
      const ts = chartInstanceRef.current.timeScale();

      // Determine how many non-gap bars exist to decide visible window
      const activeBars = aggregated.filter(c => c.volume > 0).length;
      const targetBars = Math.min(Math.max(activeBars, 40), 80);
      const visibleBars = Math.min(count, targetBars);

      ts.setVisibleLogicalRange({
        from: Math.max(0, count - visibleBars),
        to: count + 3,
      });
    });

    lastTfRef.current = interval;

    const latest = aggregated[aggregated.length - 1];
    latestCandleRef.current = latest;
    setActiveCandle(latest);
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
    return { open: 35.00, high: 35.50, low: 34.80, close: 35.00, volume: 7.0 };
  })();

  const active = activeCandle || latestCandleRef.current || realDefault;

  const move = active.open ? (active.close - active.open) / active.open : 0;
  const movePct = (move * 100).toFixed(2) + '%';
  const isUp = move >= 0;

  return (
    <div className="chart-panel">
      {/* 16 Timeframes Bar */}
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
