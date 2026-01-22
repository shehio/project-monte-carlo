(() => {
  const srcCanvas = document.getElementById('source-canvas');
  const meansCanvas = document.getElementById('means-canvas');
  if (!srcCanvas || !meansCanvas) return;

  const srcCtx = srcCanvas.getContext('2d');
  const meansCtx = meansCanvas.getContext('2d');
  const W = srcCanvas.width, H = srcCanvas.height;

  let running = false, animId = null, means = [];

  const els = {
    nSlider: document.getElementById('sample-size'),
    nLabel: document.getElementById('n-label'),
    distSelect: document.getElementById('dist-select'),
    mean: document.getElementById('clt-mean'),
    std: document.getElementById('clt-std'),
    count: document.getElementById('clt-count'),
    run: document.getElementById('clt-run'),
  };

  // distributions
  function gaussRandom() {
    let u, v, s;
    do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v; }
    while (s >= 1 || s === 0);
    return u * Math.sqrt(-2 * Math.log(s) / s);
  }

  const distributions = {
    exponential: { fn: () => -Math.log(1 - Math.random()), range: [0, 6], mu: 1 },
    uniform: { fn: () => Math.random(), range: [0, 1], mu: 0.5 },
    bimodal: { fn: () => Math.random() < 0.5 ? gaussRandom() - 2 : gaussRandom() + 2, range: [-6, 6], mu: 0 },
  };

  function getDist() { return distributions[els.distSelect.value]; }
  function getN() { return parseInt(els.nSlider.value); }

  function sampleMean(dist, n) {
    let s = 0;
    for (let i = 0; i < n; i++) s += dist.fn();
    return s / n;
  }

  // histogram drawing
  function drawHist(ctx, data, range, color, normalOverlay) {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    if (data.length < 2) return;

    const bins = 50;
    const [lo, hi] = range;
    const binW = (hi - lo) / bins;
    const counts = new Array(bins).fill(0);
    let maxCount = 0;

    for (const v of data) {
      const idx = Math.floor((v - lo) / binW);
      if (idx >= 0 && idx < bins) {
        counts[idx]++;
        if (counts[idx] > maxCount) maxCount = counts[idx];
      }
    }

    if (maxCount === 0) return;

    const barW = W / bins;
    const pad = 30;
    const plotH = H - pad;

    // bars
    ctx.fillStyle = color;
    for (let i = 0; i < bins; i++) {
      const h = (counts[i] / maxCount) * (plotH - 10);
      ctx.fillRect(i * barW + 0.5, plotH - h, barW - 1, h);
    }

    // axis
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(0, plotH);
    ctx.lineTo(W, plotH);
    ctx.stroke();

    // labels
    ctx.fillStyle = '#555';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText(lo.toFixed(1), 5, H - 5);
    ctx.fillText(hi.toFixed(1), W - 5, H - 5);

    // normal curve overlay
    if (normalOverlay && data.length > 10) {
      const mu = data.reduce((a, b) => a + b) / data.length;
      const sigma = Math.sqrt(data.reduce((a, b) => a + (b - mu) ** 2, 0) / data.length);
      if (sigma > 0.001) {
        ctx.beginPath();
        ctx.strokeStyle = '#00d4aa';
        ctx.lineWidth = 1.5;
        for (let px = 0; px < W; px++) {
          const x = lo + (px / W) * (hi - lo);
          const pdf = Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
          const scaledY = plotH - (pdf * sigma * Math.sqrt(2 * Math.PI)) * (plotH - 10);
          if (px === 0) ctx.moveTo(px, scaledY);
          else ctx.lineTo(px, scaledY);
        }
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
  }

  function drawSource() {
    const dist = getDist();
    const samples = [];
    for (let i = 0; i < 10000; i++) samples.push(dist.fn());
    drawHist(srcCtx, samples, dist.range, 'rgba(100,100,100,0.5)', false);
  }

  function updateStats() {
    if (means.length === 0) return;
    const mu = means.reduce((a, b) => a + b) / means.length;
    const sigma = Math.sqrt(means.reduce((a, b) => a + (b - mu) ** 2, 0) / means.length);
    els.mean.textContent = mu.toFixed(4);
    els.std.textContent = sigma.toFixed(4);
    els.count.textContent = means.length.toLocaleString();
  }

  function addMeans(batch) {
    const dist = getDist();
    const n = getN();
    for (let i = 0; i < batch; i++) {
      means.push(sampleMean(dist, n));
    }
    drawHist(meansCtx, means, dist.range, 'rgba(0,212,170,0.45)', true);
    updateStats();
  }

  function animate() {
    if (!running) return;
    addMeans(50);
    if (means.length >= 10000) {
      running = false;
      els.run.textContent = 'run';
      els.run.classList.remove('active');
      return;
    }
    animId = requestAnimationFrame(animate);
  }

  els.nSlider.addEventListener('input', () => {
    els.nLabel.textContent = getN();
    reset();
  });

  els.distSelect.addEventListener('change', () => {
    drawSource();
    reset();
  });

  function reset() {
    running = false;
    cancelAnimationFrame(animId);
    means = [];
    els.run.textContent = 'run';
    els.run.classList.remove('active');
    els.mean.textContent = '—';
    els.std.textContent = '—';
    els.count.textContent = '0';
    meansCtx.fillStyle = '#111';
    meansCtx.fillRect(0, 0, W, H);
  }

  els.run.addEventListener('click', () => {
    running = !running;
    els.run.textContent = running ? 'pause' : 'run';
    els.run.classList.toggle('active', running);
    if (running) animate();
  });

  document.getElementById('clt-reset').addEventListener('click', () => {
    drawSource();
    reset();
  });

  drawSource();
})();
