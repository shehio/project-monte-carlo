export {};

function main() {
  const canvas = document.getElementById('int-canvas') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width, H = canvas.height;

  interface FnSpec {
    fn: (x: number) => number;
    range: [number, number];
    yMax: number;
    exact: number;
  }

  const FUNCTIONS: Record<string, FnSpec> = {
    sin: { fn: x => Math.sin(x), range: [0, Math.PI], yMax: 1.0, exact: 2.0 },
    gaussian: { fn: x => Math.exp(-(x * x)), range: [0, 2], yMax: 1.0, exact: 0.882081 },
    quadratic: { fn: x => x * x, range: [0, 1], yMax: 1.0, exact: 1 / 3 },
  };

  let total = 0, under = 0, running = false, animId = 0;
  let currentFn = 'sin';

  const els = {
    estimate: document.getElementById('int-estimate')!,
    exact: document.getElementById('int-exact')!,
    count: document.getElementById('int-count')!,
    error: document.getElementById('int-error')!,
    speed: document.getElementById('int-speed') as HTMLInputElement,
    start: document.getElementById('int-start')!,
    fnSelect: document.getElementById('fn-select') as HTMLSelectElement,
    indicator: document.getElementById('int-indicator'),
  };

  function getSpec(): FnSpec { return FUNCTIONS[currentFn]; }

  function drawCurve() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    const spec = getSpec();
    const [a, b] = spec.range;
    const pad = 30;
    const plotW = W - pad;
    const plotH = H - pad;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, 0);
    ctx.lineTo(pad, plotH);
    ctx.lineTo(W, plotH);
    ctx.stroke();

    ctx.fillStyle = '#555';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText(a.toFixed(1), pad, H - 5);
    ctx.fillText(b.toFixed(1), W - 5, H - 5);

    ctx.beginPath();
    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = 2;
    for (let px = 0; px <= plotW; px++) {
      const x = a + (px / plotW) * (b - a);
      const y = spec.fn(x);
      const cy = plotH - (y / spec.yMax) * plotH;
      if (px === 0) ctx.moveTo(pad + px, cy);
      else ctx.lineTo(pad + px, cy);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function addPoint() {
    const spec = getSpec();
    const [a, b] = spec.range;
    const pad = 30;
    const plotW = W - pad;
    const plotH = H - pad;

    const x = a + Math.random() * (b - a);
    const y = Math.random() * spec.yMax;
    const fx = spec.fn(x);
    const below = y <= fx;

    total++;
    if (below) under++;

    const px = pad + ((x - a) / (b - a)) * plotW;
    const py = plotH - (y / spec.yMax) * plotH;

    ctx.fillStyle = below ? 'rgba(0,212,170,0.5)' : 'rgba(100,100,100,0.2)';
    ctx.fillRect(px - 1, py - 1, 2, 2);
  }

  function updateStats() {
    if (total === 0) return;
    const spec = getSpec();
    const [a, b] = spec.range;
    const area = (under / total) * (b - a) * spec.yMax;
    els.estimate.textContent = area.toFixed(6);
    els.exact.textContent = spec.exact.toFixed(6);
    els.count.textContent = total.toLocaleString();
    els.error.textContent = Math.abs(area - spec.exact).toFixed(6);
  }

  function animate() {
    if (!running) return;
    const speed = parseInt(els.speed.value);
    for (let i = 0; i < speed; i++) addPoint();
    updateStats();
    animId = requestAnimationFrame(animate);
  }

  els.fnSelect.addEventListener('change', () => {
    currentFn = els.fnSelect.value;
    reset();
  });

  function reset() {
    running = false;
    cancelAnimationFrame(animId);
    total = 0;
    under = 0;
    els.start.textContent = 'start';
    els.start.classList.remove('active');
    els.estimate.textContent = '\u2014';
    els.exact.textContent = getSpec().exact.toFixed(6);
    els.count.textContent = '0';
    els.error.textContent = '\u2014';
    drawCurve();
  }

  els.start.addEventListener('click', () => {
    running = !running;
    els.start.textContent = running ? 'pause' : 'start';
    els.start.classList.toggle('active', running);
    if (running) {
      if (els.indicator) {
        els.indicator.className = 'data-indicator live';
        els.indicator.innerHTML = '<span class="dot"></span>live simulation';
      }
      animate();
    }
  });

  document.getElementById('int-reset')!.addEventListener('click', reset);

  drawCurve();
  els.exact.textContent = getSpec().exact.toFixed(6);

  fetch('/data/integration.json')
    .then(r => r.json())
    .then((data: Record<string, { estimate: number; exact: number; total: number; error: number }>) => {
      const fnData = data[currentFn];
      if (fnData) {
        els.estimate.textContent = fnData.estimate.toFixed(6);
        els.exact.textContent = fnData.exact.toFixed(6);
        els.count.textContent = fnData.total.toLocaleString();
        els.error.textContent = fnData.error.toFixed(6);
        if (els.indicator) {
          els.indicator.className = 'data-indicator precomputed';
          els.indicator.innerHTML = '<span class="dot"></span>pre-computed \u00b7 ' + fnData.total.toLocaleString() + ' points';
        }
      }
    })
    .catch(() => {});
}

main();
