(() => {
  'use strict';

  // ── Interactive game ──

  const numberEl = document.getElementById('sp-number');
  const scoreEl = document.getElementById('sp-score');
  const bestLabelEl = document.getElementById('sp-best-label');
  const messageEl = document.getElementById('sp-message');
  const nInput = document.getElementById('sp-n');
  if (!numberEl || !messageEl) return;

  let candidates = [];
  let current = 0;
  let bestSeen = 0;
  let hired = -1;
  let gameActive = false;
  let gamesPlayed = 0;
  let wins = 0;

  const statEls = {
    games: document.getElementById('sp-games'),
    wins: document.getElementById('sp-wins'),
    rate: document.getElementById('sp-rate'),
  };

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
  }

  function newGame() {
    const n = parseInt(nInput?.value) || 20;
    candidates = [];
    for (let i = 1; i <= n; i++) candidates.push(i);
    shuffle(candidates);
    current = 0;
    bestSeen = 0;
    hired = -1;
    gameActive = true;
    showCandidate();
  }

  function showCandidate() {
    if (current >= candidates.length) {
      hired = candidates.length - 1;
      endGame();
      return;
    }
    const score = candidates[current];
    bestSeen = Math.max(bestSeen, score);
    numberEl.textContent = 'candidate ' + (current + 1) + ' of ' + candidates.length;
    scoreEl.textContent = 'score: ' + score;
    const isBest = score >= bestSeen;
    bestLabelEl.textContent = isBest ? '\u2605 best so far' : 'best seen: ' + bestSeen;
    bestLabelEl.className = 'sp-best-so-far' + (isBest ? ' is-best' : '');
    messageEl.textContent = 'hire or pass?';
    messageEl.className = 'game-message';
  }

  function endGame() {
    gameActive = false;
    const best = candidates.length;
    const pickedScore = candidates[hired];
    const won = pickedScore === best;
    const bestIdx = candidates.indexOf(best);

    gamesPlayed++;
    if (won) wins++;

    messageEl.textContent = won
      ? 'hired #' + (hired + 1) + ' (score ' + pickedScore + ') \u2014 the best!'
      : 'hired #' + (hired + 1) + ' (score ' + pickedScore + '). best was #' + (bestIdx + 1) + ' (score ' + best + ')';
    messageEl.className = 'game-message' + (won ? '' : ' loss');

    numberEl.textContent = 'done';
    scoreEl.textContent = 'picked: ' + pickedScore + ' / ' + best;
    bestLabelEl.textContent = won ? '\u2605 perfect hire' : 'missed by ' + (best - pickedScore);
    bestLabelEl.className = 'sp-best-so-far' + (won ? ' is-best' : '');
    updateGameStats();
  }

  function updateGameStats() {
    statEls.games.textContent = gamesPlayed;
    statEls.wins.textContent = wins;
    statEls.rate.textContent = gamesPlayed > 0
      ? (wins / gamesPlayed * 100).toFixed(1) + '%' : '\u2014';
  }

  document.getElementById('sp-hire').addEventListener('click', () => {
    if (gameActive) { hired = current; endGame(); }
  });
  document.getElementById('sp-pass').addEventListener('click', () => {
    if (!gameActive) return;
    current++;
    if (current >= candidates.length) { hired = candidates.length - 1; endGame(); }
    else showCandidate();
  });
  document.getElementById('sp-new').addEventListener('click', newGame);

  // ── MC Simulation ──

  const canvas = document.getElementById('sp-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const CW = canvas.width, CH = canvas.height;

  let simData = null;
  let running = false;

  const simEls = {
    trials: document.getElementById('sp-trials'),
    peak: document.getElementById('sp-peak'),
    peakRate: document.getElementById('sp-peak-rate'),
  };

  function runSimulation(n, trialsPerThreshold) {
    const results = [];
    const steps = 50;

    for (let t = 0; t <= steps; t++) {
      const rejectCount = Math.floor((t / steps) * n);
      let successes = 0;

      for (let trial = 0; trial < trialsPerThreshold; trial++) {
        // Random candidate quality values
        const vals = new Float64Array(n);
        for (let i = 0; i < n; i++) vals[i] = Math.random();

        // Find best overall
        let bestVal = -1, bestIdx = 0;
        for (let i = 0; i < n; i++) {
          if (vals[i] > bestVal) { bestVal = vals[i]; bestIdx = i; }
        }

        // Best in rejected set
        let bestInRejected = -1;
        for (let i = 0; i < rejectCount; i++) {
          if (vals[i] > bestInRejected) bestInRejected = vals[i];
        }

        // Accept first one better than rejected best
        let picked = n - 1;
        for (let i = rejectCount; i < n; i++) {
          if (vals[i] > bestInRejected) { picked = i; break; }
        }

        if (picked === bestIdx) successes++;
      }

      results.push({
        threshold: Math.round((t / steps) * 100),
        successRate: successes / trialsPerThreshold,
      });
    }

    return { results, trialsPerThreshold };
  }

  function drawChart() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, CW, CH);

    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const pw = CW - pad.left - pad.right;
    const ph = CH - pad.top - pad.bottom;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + ph);
    ctx.lineTo(pad.left + pw, pad.top + ph);
    ctx.stroke();

    // Y labels (0-50%)
    ctx.fillStyle = '#555';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'right';
    for (let p = 0; p <= 50; p += 10) {
      const y = pad.top + ph - (p / 50) * ph;
      ctx.fillText(p + '%', pad.left - 5, y + 3);
      ctx.strokeStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + pw, y);
      ctx.stroke();
    }

    // X labels
    ctx.textAlign = 'center';
    ctx.fillStyle = '#555';
    for (let p = 0; p <= 100; p += 20) {
      const x = pad.left + (p / 100) * pw;
      ctx.fillText(p + '%', x, pad.top + ph + 15);
    }
    ctx.fillText('rejection threshold', pad.left + pw / 2, CH - 5);

    // Vertical reference at 1/e
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#333';
    const xe = pad.left + (1 / Math.E) * pw;
    ctx.beginPath();
    ctx.moveTo(xe, pad.top);
    ctx.lineTo(xe, pad.top + ph);
    ctx.stroke();

    // Horizontal reference at 1/e success
    const ye = pad.top + ph - ((100 / Math.E) / 50) * ph;
    ctx.beginPath();
    ctx.moveTo(pad.left, ye);
    ctx.lineTo(pad.left + pw, ye);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#444';
    ctx.textAlign = 'left';
    ctx.fillText('1/e \u2248 37%', xe + 4, pad.top + 12);
    ctx.fillText('1/e', pad.left + 4, ye - 4);

    if (!simData) {
      ctx.fillStyle = '#333';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('click "run" to find optimal threshold', pad.left + pw / 2, pad.top + ph / 2);
      return;
    }

    // Area fill
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + ph);
    for (let i = 0; i < simData.results.length; i++) {
      const d = simData.results[i];
      const x = pad.left + (d.threshold / 100) * pw;
      const y = pad.top + ph - (d.successRate * 100 / 50) * ph;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(pad.left + pw, pad.top + ph);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 212, 170, 0.12)';
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = 2;
    for (let i = 0; i < simData.results.length; i++) {
      const d = simData.results[i];
      const x = pad.left + (d.threshold / 100) * pw;
      const y = pad.top + ph - (d.successRate * 100 / 50) * ph;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Peak dot
    let peakIdx = 0;
    simData.results.forEach((d, i) => {
      if (d.successRate > simData.results[peakIdx].successRate) peakIdx = i;
    });
    const peakD = simData.results[peakIdx];
    const peakX = pad.left + (peakD.threshold / 100) * pw;
    const peakY = pad.top + ph - (peakD.successRate * 100 / 50) * ph;
    ctx.beginPath();
    ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#00d4aa';
    ctx.fill();
  }

  document.getElementById('sp-run').addEventListener('click', () => {
    if (running) return;
    running = true;
    const n = parseInt(document.getElementById('sp-sim-n')?.value) || 100;
    const trials = parseInt(document.getElementById('sp-sim-trials')?.value) || 5000;

    simData = runSimulation(n, trials);
    simEls.trials.textContent = trials.toLocaleString();

    let peak = simData.results[0];
    simData.results.forEach(d => { if (d.successRate > peak.successRate) peak = d; });
    simEls.peak.textContent = peak.threshold + '%';
    simEls.peakRate.textContent = (peak.successRate * 100).toFixed(1) + '%';

    drawChart();
    running = false;
  });

  document.getElementById('sp-sim-reset').addEventListener('click', () => {
    if (running) return;
    simData = null;
    simEls.trials.textContent = '0';
    simEls.peak.textContent = '\u2014';
    simEls.peakRate.textContent = '\u2014';
    drawChart();
  });

  drawChart();
})();
