(() => {
  const pathsCanvas = document.getElementById('paths-canvas');
  const distCanvas = document.getElementById('dist-canvas');
  if (!pathsCanvas || !distCanvas) return;

  const pathsCtx = pathsCanvas.getContext('2d');
  const distCtx = distCanvas.getContext('2d');
  const W = pathsCanvas.width, H = pathsCanvas.height;

  let paths = [], terminals = [], running = false, animId = null;

  const els = {
    spot: document.getElementById('spot'),
    strike: document.getElementById('strike'),
    vol: document.getElementById('vol'),
    maturity: document.getElementById('maturity'),
    mcPrice: document.getElementById('mc-price'),
    bsPrice: document.getElementById('bs-price'),
    pathCount: document.getElementById('path-count'),
    run: document.getElementById('price-run'),
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

    const maxT = p.T;
    let minS = Infinity, maxS = -Infinity;
    for (const path of paths) {
      for (const s of path) {
        if (s < minS) minS = s;
        if (s > maxS) maxS = s;
      }
    }
    minS *= 0.95;
    maxS *= 1.05;

    // strike line
    const strikeY = H - ((p.K - minS) / (maxS - minS)) * H;
    pathsCtx.strokeStyle = '#333';
    pathsCtx.setLineDash([4, 4]);
    pathsCtx.beginPath();
    pathsCtx.moveTo(0, strikeY);
    pathsCtx.lineTo(W, strikeY);
    pathsCtx.stroke();
    pathsCtx.setLineDash([]);

    // strike label
    pathsCtx.fillStyle = '#555';
    pathsCtx.font = '10px JetBrains Mono';
    pathsCtx.fillText('K=' + p.K, 4, strikeY - 4);

    // paths
    for (const path of paths) {
      const finalS = path[path.length - 1];
      const itm = finalS > p.K;
      pathsCtx.strokeStyle = itm ? 'rgba(0,212,170,0.15)' : 'rgba(100,100,100,0.1)';
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

  function drawDist() {
    distCtx.fillStyle = '#111';
    distCtx.fillRect(0, 0, W, H);

    if (terminals.length < 2) return;

    const p = getParams();
    const bins = 40;
    let lo = Infinity, hi = -Infinity;
    for (const v of terminals) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    lo *= 0.95;
    hi *= 1.05;

    const binW = (hi - lo) / bins;
    const counts = new Array(bins).fill(0);
    let maxCount = 0;

    for (const v of terminals) {
      const idx = Math.floor((v - lo) / binW);
      if (idx >= 0 && idx < bins) {
        counts[idx]++;
        if (counts[idx] > maxCount) maxCount = counts[idx];
      }
    }

    const barW = W / bins;
    const pad = 20;
    const plotH = H - pad;

    for (let i = 0; i < bins; i++) {
      const binMid = lo + (i + 0.5) * binW;
      const itm = binMid > p.K;
      distCtx.fillStyle = itm ? 'rgba(0,212,170,0.45)' : 'rgba(100,100,100,0.35)';
      const h = (counts[i] / maxCount) * (plotH - 10);
      distCtx.fillRect(i * barW + 0.5, plotH - h, barW - 1, h);
    }

    // strike line
    const strikeX = ((p.K - lo) / (hi - lo)) * W;
    distCtx.strokeStyle = '#555';
    distCtx.setLineDash([4, 4]);
    distCtx.beginPath();
    distCtx.moveTo(strikeX, 0);
    distCtx.lineTo(strikeX, plotH);
    distCtx.stroke();
    distCtx.setLineDash([]);

    distCtx.fillStyle = '#555';
    distCtx.font = '10px JetBrains Mono';
    distCtx.fillText('K', strikeX + 4, 12);
  }

  function updatePrices() {
    if (terminals.length === 0) return;
    const p = getParams();
    const payoffs = terminals.map(s => Math.max(s - p.K, 0));
    const mc = Math.exp(-p.r * p.T) * payoffs.reduce((a, b) => a + b) / payoffs.length;
    const bs = blackScholes(p.S0, p.K, p.T, p.r, p.sigma);

    els.mcPrice.textContent = '$' + mc.toFixed(2);
    els.bsPrice.textContent = '$' + bs.toFixed(2);
    els.pathCount.textContent = paths.length.toLocaleString();
  }

  function addBatch(n) {
    const p = getParams();
    for (let i = 0; i < n; i++) {
      const path = simulatePath(p.S0, p.r, p.sigma, p.T, p.steps);
      if (paths.length < 300) paths.push(path);
      terminals.push(path[path.length - 1]);
    }
    drawPaths();
    drawDist();
    updatePrices();
  }

  function animate() {
    if (!running) return;
    addBatch(20);
    if (terminals.length >= 10000) {
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
    terminals = [];
    els.run.textContent = 'simulate';
    els.run.classList.remove('active');
    els.mcPrice.textContent = '—';
    els.bsPrice.textContent = '—';
    els.pathCount.textContent = '0';
    pathsCtx.fillStyle = '#111';
    pathsCtx.fillRect(0, 0, W, H);
    distCtx.fillStyle = '#111';
    distCtx.fillRect(0, 0, W, H);
  }

  els.run.addEventListener('click', () => {
    running = !running;
    els.run.textContent = running ? 'pause' : 'simulate';
    els.run.classList.toggle('active', running);
    if (running) animate();
  });

  document.getElementById('price-reset').addEventListener('click', reset);

  // show BS price immediately
  const p = getParams();
  els.bsPrice.textContent = '$' + blackScholes(p.S0, p.K, p.T, p.r, p.sigma).toFixed(2);
})();
