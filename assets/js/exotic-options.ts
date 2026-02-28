import { blackScholes, simulatePath } from './lib/finance';

function main() {
  const pathsCanvas = document.getElementById('exotic-paths-canvas') as HTMLCanvasElement;
  const convCanvas = document.getElementById('exotic-conv-canvas') as HTMLCanvasElement;
  if (!pathsCanvas || !convCanvas) return;

  const pathsCtx = pathsCanvas.getContext('2d')!;
  const convCtx = convCanvas.getContext('2d')!;
  const W = pathsCanvas.width, H = pathsCanvas.height;

  let paths: number[][] = [], running = false, animId = 0;
  let asianPayoffs: number[] = [], barrierPayoffs: number[] = [], lookbackPayoffs: number[] = [];

  const els = {
    spot: document.getElementById('exotic-spot') as HTMLInputElement,
    strike: document.getElementById('exotic-strike') as HTMLInputElement,
    barrierInput: document.getElementById('exotic-barrier-input') as HTMLInputElement,
    vol: document.getElementById('exotic-vol') as HTMLInputElement,
    maturity: document.getElementById('exotic-maturity') as HTMLInputElement,
    vanilla: document.getElementById('exotic-vanilla')!,
    asian: document.getElementById('exotic-asian')!,
    barrier: document.getElementById('exotic-barrier')!,
    lookback: document.getElementById('exotic-lookback')!,
    count: document.getElementById('exotic-count')!,
    run: document.getElementById('exotic-run')!,
    indicator: document.getElementById('exotic-indicator'),
  };

  interface Params { S0: number; K: number; B: number; sigma: number; T: number; r: number; steps: number; }

  function getParams(): Params {
    return {
      S0: parseFloat(els.spot.value),
      K: parseFloat(els.strike.value),
      B: parseFloat(els.barrierInput.value),
      sigma: parseFloat(els.vol.value),
      T: parseFloat(els.maturity.value),
      r: 0.05,
      steps: 100,
    };
  }

  function drawPaths() {
    const p = getParams();
    pathsCtx.fillStyle = '#111';
    pathsCtx.fillRect(0, 0, W, H);

    if (paths.length === 0) return;

    let minS = Infinity, maxS = -Infinity;
    for (const path of paths) {
      for (const s of path) {
        if (s < minS) minS = s;
        if (s > maxS) maxS = s;
      }
    }
    maxS = Math.max(maxS, p.B * 1.05);
    minS *= 0.95;
    maxS *= 1.05;

    const barrierY = H - ((p.B - minS) / (maxS - minS)) * H;
    pathsCtx.strokeStyle = 'rgba(232,64,87,0.5)';
    pathsCtx.setLineDash([4, 4]);
    pathsCtx.beginPath();
    pathsCtx.moveTo(0, barrierY);
    pathsCtx.lineTo(W, barrierY);
    pathsCtx.stroke();
    pathsCtx.setLineDash([]);
    pathsCtx.fillStyle = 'rgba(232,64,87,0.7)';
    pathsCtx.font = '10px JetBrains Mono';
    pathsCtx.fillText('B=' + p.B, 4, barrierY - 4);

    const strikeY = H - ((p.K - minS) / (maxS - minS)) * H;
    pathsCtx.strokeStyle = '#333';
    pathsCtx.setLineDash([4, 4]);
    pathsCtx.beginPath();
    pathsCtx.moveTo(0, strikeY);
    pathsCtx.lineTo(W, strikeY);
    pathsCtx.stroke();
    pathsCtx.setLineDash([]);
    pathsCtx.fillStyle = '#555';
    pathsCtx.fillText('K=' + p.K, 4, strikeY - 4);

    for (const path of paths) {
      const maxPath = Math.max(...path);
      const knockedOut = maxPath >= p.B;
      pathsCtx.strokeStyle = knockedOut ? 'rgba(232,64,87,0.1)' : 'rgba(0,212,170,0.12)';
      pathsCtx.beginPath();
      for (let i = 0; i < path.length; i++) {
        const x = (i / (path.length - 1)) * W;
        const y = H - ((path[i] - minS) / (maxS - minS)) * H;
        if (i === 0) pathsCtx.moveTo(x, y);
        else pathsCtx.lineTo(x, y);
      }
      pathsCtx.stroke();
    }
  }

  function drawConvergence() {
    convCtx.fillStyle = '#111';
    convCtx.fillRect(0, 0, W, H);

    const totalPaths = asianPayoffs.length;
    if (totalPaths < 10) return;

    const p = getParams();
    const discount = Math.exp(-p.r * p.T);

    const step = Math.max(1, Math.floor(totalPaths / 200));
    const series = { asian: [] as number[], barrier: [] as number[], lookback: [] as number[] };
    let aSum = 0, bSum = 0, lSum = 0;

    for (let i = 0; i < totalPaths; i++) {
      aSum += asianPayoffs[i];
      bSum += barrierPayoffs[i];
      lSum += lookbackPayoffs[i];
      if ((i + 1) % step === 0 || i === totalPaths - 1) {
        const n = i + 1;
        series.asian.push(discount * aSum / n);
        series.barrier.push(discount * bSum / n);
        series.lookback.push(discount * lSum / n);
      }
    }

    const allVals = [...series.asian, ...series.barrier, ...series.lookback];
    let minV = Math.min(...allVals);
    let maxV = Math.max(...allVals);
    const pad = (maxV - minV) * 0.15 || 1;
    minV -= pad;
    maxV += pad;

    const plotPad = { top: 15, bottom: 25, left: 45, right: 10 };
    const plotW = W - plotPad.left - plotPad.right;
    const plotH = H - plotPad.top - plotPad.bottom;

    convCtx.strokeStyle = '#333';
    convCtx.beginPath();
    convCtx.moveTo(plotPad.left, plotPad.top);
    convCtx.lineTo(plotPad.left, plotPad.top + plotH);
    convCtx.lineTo(plotPad.left + plotW, plotPad.top + plotH);
    convCtx.stroke();

    convCtx.fillStyle = '#555';
    convCtx.font = '9px JetBrains Mono';
    convCtx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const v = minV + (maxV - minV) * (i / 4);
      const y = plotPad.top + plotH - (i / 4) * plotH;
      convCtx.fillText('$' + v.toFixed(1), plotPad.left - 4, y + 3);
    }

    function drawLine(data: number[], color: string) {
      if (data.length < 2) return;
      convCtx.beginPath();
      convCtx.strokeStyle = color;
      convCtx.lineWidth = 1.5;
      for (let i = 0; i < data.length; i++) {
        const x = plotPad.left + (i / (data.length - 1)) * plotW;
        const y = plotPad.top + plotH - ((data[i] - minV) / (maxV - minV)) * plotH;
        if (i === 0) convCtx.moveTo(x, y);
        else convCtx.lineTo(x, y);
      }
      convCtx.stroke();
      convCtx.lineWidth = 1;
    }

    drawLine(series.asian, '#00d4aa');
    drawLine(series.barrier, '#e84057');
    drawLine(series.lookback, '#f0c040');

    convCtx.font = '9px JetBrains Mono';
    convCtx.textAlign = 'left';
    const lx = plotPad.left + 8;
    const ly = plotPad.top + 12;
    const legends: [string, string][] = [['asian', '#00d4aa'], ['barrier', '#e84057'], ['lookback', '#f0c040']];
    legends.forEach(([label, color], i) => {
      convCtx.fillStyle = color;
      convCtx.fillRect(lx, ly + i * 14 - 6, 8, 8);
      convCtx.fillStyle = '#888';
      convCtx.fillText(label, lx + 12, ly + i * 14);
    });
  }

  function updatePrices() {
    const p = getParams();
    const n = asianPayoffs.length;
    if (n === 0) return;

    const discount = Math.exp(-p.r * p.T);
    const aPrice = discount * asianPayoffs.reduce((a, b) => a + b) / n;
    const bPrice = discount * barrierPayoffs.reduce((a, b) => a + b) / n;
    const lPrice = discount * lookbackPayoffs.reduce((a, b) => a + b) / n;
    const vPrice = blackScholes(p.S0, p.K, p.T, p.r, p.sigma);

    els.vanilla.textContent = '$' + vPrice.toFixed(2);
    els.asian.textContent = '$' + aPrice.toFixed(2);
    els.barrier.textContent = '$' + bPrice.toFixed(2);
    els.lookback.textContent = '$' + lPrice.toFixed(2);
    els.count.textContent = n.toLocaleString();
  }

  function addBatch(batchSize: number) {
    const p = getParams();
    for (let i = 0; i < batchSize; i++) {
      const path = simulatePath(p.S0, p.r, p.sigma, p.T, p.steps);
      if (paths.length < 300) paths.push(path);

      const avg = path.reduce((a, b) => a + b) / path.length;
      asianPayoffs.push(Math.max(avg - p.K, 0));

      const maxP = Math.max(...path);
      barrierPayoffs.push(maxP >= p.B ? 0 : Math.max(path[path.length - 1] - p.K, 0));

      const minP = Math.min(...path);
      lookbackPayoffs.push(path[path.length - 1] - minP);
    }
    drawPaths();
    drawConvergence();
    updatePrices();
  }

  function animate() {
    if (!running) return;
    addBatch(10);
    if (asianPayoffs.length >= 10000) {
      running = false;
      els.run.textContent = 'simulate';
      els.run.classList.remove('active');
      return;
    }
    animId = requestAnimationFrame(animate);
  }

  function reset() {
    running = false;
    cancelAnimationFrame(animId);
    paths = [];
    asianPayoffs = [];
    barrierPayoffs = [];
    lookbackPayoffs = [];
    els.run.textContent = 'simulate';
    els.run.classList.remove('active');
    els.vanilla.textContent = '\u2014';
    els.asian.textContent = '\u2014';
    els.barrier.textContent = '\u2014';
    els.lookback.textContent = '\u2014';
    els.count.textContent = '0';
    pathsCtx.fillStyle = '#111';
    pathsCtx.fillRect(0, 0, W, H);
    convCtx.fillStyle = '#111';
    convCtx.fillRect(0, 0, W, H);

    const p = getParams();
    els.vanilla.textContent = '$' + blackScholes(p.S0, p.K, p.T, p.r, p.sigma).toFixed(2);
  }

  els.run.addEventListener('click', () => {
    running = !running;
    els.run.textContent = running ? 'pause' : 'simulate';
    els.run.classList.toggle('active', running);
    if (running) {
      if (els.indicator) {
        els.indicator.className = 'data-indicator live';
        els.indicator.innerHTML = '<span class="dot"></span>live simulation';
      }
      animate();
    }
  });

  document.getElementById('exotic-reset')!.addEventListener('click', reset);

  const p = getParams();
  els.vanilla.textContent = '$' + blackScholes(p.S0, p.K, p.T, p.r, p.sigma).toFixed(2);

  fetch('/data/exotic_options.json')
    .then(r => r.json())
    .then((data: {
      vanilla_bs?: number; asian?: number; barrier_uo?: number; lookback?: number;
      num_paths?: number; sample_paths?: number[][];
      convergence?: { asian: { price: number }[]; barrier: { price: number }[]; lookback: { price: number }[] };
    }) => {
      if (data.vanilla_bs) {
        els.vanilla.textContent = '$' + data.vanilla_bs.toFixed(2);
        els.asian.textContent = '$' + (data.asian ?? 0).toFixed(2);
        els.barrier.textContent = '$' + (data.barrier_uo ?? 0).toFixed(2);
        els.lookback.textContent = '$' + (data.lookback ?? 0).toFixed(2);
        els.count.textContent = (data.num_paths ?? 0).toLocaleString();

        if (data.sample_paths) {
          paths = data.sample_paths;
          drawPaths();
        }

        if (data.convergence) {
          const conv = data.convergence;
          const allVals = [...conv.asian.map(d => d.price), ...conv.barrier.map(d => d.price), ...conv.lookback.map(d => d.price)];
          let minV = Math.min(...allVals);
          let maxV = Math.max(...allVals);
          const padV = (maxV - minV) * 0.15 || 1;
          minV -= padV;
          maxV += padV;

          const plotPad = { top: 15, bottom: 25, left: 45, right: 10 };
          const plotW = W - plotPad.left - plotPad.right;
          const plotH = H - plotPad.top - plotPad.bottom;

          convCtx.fillStyle = '#111';
          convCtx.fillRect(0, 0, W, H);

          convCtx.strokeStyle = '#333';
          convCtx.beginPath();
          convCtx.moveTo(plotPad.left, plotPad.top);
          convCtx.lineTo(plotPad.left, plotPad.top + plotH);
          convCtx.lineTo(plotPad.left + plotW, plotPad.top + plotH);
          convCtx.stroke();

          convCtx.fillStyle = '#555';
          convCtx.font = '9px JetBrains Mono';
          convCtx.textAlign = 'right';
          for (let i = 0; i <= 4; i++) {
            const v = minV + (maxV - minV) * (i / 4);
            const y = plotPad.top + plotH - (i / 4) * plotH;
            convCtx.fillText('$' + v.toFixed(1), plotPad.left - 4, y + 3);
          }

          function drawPreLine(data: { price: number }[], color: string) {
            convCtx.beginPath();
            convCtx.strokeStyle = color;
            convCtx.lineWidth = 1.5;
            for (let i = 0; i < data.length; i++) {
              const x = plotPad.left + (i / (data.length - 1)) * plotW;
              const y = plotPad.top + plotH - ((data[i].price - minV) / (maxV - minV)) * plotH;
              if (i === 0) convCtx.moveTo(x, y);
              else convCtx.lineTo(x, y);
            }
            convCtx.stroke();
            convCtx.lineWidth = 1;
          }

          drawPreLine(conv.asian, '#00d4aa');
          drawPreLine(conv.barrier, '#e84057');
          drawPreLine(conv.lookback, '#f0c040');

          convCtx.font = '9px JetBrains Mono';
          convCtx.textAlign = 'left';
          const lx = plotPad.left + 8;
          const ly = plotPad.top + 12;
          const legends: [string, string][] = [['asian', '#00d4aa'], ['barrier', '#e84057'], ['lookback', '#f0c040']];
          legends.forEach(([label, color], i) => {
            convCtx.fillStyle = color;
            convCtx.fillRect(lx, ly + i * 14 - 6, 8, 8);
            convCtx.fillStyle = '#888';
            convCtx.fillText(label, lx + 12, ly + i * 14);
          });
        }

        if (els.indicator) {
          els.indicator.className = 'data-indicator precomputed';
          els.indicator.innerHTML = '<span class="dot"></span>pre-computed \u00b7 ' + (data.num_paths ?? 0).toLocaleString() + ' paths';
        }
      }
    })
    .catch(() => {});
}

main();
