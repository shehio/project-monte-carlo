(() => {
  'use strict';

  // ── Pixel art SVGs ──
  // Each icon is a small pixel grid rendered with shape-rendering="crispEdges"

  function pixelSVG(w, h, pixels, color) {
    let rects = '';
    for (let y = 0; y < pixels.length; y++) {
      for (let x = 0; x < pixels[y].length; x++) {
        if (pixels[y][x]) {
          rects += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' +
                   (typeof pixels[y][x] === 'string' ? pixels[y][x] : color) + '"/>';
        }
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
           '" shape-rendering="crispEdges">' + rects + '</svg>';
  }

  const PA = '#00d4aa'; // accent
  const PD = '#555';    // dim
  const PW = '#c8c8c8'; // light
  const PR = '#e84057'; // red

  // Goat pixel art (14x13) — side profile, clear horns/beard/tail
  const GOAT_PIXELS = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0,PD, 0,PD, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0,PD, 0,PD, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0,PD,PD,PD, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0,PD,PW,PD, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0,PD,PD,PD,PD, 0, 0],
    [PD, 0, 0, 0, 0, 0, 0,PD,PD,PD,PD,PD, 0, 0],
    [0,PD,PD,PD,PD,PD,PD,PD,PD,PD, 0,PD, 0, 0],
    [0, 0,PD,PD,PD,PD,PD,PD,PD, 0, 0,PD,PD, 0],
    [0, 0,PD, 0, 0, 0,PD, 0,PD, 0, 0, 0, 0, 0],
    [0, 0,PD, 0, 0, 0,PD, 0,PD, 0, 0, 0, 0, 0],
    [0, 0,PD, 0, 0, 0,PD, 0,PD, 0, 0, 0, 0, 0],
    [0, 0,PD,PD, 0, 0,PD,PD,PD,PD, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];

  // Car pixel art (11x7)
  const CAR_PIXELS = [
    [0,0,0,PA,PA,PA,PA,PA,0,0,0],
    [0,0,PA,PA,PA,PA,PA,PA,PA,0,0],
    [0,PA,PA,PD,PA,PA,PA,PD,PA,PA,0],
    [PA,PA,PA,PA,PA,PA,PA,PA,PA,PA,PA],
    [PA,PA,PA,PA,PA,PA,PA,PA,PA,PA,PA],
    [0,PA,PW,PA,0,0,0,PA,PW,PA,0],
    [0,0,PW,0,0,0,0,0,PW,0,0],
  ];

  // Door closed pixel art (10x14)
  const DOOR_PIXELS = [
    [PD,PD,PD,PD,PD,PD,PD,PD,PD,PD],
    [PD,0,0,0,0,0,0,0,0,PD],
    [PD,0,0,0,0,0,0,0,0,PD],
    [PD,0,0,0,0,0,0,0,0,PD],
    [PD,0,0,0,0,0,0,0,0,PD],
    [PD,0,0,0,0,0,0,0,0,PD],
    [PD,0,0,0,0,0,0,0,0,PD],
    [PD,0,0,0,0,0,0,PW,0,PD],
    [PD,0,0,0,0,0,0,0,0,PD],
    [PD,0,0,0,0,0,0,0,0,PD],
    [PD,0,0,0,0,0,0,0,0,PD],
    [PD,0,0,0,0,0,0,0,0,PD],
    [PD,0,0,0,0,0,0,0,0,PD],
    [PD,PD,PD,PD,PD,PD,PD,PD,PD,PD],
  ];

  // Pixel art number patterns (3x5 each)
  const NUM_PIXELS = {
    1: [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
    2: [[1,1,0],[0,0,1],[0,1,0],[1,0,0],[1,1,1]],
    3: [[1,1,0],[0,0,1],[0,1,0],[0,0,1],[1,1,0]],
  };

  function makeDoorSVG(num) {
    // Build door pixels with number overlay
    const px = [];
    for (let y = 0; y < DOOR_PIXELS.length; y++) {
      px.push(DOOR_PIXELS[y].slice());
    }
    // Place number in center of door (at y=3..7, x=3..5)
    const np = NUM_PIXELS[num];
    if (np) {
      for (let ny = 0; ny < 5; ny++) {
        for (let nx = 0; nx < 3; nx++) {
          if (np[ny][nx]) px[ny + 4][nx + 4] = PA;
        }
      }
    }
    return pixelSVG(10, 14, px, PD);
  }

  const GOAT_SVG = pixelSVG(14, 13, GOAT_PIXELS, PD);
  const CAR_SVG = pixelSVG(11, 7, CAR_PIXELS, PA);

  // ── Interactive game ──

  const doors = document.querySelectorAll('.door');
  const messageEl = document.getElementById('mh-message');
  const choiceEl = document.getElementById('mh-choice');
  const newBtn = document.getElementById('mh-new');
  if (!doors.length || !messageEl) return;

  let carDoor = -1;
  let picked = -1;
  let revealed = -1;
  let phase = 'pick'; // pick → reveal → decide → result

  // Game stats
  let gamesPlayed = 0;
  let switchWins = 0;
  let switchGames = 0;
  let stayWins = 0;
  let stayGames = 0;

  const statEls = {
    games: document.getElementById('mh-games'),
    swWins: document.getElementById('mh-sw-wins'),
    stWins: document.getElementById('mh-st-wins'),
    swPct: document.getElementById('mh-sw-pct'),
    stPct: document.getElementById('mh-st-pct'),
  };

  function newGame() {
    carDoor = Math.floor(Math.random() * 3);
    picked = -1;
    revealed = -1;
    phase = 'pick';
    doors.forEach((d, i) => {
      d.classList.remove('opened', 'selected', 'highlighted', 'winner', 'loser');
      d.querySelector('.door-front').innerHTML = makeDoorSVG(i + 1);
      d.querySelector('.door-back').innerHTML = '';
    });
    choiceEl.style.display = 'none';
    messageEl.textContent = 'pick a door';
    messageEl.className = 'game-message';
  }

  function revealGoat() {
    // Host reveals a door that is not picked and not the car
    const options = [0, 1, 2].filter(d => d !== picked && d !== carDoor);
    revealed = options[Math.floor(Math.random() * options.length)];
    doors[revealed].classList.add('opened');
    doors[revealed].querySelector('.door-back').innerHTML = GOAT_SVG;
    phase = 'decide';

    const remaining = [0, 1, 2].filter(d => d !== picked && d !== revealed)[0];
    doors[remaining].classList.add('highlighted');

    messageEl.textContent = 'door ' + (revealed + 1) + ' has a goat. switch to door ' + (remaining + 1) + '?';
    choiceEl.style.display = 'flex';
  }

  function resolve(didSwitch) {
    choiceEl.style.display = 'none';
    const finalDoor = didSwitch
      ? [0, 1, 2].filter(d => d !== picked && d !== revealed)[0]
      : picked;

    // Open all doors
    doors.forEach((d, i) => {
      d.classList.remove('highlighted', 'selected');
      d.classList.add('opened');
      d.querySelector('.door-back').innerHTML = i === carDoor ? CAR_SVG : GOAT_SVG;
    });

    const won = finalDoor === carDoor;
    if (won) {
      doors[finalDoor].classList.add('winner');
    } else {
      doors[finalDoor].classList.add('loser');
      doors[carDoor].classList.add('winner');
    }

    gamesPlayed++;
    if (didSwitch) {
      switchGames++;
      if (won) switchWins++;
    } else {
      stayGames++;
      if (won) stayWins++;
    }

    messageEl.textContent = won
      ? 'you ' + (didSwitch ? 'switched' : 'stayed') + ' and won!'
      : 'you ' + (didSwitch ? 'switched' : 'stayed') + ' — goat';
    messageEl.className = 'game-message' + (won ? '' : ' loss');
    phase = 'result';
    updateGameStats();
  }

  function updateGameStats() {
    statEls.games.textContent = gamesPlayed;
    statEls.swWins.textContent = switchWins;
    statEls.stWins.textContent = stayWins;
    statEls.swPct.textContent = switchGames > 0
      ? (switchWins / switchGames * 100).toFixed(1) + '%' : '—';
    statEls.stPct.textContent = stayGames > 0
      ? (stayWins / stayGames * 100).toFixed(1) + '%' : '—';
  }

  doors.forEach(d => {
    d.addEventListener('click', () => {
      if (phase !== 'pick') return;
      picked = parseInt(d.getAttribute('data-door'));
      d.classList.add('selected');
      phase = 'reveal';
      messageEl.textContent = 'you picked door ' + (picked + 1) + '...';
      setTimeout(revealGoat, 600);
    });
  });

  document.getElementById('mh-switch').addEventListener('click', () => {
    if (phase === 'decide') resolve(true);
  });
  document.getElementById('mh-stay').addEventListener('click', () => {
    if (phase === 'decide') resolve(false);
  });
  newBtn.addEventListener('click', newGame);

  newGame();

  // ── Monte Carlo simulation ──

  const canvas = document.getElementById('mh-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  let simData = []; // [{trial, switchRate, stayRate}]
  let totalTrials = 0;
  let totalSwitchWins = 0;
  let running = false;

  const simEls = {
    trials: document.getElementById('mh-trials'),
    sw: document.getElementById('mh-sim-sw'),
    st: document.getElementById('mh-sim-st'),
  };

  function runBatch(n) {
    for (let i = 0; i < n; i++) {
      const car = Math.floor(Math.random() * 3);
      const pick = Math.floor(Math.random() * 3);
      // Switch always goes to the remaining door (not picked, not revealed)
      // Switching wins iff initial pick ≠ car
      if (pick !== car) totalSwitchWins++;
      totalTrials++;
    }
  }

  function samplePoint() {
    simData.push({
      trial: totalTrials,
      switchRate: totalSwitchWins / totalTrials,
      stayRate: 1 - totalSwitchWins / totalTrials,
    });
  }

  function drawChart() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    const pad = { top: 20, right: 20, bottom: 35, left: 50 };
    const pw = W - pad.left - pad.right;
    const ph = H - pad.top - pad.bottom;

    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + ph);
    ctx.lineTo(pad.left + pw, pad.top + ph);
    ctx.stroke();

    // Y-axis labels & grid
    ctx.fillStyle = '#555';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'right';
    for (let p = 0; p <= 1; p += 0.25) {
      const y = pad.top + ph - p * ph;
      ctx.fillText(p.toFixed(2), pad.left - 5, y + 3);
      ctx.strokeStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + pw, y);
      ctx.stroke();
    }

    // Reference lines at 1/3 and 2/3
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#333';
    const y13 = pad.top + ph - (1 / 3) * ph;
    const y23 = pad.top + ph - (2 / 3) * ph;
    ctx.beginPath();
    ctx.moveTo(pad.left, y13);
    ctx.lineTo(pad.left + pw, y13);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad.left, y23);
    ctx.lineTo(pad.left + pw, y23);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#444';
    ctx.textAlign = 'left';
    ctx.fillText('2/3', pad.left + 4, y23 - 4);
    ctx.fillText('1/3', pad.left + 4, y13 - 4);

    // X-axis label
    ctx.textAlign = 'center';
    ctx.fillStyle = '#555';
    ctx.fillText('trials', pad.left + pw / 2, H - 5);

    if (simData.length < 2) {
      // Empty state
      ctx.fillStyle = '#333';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('click "run 10,000 trials" to simulate', pad.left + pw / 2, pad.top + ph / 2);
      return;
    }

    const maxTrial = simData[simData.length - 1].trial;

    // X-axis tick labels
    ctx.fillStyle = '#555';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'center';
    const step = niceStep(maxTrial, 5);
    for (let t = step; t <= maxTrial; t += step) {
      const x = pad.left + (t / maxTrial) * pw;
      ctx.fillText(shortNum(t), x, pad.top + ph + 15);
    }

    // Switch line (accent)
    ctx.beginPath();
    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = 2;
    for (let i = 0; i < simData.length; i++) {
      const x = pad.left + (simData[i].trial / maxTrial) * pw;
      const y = pad.top + ph - simData[i].switchRate * ph;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Stay line (red)
    ctx.beginPath();
    ctx.strokeStyle = '#e84057';
    ctx.lineWidth = 2;
    for (let i = 0; i < simData.length; i++) {
      const x = pad.left + (simData[i].trial / maxTrial) * pw;
      const y = pad.top + ph - simData[i].stayRate * ph;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Legend
    ctx.lineWidth = 1;
    const lx = pad.left + pw - 100;
    const ly = pad.top + 10;
    ctx.strokeStyle = '#00d4aa';
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 14, ly); ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText('switch', lx + 18, ly + 3);

    ctx.strokeStyle = '#e84057';
    ctx.beginPath(); ctx.moveTo(lx, ly + 14); ctx.lineTo(lx + 14, ly + 14); ctx.stroke();
    ctx.fillText('stay', lx + 18, ly + 17);
  }

  function niceStep(max, targetTicks) {
    const rough = max / targetTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let step;
    if (norm < 1.5) step = 1;
    else if (norm < 3.5) step = 2;
    else if (norm < 7.5) step = 5;
    else step = 10;
    return step * mag;
  }

  function shortNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(0) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'k';
    return String(n);
  }

  function updateSimStats() {
    simEls.trials.textContent = totalTrials.toLocaleString();
    if (totalTrials > 0) {
      simEls.sw.textContent = (totalSwitchWins / totalTrials * 100).toFixed(2) + '%';
      simEls.st.textContent = ((1 - totalSwitchWins / totalTrials) * 100).toFixed(2) + '%';
    } else {
      simEls.sw.textContent = '—';
      simEls.st.textContent = '—';
    }
  }

  document.getElementById('mh-run').addEventListener('click', () => {
    if (running) return;
    running = true;

    const target = totalTrials + 10000;
    const batchSize = 200;
    const sampleEvery = 200;

    function step() {
      runBatch(batchSize);
      if (totalTrials % sampleEvery === 0) samplePoint();
      drawChart();
      updateSimStats();
      if (totalTrials < target) {
        requestAnimationFrame(step);
      } else {
        samplePoint();
        drawChart();
        updateSimStats();
        running = false;
      }
    }
    requestAnimationFrame(step);
  });

  document.getElementById('mh-reset').addEventListener('click', () => {
    if (running) return;
    totalTrials = 0;
    totalSwitchWins = 0;
    simData = [];
    drawChart();
    updateSimStats();
  });

  drawChart();
  updateSimStats();
})();
