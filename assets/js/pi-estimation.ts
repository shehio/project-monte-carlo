export {};

function main() {
  const canvas = document.getElementById('pi-canvas') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width, H = canvas.height;

  let inside = 0, total = 0, running = false, animId = 0;

  const els = {
    value: document.getElementById('pi-value')!,
    count: document.getElementById('point-count')!,
    error: document.getElementById('pi-error')!,
    speed: document.getElementById('pi-speed') as HTMLInputElement,
    start: document.getElementById('pi-start')!,
    indicator: document.getElementById('pi-indicator'),
  };

  function init() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const p = (i / 10) * W;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(W, p); ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(0, 0, W, 0, Math.PI / 2);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function addPoints(n: number) {
    for (let i = 0; i < n; i++) {
      const x = Math.random();
      const y = Math.random();
      total++;
      const hit = x * x + y * y <= 1;
      if (hit) inside++;

      ctx.fillStyle = hit ? 'rgba(0,212,170,0.5)' : 'rgba(80,80,80,0.3)';
      ctx.fillRect(x * W, y * H, 2, 2);
    }
    update();
  }

  function update() {
    if (total === 0) return;
    const pi = 4 * inside / total;
    els.value.textContent = pi.toFixed(6);
    els.count.textContent = total.toLocaleString();
    els.error.textContent = Math.abs(pi - Math.PI).toFixed(6);
  }

  function animate() {
    if (!running) return;
    addPoints(parseInt(els.speed.value));
    animId = requestAnimationFrame(animate);
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

  document.getElementById('pi-reset')!.addEventListener('click', () => {
    running = false;
    cancelAnimationFrame(animId);
    inside = 0;
    total = 0;
    els.start.textContent = 'start';
    els.start.classList.remove('active');
    els.value.textContent = '\u2014';
    els.count.textContent = '0';
    els.error.textContent = '\u2014';
    init();
  });

  init();

  fetch('/data/pi_estimation.json')
    .then(r => r.json())
    .then((data: { convergence?: { pi: number }[]; total?: number; error?: number }) => {
      if (data.convergence && data.convergence.length > 0) {
        const last = data.convergence[data.convergence.length - 1];
        els.value.textContent = last.pi.toFixed(6);
        els.count.textContent = (data.total ?? 0).toLocaleString();
        els.error.textContent = (data.error ?? 0).toFixed(6);
        if (els.indicator) {
          els.indicator.className = 'data-indicator precomputed';
          els.indicator.innerHTML = '<span class="dot"></span>pre-computed \u00b7 ' + (data.total ?? 0).toLocaleString() + ' points';
        }
      }
    })
    .catch(() => {});
}

main();
