(() => {
  const canvas = document.getElementById('bday-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  let results = {};  // room_size -> { sim, trials }
  let precomputedData = null;

  const els = {
    n: document.getElementById('bday-n'),
    pSim: document.getElementById('bday-p-sim'),
    pTheory: document.getElementById('bday-p-theory'),
    trials: document.getElementById('bday-trials'),
    size: document.getElementById('bday-size'),
    run: document.getElementById('bday-run'),
    indicator: document.getElementById('bday-indicator'),
  };

  function theoreticalP(n) {
    if (n > 365) return 1;
    let p = 1;
    for (let i = 1; i < n; i++) {
      p *= (365 - i) / 365;
    }
    return 1 - p;
  }

  function simulate(roomSize, numTrials) {
    let shared = 0;
    for (let t = 0; t < numTrials; t++) {
      const seen = new Set();
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

    // axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    // y-axis labels
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

    // x-axis labels
    ctx.textAlign = 'center';
    for (let n = 10; n <= 70; n += 10) {
      const x = pad.left + ((n - 2) / 68) * plotW;
      ctx.fillText(n.toString(), x, pad.top + plotH + 15);
    }
    ctx.fillText('room size', pad.left + plotW / 2, H - 5);

    // 50% line
    const y50 = pad.top + plotH - 0.5 * plotH;
    ctx.strokeStyle = '#333';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, y50);
    ctx.lineTo(pad.left + plotW, y50);
    ctx.stroke();
    ctx.setLineDash([]);

    // theoretical curve
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

    // simulated bars
    const barW = Math.max(2, plotW / 69 - 1);
    for (let n = 2; n <= 70; n++) {
      if (!results[n]) continue;
      const x = pad.left + ((n - 2) / 68) * plotW - barW / 2;
      const barH = results[n].sim * plotH;
      ctx.fillStyle = 'rgba(0,212,170,0.6)';
      ctx.fillRect(x, pad.top + plotH - barH, barW, barH);
    }

    // legend
    ctx.fillStyle = '#555';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText('— theoretical', pad.left + plotW - 130, pad.top + 15);
    ctx.fillStyle = 'rgba(0,212,170,0.8)';
    ctx.fillRect(pad.left + plotW - 140, pad.top + 24, 8, 8);
    ctx.fillStyle = '#555';
    ctx.fillText('simulated', pad.left + plotW - 128, pad.top + 32);
  }

  function updateDisplay() {
    const n = parseInt(els.size.value);
    els.n.textContent = n;
    els.pTheory.textContent = theoreticalP(n).toFixed(4);

    if (results[n]) {
      els.pSim.textContent = results[n].sim.toFixed(4);
      els.trials.textContent = results[n].trials.toLocaleString();
    } else {
      els.pSim.textContent = '—';
      els.trials.textContent = '0';
    }
  }

  els.size.addEventListener('input', updateDisplay);

  els.run.addEventListener('click', () => {
    if (els.indicator) {
      els.indicator.className = 'data-indicator live';
      els.indicator.innerHTML = '<span class="dot"></span>live simulation';
    }

    // simulate for all room sizes 2-70
    for (let n = 2; n <= 70; n++) {
      const p = simulate(n, 10000);
      const prev = results[n];
      if (prev) {
        // running average
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

  document.getElementById('bday-reset').addEventListener('click', () => {
    results = {};
    els.pSim.textContent = '—';
    els.trials.textContent = '0';
    drawChart();
    updateDisplay();
  });

  drawChart();
  updateDisplay();

  // load pre-computed data
  fetch('/data/birthday_problem.json')
    .then(r => r.json())
    .then(data => {
      if (data.results) {
        precomputedData = data;
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
          els.indicator.innerHTML = '<span class="dot"></span>pre-computed · ' + data.num_trials.toLocaleString() + ' trials each';
        }
      }
    })
    .catch(() => {});
})();
