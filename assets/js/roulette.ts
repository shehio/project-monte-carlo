export {};

function main() {
  'use strict';

  const RED_NUMS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  function colorOf(n: number): 'green' | 'red' | 'black' {
    if (n === 0) return 'green';
    return RED_NUMS.has(n) ? 'red' : 'black';
  }

  const history: number[] = [];
  const resultEl = document.getElementById('rl-result')!;
  const historyEl = document.getElementById('rl-history')!;
  const streakEl = document.getElementById('rl-streak')!;
  if (!resultEl) return;

  function doSpins(count: number) {
    for (let i = 0; i < count; i++) {
      history.push(Math.floor(Math.random() * 37));
    }
    renderResult();
    renderHistory();
    updateStats();
    updateStreak();
  }

  function renderResult() {
    const last = history[history.length - 1];
    resultEl.textContent = String(last);
    resultEl.className = 'rl-result rl-' + colorOf(last);
  }

  function renderHistory() {
    const last = history.slice(-30);
    historyEl.innerHTML = last.map(n =>
      '<span class="rl-dot rl-' + colorOf(n) + '">' + n + '</span>'
    ).join('');
  }

  function updateStreak() {
    if (history.length === 0) { streakEl.textContent = '\u2014'; return; }
    const lastColor = colorOf(history[history.length - 1]);
    if (lastColor === 'green') { streakEl.textContent = 'green'; return; }
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (colorOf(history[i]) === lastColor) streak++;
      else break;
    }
    streakEl.textContent = streak + ' ' + lastColor;
  }

  const statEls = {
    spins: document.getElementById('rl-spins')!,
    red: document.getElementById('rl-red-pct')!,
    black: document.getElementById('rl-black-pct')!,
  };

  function updateStats() {
    const n = history.length;
    statEls.spins.textContent = String(n);
    if (n === 0) { statEls.red.textContent = '\u2014'; statEls.black.textContent = '\u2014'; return; }
    const reds = history.filter(x => RED_NUMS.has(x)).length;
    const blacks = history.filter(x => x > 0 && !RED_NUMS.has(x)).length;
    statEls.red.textContent = (reds / n * 100).toFixed(1) + '%';
    statEls.black.textContent = (blacks / n * 100).toFixed(1) + '%';
  }

  document.getElementById('rl-spin')!.addEventListener('click', () => doSpins(1));
  document.getElementById('rl-spin10')!.addEventListener('click', () => doSpins(10));
  document.getElementById('rl-spin100')!.addEventListener('click', () => doSpins(100));

  // Fallacy simulation
  const canvas = document.getElementById('rl-canvas') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const CW = canvas.width, CH = canvas.height;

  let simResult: Record<number, { reds: number; total: number }> | null = null;
  const simSpinsEl = document.getElementById('rl-sim-spins')!;
  const simCountInput = document.getElementById('rl-sim-count') as HTMLInputElement | null;

  function runFallacySim(N: number): Record<number, { reds: number; total: number }> {
    const buckets: Record<number, { reds: number; total: number }> = {};
    for (let k = 1; k <= 5; k++) buckets[k] = { reds: 0, total: 0 };
    let redStreak = 0;

    for (let i = 0; i < N; i++) {
      const num = Math.floor(Math.random() * 37);
      const isRed = RED_NUMS.has(num);

      if (redStreak > 0) {
        const k = Math.min(redStreak, 5);
        buckets[k].total++;
        if (isRed) buckets[k].reds++;
      }

      redStreak = isRed ? redStreak + 1 : 0;
    }

    return buckets;
  }

  function drawChart() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, CW, CH);

    const pad = { top: 25, right: 30, bottom: 45, left: 55 };
    const pw = CW - pad.left - pad.right;
    const ph = CH - pad.top - pad.bottom;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + ph);
    ctx.lineTo(pad.left + pw, pad.top + ph);
    ctx.stroke();

    ctx.fillStyle = '#555';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'right';
    for (let p = 0; p <= 100; p += 25) {
      const y = pad.top + ph - (p / 100) * ph;
      ctx.fillText(p + '%', pad.left - 5, y + 3);
      ctx.strokeStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + pw, y);
      ctx.stroke();
    }

    const theory = 18 / 37;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#555';
    const yRef = pad.top + ph - theory * ph;
    ctx.beginPath();
    ctx.moveTo(pad.left, yRef);
    ctx.lineTo(pad.left + pw, yRef);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#444';
    ctx.textAlign = 'left';
    ctx.fillText('18/37 \u2248 48.6%', pad.left + 4, yRef - 6);

    if (!simResult) {
      ctx.fillStyle = '#333';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('click "run" to test the fallacy', pad.left + pw / 2, pad.top + ph / 2);
      return;
    }

    const labels = ['1', '2', '3', '4', '5+'];
    const barW = Math.min(60, pw / labels.length - 20);
    const gap = (pw - barW * labels.length) / (labels.length + 1);

    for (let i = 0; i < labels.length; i++) {
      const bucket = simResult[i + 1];
      if (!bucket || bucket.total === 0) continue;
      const rate = bucket.reds / bucket.total;
      const barH = rate * ph;
      const x = pad.left + gap + i * (barW + gap);
      const y = pad.top + ph - barH;

      ctx.fillStyle = '#e84057';
      ctx.fillRect(x, y, barW, barH);

      ctx.fillStyle = '#c8c8c8';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText((rate * 100).toFixed(1) + '%', x + barW / 2, y - 8);

      ctx.fillStyle = '#555';
      ctx.font = '9px JetBrains Mono';
      ctx.fillText('n=' + bucket.total.toLocaleString(), x + barW / 2, pad.top + ph + 28);

      ctx.fillStyle = '#888';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(labels[i], x + barW / 2, pad.top + ph + 14);
    }

    ctx.fillStyle = '#555';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('streak of K reds \u2192 P(next is red)', pad.left + pw / 2, CH - 3);
  }

  document.getElementById('rl-run')!.addEventListener('click', () => {
    const n = parseInt(simCountInput?.value ?? '100000') || 100000;
    simResult = runFallacySim(n);
    simSpinsEl.textContent = n.toLocaleString();
    drawChart();
  });

  document.getElementById('rl-reset')!.addEventListener('click', () => {
    simResult = null;
    simSpinsEl.textContent = '0';
    drawChart();
  });

  drawChart();
}

main();
