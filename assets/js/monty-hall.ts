import { shortNum, niceStep, shuffle } from './lib/math';
import { pixelSVG, PA, PD, PW, PE } from './lib/pixel-art';

function main() {
  'use strict';

  const GOAT_PIXELS = [
    [0, 0, 0, 0, 0, 0, 0, 0, PA, 0, PA, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, PA, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, PD, PD, PD, PD, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, PD, PW, PW, PE, PW, PD, 0, 0],
    [0, 0, 0, 0, 0, 0, PD, PW, PW, PW, PD, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, PD, PD, PD, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, PD, 0, 0, 0, 0, 0],
    [PD, 0, PD, PD, PD, PD, PD, PD, PD, 0, 0, 0, 0, 0],
    [0, PD, PW, PW, PW, PW, PW, PW, PD, 0, 0, 0, 0, 0],
    [0, PD, PW, PW, PW, PW, PW, PW, PD, 0, 0, 0, 0, 0],
    [0, PD, PW, PW, PW, PW, PW, PW, PD, 0, 0, 0, 0, 0],
    [0, 0, PD, PW, PD, 0, PD, PW, PD, 0, 0, 0, 0, 0],
    [0, 0, PD, PW, PD, 0, PD, PW, PD, 0, 0, 0, 0, 0],
    [0, 0, PD, PD, PD, 0, PD, PD, PD, 0, 0, 0, 0, 0],
  ];

  const CAR_PIXELS = [
    [0, 0, 0, PA, PA, PA, PA, PA, 0, 0, 0],
    [0, 0, PA, PA, PA, PA, PA, PA, PA, 0, 0],
    [0, PA, PA, PD, PA, PA, PA, PD, PA, PA, 0],
    [PA, PA, PA, PA, PA, PA, PA, PA, PA, PA, PA],
    [PA, PA, PA, PA, PA, PA, PA, PA, PA, PA, PA],
    [0, PA, PW, PA, 0, 0, 0, PA, PW, PA, 0],
    [0, 0, PW, 0, 0, 0, 0, 0, PW, 0, 0],
  ];

  const DOOR_PIXELS = [
    [PD, PD, PD, PD, PD, PD, PD, PD, PD, PD],
    [PD, 0, 0, 0, 0, 0, 0, 0, 0, PD],
    [PD, 0, 0, 0, 0, 0, 0, 0, 0, PD],
    [PD, 0, 0, 0, 0, 0, 0, 0, 0, PD],
    [PD, 0, 0, 0, 0, 0, 0, 0, 0, PD],
    [PD, 0, 0, 0, 0, 0, 0, 0, 0, PD],
    [PD, 0, 0, 0, 0, 0, 0, 0, 0, PD],
    [PD, 0, 0, 0, 0, 0, 0, PW, 0, PD],
    [PD, 0, 0, 0, 0, 0, 0, 0, 0, PD],
    [PD, 0, 0, 0, 0, 0, 0, 0, 0, PD],
    [PD, 0, 0, 0, 0, 0, 0, 0, 0, PD],
    [PD, 0, 0, 0, 0, 0, 0, 0, 0, PD],
    [PD, 0, 0, 0, 0, 0, 0, 0, 0, PD],
    [PD, PD, PD, PD, PD, PD, PD, PD, PD, PD],
  ];

  const NUM_PIXELS: Record<number, number[][]> = {
    0: [[1, 1, 1], [1, 0, 1], [1, 0, 1], [1, 0, 1], [1, 1, 1]],
    1: [[0, 1, 0], [1, 1, 0], [0, 1, 0], [0, 1, 0], [1, 1, 1]],
    2: [[1, 1, 0], [0, 0, 1], [0, 1, 0], [1, 0, 0], [1, 1, 1]],
    3: [[1, 1, 0], [0, 0, 1], [0, 1, 0], [0, 0, 1], [1, 1, 0]],
    4: [[1, 0, 1], [1, 0, 1], [1, 1, 1], [0, 0, 1], [0, 0, 1]],
    5: [[1, 1, 1], [1, 0, 0], [1, 1, 0], [0, 0, 1], [1, 1, 0]],
    6: [[0, 1, 1], [1, 0, 0], [1, 1, 1], [1, 0, 1], [1, 1, 1]],
    7: [[1, 1, 1], [0, 0, 1], [0, 1, 0], [0, 1, 0], [0, 1, 0]],
    8: [[1, 1, 1], [1, 0, 1], [1, 1, 1], [1, 0, 1], [1, 1, 1]],
    9: [[1, 1, 1], [1, 0, 1], [1, 1, 1], [0, 0, 1], [1, 1, 0]],
  };

  function makeDoorSVG(num: number): string {
    const px: (string | number)[][] = [];
    for (let y = 0; y < DOOR_PIXELS.length; y++) {
      px.push(DOOR_PIXELS[y].slice());
    }
    const digits = String(num).split('').map(Number);
    const digitWidth = digits.length * 4 - 1;
    const startX = Math.floor((10 - digitWidth) / 2);
    digits.forEach((d, di) => {
      const np = NUM_PIXELS[d];
      if (!np) return;
      const ox = startX + di * 4;
      for (let ny = 0; ny < 5; ny++) {
        for (let nx = 0; nx < 3; nx++) {
          if (np[ny][nx] && ox + nx >= 1 && ox + nx < 9) {
            px[ny + 4][ox + nx] = PA;
          }
        }
      }
    });
    return pixelSVG(10, 14, px, PD);
  }

  const GOAT_SVG = pixelSVG(14, 14, GOAT_PIXELS, PD);
  const CAR_SVG = pixelSVG(11, 7, CAR_PIXELS, PA);

  const doorCountInput = document.getElementById('mh-door-count') as HTMLInputElement | null;
  const trialCountInput = document.getElementById('mh-trial-count') as HTMLInputElement | null;
  const doorsContainer = document.getElementById('monty-doors')!;
  const messageEl = document.getElementById('mh-message')!;
  const choiceEl = document.getElementById('mh-choice')!;
  const newBtn = document.getElementById('mh-new')!;
  const formulaEl = document.getElementById('mh-formula');
  if (!doorsContainer || !messageEl) return;

  let numDoors = parseInt(doorCountInput?.value ?? '3') || 3;
  let numTrials = parseInt(trialCountInput?.value ?? '10000') || 10000;

  let doors: HTMLDivElement[] = [];
  let carDoor = -1;
  let picked = -1;
  let revealedDoors: number[] = [];
  let phase: 'pick' | 'reveal' | 'decide' | 'result' = 'pick';

  let gamesPlayed = 0;
  let switchWins = 0;
  let switchGames = 0;
  let stayWins = 0;
  let stayGames = 0;

  const statEls = {
    games: document.getElementById('mh-games')!,
    swWins: document.getElementById('mh-sw-wins')!,
    stWins: document.getElementById('mh-st-wins')!,
    swPct: document.getElementById('mh-sw-pct')!,
    stPct: document.getElementById('mh-st-pct')!,
  };

  function buildDoors(n: number) {
    doorsContainer.innerHTML = '';
    doors = [];
    const dw = Math.min(160, Math.max(70, Math.floor(560 / n)));
    const dh = Math.round(dw * 1.375);
    doorsContainer.style.setProperty('--door-w', dw + 'px');
    doorsContainer.style.setProperty('--door-h', dh + 'px');
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = 'door';
      d.setAttribute('data-door', String(i));
      d.innerHTML = '<div class="door-front"></div><div class="door-back"></div>';
      d.addEventListener('click', () => {
        if (phase !== 'pick') return;
        picked = i;
        d.classList.add('selected');
        phase = 'reveal';
        messageEl.textContent = 'you picked door ' + (i + 1) + '...';
        setTimeout(revealGoats, 600);
      });
      doorsContainer.appendChild(d);
      doors.push(d);
    }
  }

  function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

  function updateFormula() {
    if (!formulaEl) return;
    if (numDoors === 3) {
      formulaEl.textContent = 'P(win | switch) = 2/3 \u2003 P(win | stay) = 1/3';
    } else {
      const g = gcd(numDoors - 1, numDoors);
      const sn = (numDoors - 1) / g;
      const sd = numDoors / g;
      formulaEl.textContent = 'P(win | switch) = ' + sn + '/' + sd +
        ' \u2003 P(win | stay) = 1/' + numDoors;
    }
  }

  function newGame() {
    carDoor = Math.floor(Math.random() * numDoors);
    picked = -1;
    revealedDoors = [];
    phase = 'pick';
    doors.forEach((d, i) => {
      d.classList.remove('opened', 'selected', 'highlighted', 'winner', 'loser');
      d.querySelector('.door-front')!.innerHTML = makeDoorSVG(i + 1);
      d.querySelector('.door-back')!.innerHTML = '';
    });
    choiceEl.style.display = 'none';
    messageEl.textContent = 'pick a door';
    messageEl.className = 'game-message';
  }

  function revealGoats() {
    const goatOptions: number[] = [];
    for (let i = 0; i < numDoors; i++) {
      if (i !== picked && i !== carDoor) goatOptions.push(i);
    }
    if (picked === carDoor) {
      shuffle(goatOptions);
      revealedDoors = goatOptions.slice(0, numDoors - 2);
    } else {
      revealedDoors = goatOptions.slice();
    }

    revealedDoors.forEach(idx => {
      doors[idx].classList.add('opened');
      doors[idx].querySelector('.door-back')!.innerHTML = GOAT_SVG;
    });

    phase = 'decide';
    const remaining = findRemaining();
    doors[remaining].classList.add('highlighted');

    const revealedStr = revealedDoors.length === 1
      ? 'door ' + (revealedDoors[0] + 1) + ' has a goat.'
      : revealedDoors.length + ' doors opened \u2014 all goats.';
    messageEl.textContent = revealedStr + ' switch to door ' + (remaining + 1) + '?';
    choiceEl.style.display = 'flex';
  }

  function findRemaining(): number {
    for (let i = 0; i < numDoors; i++) {
      if (i !== picked && revealedDoors.indexOf(i) === -1) return i;
    }
    return -1;
  }

  function resolve(didSwitch: boolean) {
    choiceEl.style.display = 'none';
    const finalDoor = didSwitch ? findRemaining() : picked;

    doors.forEach((d, i) => {
      d.classList.remove('highlighted', 'selected');
      d.classList.add('opened');
      d.querySelector('.door-back')!.innerHTML = i === carDoor ? CAR_SVG : GOAT_SVG;
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
      : 'you ' + (didSwitch ? 'switched' : 'stayed') + ' \u2014 goat';
    messageEl.className = 'game-message' + (won ? '' : ' loss');
    phase = 'result';
    updateGameStats();
  }

  function updateGameStats() {
    statEls.games.textContent = String(gamesPlayed);
    statEls.swWins.textContent = String(switchWins);
    statEls.stWins.textContent = String(stayWins);
    statEls.swPct.textContent = switchGames > 0
      ? (switchWins / switchGames * 100).toFixed(1) + '%' : '\u2014';
    statEls.stPct.textContent = stayGames > 0
      ? (stayWins / stayGames * 100).toFixed(1) + '%' : '\u2014';
  }

  document.getElementById('mh-switch')!.addEventListener('click', () => {
    if (phase === 'decide') resolve(true);
  });
  document.getElementById('mh-stay')!.addEventListener('click', () => {
    if (phase === 'decide') resolve(false);
  });
  newBtn.addEventListener('click', newGame);

  if (doorCountInput) {
    doorCountInput.addEventListener('change', () => {
      const v = parseInt(doorCountInput.value);
      if (v >= 3 && v <= 20) {
        numDoors = v;
        gamesPlayed = 0; switchWins = 0; switchGames = 0; stayWins = 0; stayGames = 0;
        updateGameStats();
        resetSim();
        buildDoors(numDoors);
        newGame();
        updateFormula();
        drawChart();
        updateSimStats();
      }
    });
  }

  if (trialCountInput) {
    trialCountInput.addEventListener('change', () => {
      const v = parseInt(trialCountInput.value);
      if (v >= 100 && v <= 1000000) numTrials = v;
    });
  }

  buildDoors(numDoors);
  updateFormula();
  newGame();

  // MC simulation
  const canvas = document.getElementById('mh-canvas') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const CW = canvas.width, CH = canvas.height;

  interface SimPoint { trial: number; switchRate: number; stayRate: number; }
  let simData: SimPoint[] = [];
  let totalTrials = 0;
  let totalSwitchWins = 0;
  let simRunning = false;

  const simEls = {
    trials: document.getElementById('mh-trials')!,
    sw: document.getElementById('mh-sim-sw')!,
    st: document.getElementById('mh-sim-st')!,
  };

  function resetSim() {
    if (simRunning) return;
    totalTrials = 0;
    totalSwitchWins = 0;
    simData = [];
  }

  function runBatch(n: number) {
    const nd = numDoors;
    for (let i = 0; i < n; i++) {
      const car = Math.floor(Math.random() * nd);
      const pick = Math.floor(Math.random() * nd);
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

  function fracLabel(num: number, den: number): string {
    const g = gcd(num, den);
    return (num / g) + '/' + (den / g);
  }

  function drawChart() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, CW, CH);

    const pad = { top: 20, right: 20, bottom: 35, left: 50 };
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
    for (let p = 0; p <= 1; p += 0.25) {
      const y = pad.top + ph - p * ph;
      ctx.fillText(p.toFixed(2), pad.left - 5, y + 3);
      ctx.strokeStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + pw, y);
      ctx.stroke();
    }

    const stayTheory = 1 / numDoors;
    const switchTheory = (numDoors - 1) / numDoors;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#333';
    const yStay = pad.top + ph - stayTheory * ph;
    const ySwitch = pad.top + ph - switchTheory * ph;
    ctx.beginPath(); ctx.moveTo(pad.left, yStay); ctx.lineTo(pad.left + pw, yStay); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.left, ySwitch); ctx.lineTo(pad.left + pw, ySwitch); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#444';
    ctx.textAlign = 'left';
    ctx.fillText(fracLabel(numDoors - 1, numDoors), pad.left + 4, ySwitch - 4);
    ctx.fillText(fracLabel(1, numDoors), pad.left + 4, yStay - 4);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#555';
    ctx.fillText('trials', pad.left + pw / 2, CH - 5);

    if (simData.length < 2) {
      ctx.fillStyle = '#333';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('click "run" to simulate', pad.left + pw / 2, pad.top + ph / 2);
      return;
    }

    const maxTrial = simData[simData.length - 1].trial;

    ctx.fillStyle = '#555';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'center';
    const step = niceStep(maxTrial, 5);
    for (let t = step; t <= maxTrial; t += step) {
      const x = pad.left + (t / maxTrial) * pw;
      ctx.fillText(shortNum(t), x, pad.top + ph + 15);
    }

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

  function updateSimStats() {
    simEls.trials.textContent = totalTrials.toLocaleString();
    if (totalTrials > 0) {
      simEls.sw.textContent = (totalSwitchWins / totalTrials * 100).toFixed(2) + '%';
      simEls.st.textContent = ((1 - totalSwitchWins / totalTrials) * 100).toFixed(2) + '%';
    } else {
      simEls.sw.textContent = '\u2014';
      simEls.st.textContent = '\u2014';
    }
  }

  document.getElementById('mh-run')!.addEventListener('click', () => {
    if (simRunning) return;
    simRunning = true;

    const target = totalTrials + numTrials;
    const batchSize = Math.max(50, Math.floor(numTrials / 50));
    const sampleEvery = batchSize;

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
        simRunning = false;
      }
    }
    requestAnimationFrame(step);
  });

  document.getElementById('mh-reset')!.addEventListener('click', () => {
    if (simRunning) return;
    resetSim();
    drawChart();
    updateSimStats();
  });

  drawChart();
  updateSimStats();
}

main();
