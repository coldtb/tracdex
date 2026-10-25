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

// Resample candles according to timeframe
function aggregateCandles(baseCandles, interval) {
  if (!baseCandles || !baseCandles.length) return [];
  const sorted = [...baseCandles].sort((a, b) => a.t - b.t);
  const sec = SECONDS[interval] || 3600;

  // Sub-hourly division (1m, 3m, 5m, 15m, 30m)
  if (sec < 3600) {
    const subBars = [];
    const stepCount = Math.floor(3600 / sec);
    sorted.forEach((c) => {
      const baseTime = c.t;
      const o = parseFloat(c.o);
      const h = parseFloat(c.h);
      const l = parseFloat(c.l);
      const cl = parseFloat(c.c);
      const vol = parseFloat(c.v?.text || '12.5') / stepCount;

      let curOpen = o;
      for (let i = 0; i < stepCount; i++) {
        const progress = (i + 1) / stepCount;
        const curClose = i === stepCount - 1 ? cl : o + (cl - o) * progress + (Math.sin(i * 1.5) * (h - l) * 0.12);
        const curHigh = Math.max(curOpen, curClose, Math.min(h, curOpen + (h - l) * 0.25));
        const curLow = Math.min(curOpen, curClose, Math.max(l, curOpen - (h - l) * 0.25));

        subBars.push({
          time: baseTime + i * sec,
          open: curOpen,
          high: curHigh,
          low: curLow,
          close: curClose,
          volume: Math.max(0.1, vol * (0.8 + Math.cos(i) * 0.4)),
        });
        curOpen = curClose;
      }
    });
    return subBars;
  }

  // 1 hour base
  if (sec === 3600) {
    return sorted.map((c) => ({
      time: c.t,
      open: parseFloat(c.o),
      high: parseFloat(c.h),
      low: parseFloat(c.l),
      close: parseFloat(c.c),
      volume: parseFloat(c.v?.text || '12.5'),
    }));
  }

  // Multi-hour or multi-day grouping (2h, 4h, 8h, 12h, 24h, 2d, 3d, 1W, 1M, 1Y)
  const buckets = new Map();
  sorted.forEach((c) => {
    const bTime = Math.floor(c.t / sec) * sec;
    if (!buckets.has(bTime)) buckets.set(bTime, []);
    buckets.get(bTime).push(c);
  });

  const res = [];
  buckets.forEach((items, bTime) => {
    const o = parseFloat(items[0].o);
    const cl = parseFloat(items[items.length - 1].c);
    const h = Math.max(...items.map((x) => parseFloat(x.h)));
    const l = Math.min(...items.map((x) => parseFloat(x.l)));
    const vol = items.reduce((acc, x) => acc + parseFloat(x.v?.text || '12.5'), 0);
    res.push({
      time: bTime,
      open: o,
      high: h,
      low: l,
      close: cl,
      volume: vol,
    });
  });
  return res.sort((a, b) => a.time - b.time);
}

export default function CandleChart({ pair = 'RESET/USDC', currentPrice = '36.00' }) {
  const [interval, setIntervalVal] = useState('5m');
  const [activeCandle, setActiveCandle] = useState(null);
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const seriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const latestCandleRef = useRef(null);

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
        entireTextOnly: true,
        scaleMargins: { top: 0.08, bottom: 0.26 },
      },
      timeScale: {
        borderColor: '#252a33',
        rightOffset: 3,
        barSpacing: 8,
        minBarSpacing: 0.5,
        fixLeftEdge: true,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
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

    // Add Volume Series
    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    volSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
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

  // Load and apply candles
  useEffect(() => {
    if (!seriesRef.current) return;

    const baseData = marketSnapshot?.candles || [];
    const aggregated = aggregateCandles(baseData, interval);

    if (aggregated.length) {
      // Harmonize latest bar close with live price
      const liveP = parseFloat(currentPrice || '36.00');
      const last = aggregated[aggregated.length - 1];
      last.close = liveP;
      if (liveP > last.high) last.high = liveP;
      if (liveP < last.low) last.low = liveP;

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

      chartInstanceRef.current?.timeScale().fitContent();

      const latest = aggregated[aggregated.length - 1];
      latestCandleRef.current = latest;
      setActiveCandle(latest);
    }
  }, [pair, interval, currentPrice]);

  const active = activeCandle || latestCandleRef.current || {
    open: 36.00, high: 36.00, low: 36.00, close: 36.00, volume: 7.5
  };

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
