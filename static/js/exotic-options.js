(() => {
  const pathsCanvas = document.getElementById('exotic-paths-canvas');
  const convCanvas = document.getElementById('exotic-conv-canvas');
  if (!pathsCanvas || !convCanvas) return;

  const pathsCtx = pathsCanvas.getContext('2d');
  const convCtx = convCanvas.getContext('2d');
  const W = pathsCanvas.width, H = pathsCanvas.height;

  let paths = [], running = false, animId = null;
  let asianPayoffs = [], barrierPayoffs = [], lookbackPayoffs = [];

  const els = {
    spot: document.getElementById('exotic-spot'),
    strike: document.getElementById('exotic-strike'),
    barrierInput: document.getElementById('exotic-barrier-input'),
    vol: document.getElementById('exotic-vol'),
    maturity: document.getElementById('exotic-maturity'),
    vanilla: document.getElementById('exotic-vanilla'),
    asian: document.getElementById('exotic-asian'),
    barrier: document.getElementById('exotic-barrier'),
    lookback: document.getElementById('exotic-lookback'),
    count: document.getElementById('exotic-count'),
    run: document.getElementById('exotic-run'),
    indicator: document.getElementById('exotic-indicator'),
  };

  function gaussRandom() {
    let u, v, s;
    do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v; }
    while (s >= 1 || s === 0);
    return u * Math.sqrt(-2 * Math.log(s) / s);
  }

  function normalCDF(x) {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x) / Math.sqrt(2);
    const t = 1 / (1 + p * ax);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
    return 0.5 * (1 + sign * y);
  }

  function blackScholes(S, K, T, r, sigma) {
    const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  }

  function simulatePath(S0, r, sigma, T, steps) {
    const dt = T / steps;
    const path = [S0];
    for (let i = 0; i < steps; i++) {
      const dW = gaussRandom() * Math.sqrt(dt);
      const S = path[path.length - 1] * Math.exp((r - 0.5 * sigma * sigma) * dt + sigma * dW);
      path.push(S);
    }
    return path;
  }

  function getParams() {
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

    // barrier line
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

    // strike line
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

    // paths
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

    // compute running averages
    const step = Math.max(1, Math.floor(totalPaths / 200));
    const series = { asian: [], barrier: [], lookback: [] };
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

    // axes
    convCtx.strokeStyle = '#333';
    convCtx.beginPath();
    convCtx.moveTo(plotPad.left, plotPad.top);
    convCtx.lineTo(plotPad.left, plotPad.top + plotH);
    convCtx.lineTo(plotPad.left + plotW, plotPad.top + plotH);
    convCtx.stroke();

    // y labels
    convCtx.fillStyle = '#555';
    convCtx.font = '9px JetBrains Mono';
    convCtx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const v = minV + (maxV - minV) * (i / 4);
      const y = plotPad.top + plotH - (i / 4) * plotH;
      convCtx.fillText('$' + v.toFixed(1), plotPad.left - 4, y + 3);
    }

    function drawLine(data, color) {
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

    // legend
    convCtx.font = '9px JetBrains Mono';
    convCtx.textAlign = 'left';
    const lx = plotPad.left + 8;
    const ly = plotPad.top + 12;
    [['asian', '#00d4aa'], ['barrier', '#e84057'], ['lookback', '#f0c040']].forEach(([label, color], i) => {
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

  function addBatch(batchSize) {
    const p = getParams();
    for (let i = 0; i < batchSize; i++) {
      const path = simulatePath(p.S0, p.r, p.sigma, p.T, p.steps);
      if (paths.length < 300) paths.push(path);

      // asian
      const avg = path.reduce((a, b) => a + b) / path.length;
      asianPayoffs.push(Math.max(avg - p.K, 0));

      // barrier (up-and-out)
      const maxP = Math.max(...path);
      barrierPayoffs.push(maxP >= p.B ? 0 : Math.max(path[path.length - 1] - p.K, 0));

      // lookback (floating strike)
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
    els.vanilla.textContent = '—';
    els.asian.textContent = '—';
    els.barrier.textContent = '—';
    els.lookback.textContent = '—';
    els.count.textContent = '0';
    pathsCtx.fillStyle = '#111';
    pathsCtx.fillRect(0, 0, W, H);
    convCtx.fillStyle = '#111';
    convCtx.fillRect(0, 0, W, H);

    // show vanilla BS immediately
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

  document.getElementById('exotic-reset').addEventListener('click', reset);

  // init
  const p = getParams();
  els.vanilla.textContent = '$' + blackScholes(p.S0, p.K, p.T, p.r, p.sigma).toFixed(2);

  // load pre-computed data
  fetch('/data/exotic_options.json')
    .then(r => r.json())
    .then(data => {
      if (data.vanilla_bs) {
        els.vanilla.textContent = '$' + data.vanilla_bs.toFixed(2);
        els.asian.textContent = '$' + data.asian.toFixed(2);
        els.barrier.textContent = '$' + data.barrier_uo.toFixed(2);
        els.lookback.textContent = '$' + data.lookback.toFixed(2);
        els.count.textContent = data.num_paths.toLocaleString();

        // draw pre-computed paths
        if (data.sample_paths) {
          paths = data.sample_paths;
          drawPaths();
        }

        // draw convergence from pre-computed data
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

          function drawPreLine(data, color) {
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
          [['asian', '#00d4aa'], ['barrier', '#e84057'], ['lookback', '#f0c040']].forEach(([label, color], i) => {
            convCtx.fillStyle = color;
            convCtx.fillRect(lx, ly + i * 14 - 6, 8, 8);
            convCtx.fillStyle = '#888';
            convCtx.fillText(label, lx + 12, ly + i * 14);
          });
        }

        if (els.indicator) {
          els.indicator.className = 'data-indicator precomputed';
          els.indicator.innerHTML = '<span class="dot"></span>pre-computed · ' + data.num_paths.toLocaleString() + ' paths';
        }
      }
    })
    .catch(() => {});
})();
