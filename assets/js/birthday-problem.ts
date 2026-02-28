export {};

function main() {
  const canvas = document.getElementById('bday-canvas') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width, H = canvas.height;

  interface SimResult { sim: number; trials: number; }
  let results: Record<number, SimResult> = {};

  const els = {
    n: document.getElementById('bday-n')!,
    pSim: document.getElementById('bday-p-sim')!,
    pTheory: document.getElementById('bday-p-theory')!,
    trials: document.getElementById('bday-trials')!,
    size: document.getElementById('bday-size') as HTMLInputElement,
    run: document.getElementById('bday-run')!,
    indicator: document.getElementById('bday-indicator'),
  };

  function theoreticalP(n: number): number {
    if (n > 365) return 1;
    let p = 1;
    for (let i = 1; i < n; i++) {
      p *= (365 - i) / 365;
    }
    return 1 - p;
  }

  function simulate(roomSize: number, numTrials: number): number {
    let shared = 0;
    for (let t = 0; t < numTrials; t++) {
      const seen = new Set<number>();
      let found = false;
      for (let i = 0; i < roomSize; i++) {
        const b = Math.floor(Math.random() * 365);
        if (seen.has(b)) { found = true; break; }
        seen.add(b);
      }
      if (found) shared++;
    }
    return shared / numTrials;
  }

  function drawChart() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    const pad = { top: 20, right: 20, bottom: 35, left: 50 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    ctx.fillStyle = '#555';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'right';
    for (let p = 0; p <= 1; p += 0.25) {
      const y = pad.top + plotH - p * plotH;
      ctx.fillText(p.toFixed(2), pad.left - 5, y + 3);
      ctx.strokeStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    for (let n = 10; n <= 70; n += 10) {
      const x = pad.left + ((n - 2) / 68) * plotW;
      ctx.fillText(n.toString(), x, pad.top + plotH + 15);
    }
    ctx.fillText('room size', pad.left + plotW / 2, H - 5);

    const y50 = pad.top + plotH - 0.5 * plotH;
    ctx.strokeStyle = '#333';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, y50);
    ctx.lineTo(pad.left + plotW, y50);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    for (let n = 2; n <= 70; n++) {
      const x = pad.left + ((n - 2) / 68) * plotW;
      const y = pad.top + plotH - theoreticalP(n) * plotH;
      if (n === 2) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;

    const barW = Math.max(2, plotW / 69 - 1);
    for (let n = 2; n <= 70; n++) {
      if (!results[n]) continue;
      const x = pad.left + ((n - 2) / 68) * plotW - barW / 2;
      const barH = results[n].sim * plotH;
      ctx.fillStyle = 'rgba(0,212,170,0.6)';
      ctx.fillRect(x, pad.top + plotH - barH, barW, barH);
    }

    ctx.fillStyle = '#555';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText('\u2014 theoretical', pad.left + plotW - 130, pad.top + 15);
    ctx.fillStyle = 'rgba(0,212,170,0.8)';
    ctx.fillRect(pad.left + plotW - 140, pad.top + 24, 8, 8);
    ctx.fillStyle = '#555';
    ctx.fillText('simulated', pad.left + plotW - 128, pad.top + 32);
  }

  function updateDisplay() {
    const n = parseInt(els.size.value);
    els.n.textContent = String(n);
    els.pTheory.textContent = theoreticalP(n).toFixed(4);

    if (results[n]) {
      els.pSim.textContent = results[n].sim.toFixed(4);
      els.trials.textContent = results[n].trials.toLocaleString();
    } else {
      els.pSim.textContent = '\u2014';
      els.trials.textContent = '0';
    }
  }

  els.size.addEventListener('input', updateDisplay);

  els.run.addEventListener('click', () => {
    if (els.indicator) {
      els.indicator.className = 'data-indicator live';
      els.indicator.innerHTML = '<span class="dot"></span>live simulation';
    }

    for (let n = 2; n <= 70; n++) {
      const p = simulate(n, 10000);
      const prev = results[n];
      if (prev) {
        const totalTrials = prev.trials + 10000;
        results[n] = {
          sim: (prev.sim * prev.trials + p * 10000) / totalTrials,
          trials: totalTrials,
        };
      } else {
        results[n] = { sim: p, trials: 10000 };
      }
    }

    drawChart();
    updateDisplay();
  });

  document.getElementById('bday-reset')!.addEventListener('click', () => {
    results = {};
    els.pSim.textContent = '\u2014';
    els.trials.textContent = '0';
    drawChart();
    updateDisplay();
  });

  drawChart();
  updateDisplay();

  fetch('/data/birthday_problem.json')
    .then(r => r.json())
    .then((data: { results?: { room_size: number; p_simulated: number; trials: number }[]; num_trials?: number }) => {
      if (data.results) {
        for (const entry of data.results) {
          results[entry.room_size] = {
            sim: entry.p_simulated,
            trials: entry.trials,
          };
        }
        drawChart();
        updateDisplay();
        if (els.indicator) {
          els.indicator.className = 'data-indicator precomputed';
          els.indicator.innerHTML = '<span class="dot"></span>pre-computed \u00b7 ' + (data.num_trials ?? 0).toLocaleString() + ' trials each';
        }
      }
    })
    .catch(() => {});
}

main();
