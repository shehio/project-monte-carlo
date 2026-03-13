import { shortNum, niceStep } from './lib/math';

function main() {
  // ── DOM refs ──

  const die1El = document.getElementById('die-1')!;
  const die2El = document.getElementById('die-2')!;
  const rollTotalEl = document.getElementById('roll-total')!;
  const phaseEl = document.getElementById('phase-display')!;

  const bankrollEl = document.getElementById('craps-bankroll')!;
  const pointValEl = document.getElementById('craps-point-val')!;
  const winsEl = document.getElementById('craps-wins')!;
  const lossesEl = document.getElementById('craps-losses')!;
  const messageEl = document.getElementById('craps-message')!;
  const historyEl = document.getElementById('craps-history')!;
  const betTypeEl = document.getElementById('craps-bet-type') as HTMLSelectElement;
  const wagerEl = document.getElementById('craps-wager') as HTMLInputElement;

  // ── Dice rendering ──

  const DOT_LAYOUTS: Record<number, [number, number][]> = {
    1: [[1, 1]],
    2: [[0, 2], [2, 0]],
    3: [[0, 2], [1, 1], [2, 0]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
  };

  function renderDie(el: HTMLElement, value: number) {
    const face = el.querySelector('.die-face')!;
    face.innerHTML = '';
    const dots = DOT_LAYOUTS[value] || [];
    for (const [row, col] of dots) {
      const dot = document.createElement('span');
      dot.className = 'die-dot';
      dot.style.gridRow = String(row + 1);
      dot.style.gridColumn = String(col + 1);
      face.appendChild(dot);
    }
  }

  // ── Game state ──

  type Phase = 'come-out' | 'point';
  let phase: Phase = 'come-out';
  let point = 0;
  let bankroll = 1000;
  let wins = 0;
  let losses = 0;
  const rollHistory: { d1: number; d2: number; result: string }[] = [];

  function rollDice(): [number, number] {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    return [d1, d2];
  }

  // ── Field bet logic (single roll) ──

  function resolveFieldBet(total: number, wager: number): number {
    // Field wins on 2,3,4,9,10,11,12; 2 and 12 pay double
    if (total === 2 || total === 12) return wager * 2;
    if (total === 3 || total === 4 || total === 9 || total === 10 || total === 11) return wager;
    return -wager;
  }

  // ── Roll handler ──

  function doRoll() {
    const betType = betTypeEl.value;
    const wager = Math.max(5, parseInt(wagerEl.value) || 25);
    if (wager > bankroll) {
      messageEl.textContent = 'insufficient bankroll';
      messageEl.className = 'game-message loss';
      return;
    }

    const [d1, d2] = rollDice();
    const total = d1 + d2;

    renderDie(die1El, d1);
    renderDie(die2El, d2);
    rollTotalEl.textContent = String(total);

    let resultText = '';

    if (betType === 'field') {
      // Field bet is resolved in a single roll
      const payout = resolveFieldBet(total, wager);
      bankroll += payout;
      if (payout > 0) {
        wins++;
        resultText = `field wins +$${payout}`;
        messageEl.className = 'game-message';
      } else {
        losses++;
        resultText = `field loses -$${Math.abs(payout)}`;
        messageEl.className = 'game-message loss';
      }
      messageEl.textContent = resultText;
    } else if (phase === 'come-out') {
      // Come-out roll
      if (total === 7 || total === 11) {
        // Natural
        if (betType === 'pass') {
          bankroll += wager;
          wins++;
          resultText = `natural ${total}! pass wins +$${wager}`;
          messageEl.className = 'game-message';
        } else {
          // don't pass loses on natural (7 or 11)
          bankroll -= wager;
          losses++;
          resultText = `natural ${total} — don't pass loses -$${wager}`;
          messageEl.className = 'game-message loss';
        }
        messageEl.textContent = resultText;
      } else if (total === 2 || total === 3) {
        // Craps (2 or 3)
        if (betType === 'pass') {
          bankroll -= wager;
          losses++;
          resultText = `craps ${total} — pass loses -$${wager}`;
          messageEl.className = 'game-message loss';
        } else {
          bankroll += wager;
          wins++;
          resultText = `craps ${total}! don't pass wins +$${wager}`;
          messageEl.className = 'game-message';
        }
        messageEl.textContent = resultText;
      } else if (total === 12) {
        // 12 on come-out: pass loses, don't pass pushes (bar 12)
        if (betType === 'pass') {
          bankroll -= wager;
          losses++;
          resultText = `craps 12 — pass loses -$${wager}`;
          messageEl.className = 'game-message loss';
        } else {
          resultText = `12 — don't pass pushes (bar 12)`;
          messageEl.className = 'game-message';
        }
        messageEl.textContent = resultText;
      } else {
        // Point established
        point = total;
        phase = 'point';
        resultText = `point is ${point}`;
        phaseEl.textContent = `point phase · hit ${point} to win`;
        pointValEl.textContent = String(point);
        messageEl.textContent = resultText;
        messageEl.className = 'game-message';
      }
    } else {
      // Point phase
      if (total === point) {
        // Hit the point
        if (betType === 'pass') {
          bankroll += wager;
          wins++;
          resultText = `point ${point} hit! pass wins +$${wager}`;
          messageEl.className = 'game-message';
        } else {
          bankroll -= wager;
          losses++;
          resultText = `point ${point} hit — don't pass loses -$${wager}`;
          messageEl.className = 'game-message loss';
        }
        messageEl.textContent = resultText;
        phase = 'come-out';
        point = 0;
        phaseEl.textContent = 'come-out roll';
        pointValEl.textContent = '\u2014';
      } else if (total === 7) {
        // Seven-out
        if (betType === 'pass') {
          bankroll -= wager;
          losses++;
          resultText = `seven-out — pass loses -$${wager}`;
          messageEl.className = 'game-message loss';
        } else {
          bankroll += wager;
          wins++;
          resultText = `seven-out! don't pass wins +$${wager}`;
          messageEl.className = 'game-message';
        }
        messageEl.textContent = resultText;
        phase = 'come-out';
        point = 0;
        phaseEl.textContent = 'come-out roll';
        pointValEl.textContent = '\u2014';
      } else {
        resultText = `rolled ${total} · need ${point} or 7`;
        messageEl.textContent = resultText;
        messageEl.className = 'game-message';
      }
    }

    rollHistory.push({ d1, d2, result: resultText });
    updateUI();
  }

  function updateUI() {
    bankrollEl.textContent = '$' + bankroll.toLocaleString();
    winsEl.textContent = String(wins);
    lossesEl.textContent = String(losses);

    // Roll history (last 30)
    const recent = rollHistory.slice(-30);
    historyEl.innerHTML = recent
      .map(r => {
        const t = r.d1 + r.d2;
        const cls =
          t === 7 || t === 11
            ? 'craps-dot natural'
            : t === 2 || t === 3 || t === 12
              ? 'craps-dot craps-loss'
              : 'craps-dot';
        return `<span class="${cls}">${t}</span>`;
      })
      .join('');
  }

  function resetGame() {
    phase = 'come-out';
    point = 0;
    bankroll = 1000;
    wins = 0;
    losses = 0;
    rollHistory.length = 0;

    die1El.querySelector('.die-face')!.innerHTML = '';
    die2El.querySelector('.die-face')!.innerHTML = '';
    rollTotalEl.textContent = '\u2014';
    phaseEl.textContent = 'place your bet and roll';
    pointValEl.textContent = '\u2014';
    messageEl.textContent = '';
    messageEl.className = 'game-message';
    historyEl.innerHTML = '';
    updateUI();
  }

  document.getElementById('craps-roll')!.addEventListener('click', doRoll);
  document.getElementById('craps-reset-game')!.addEventListener('click', resetGame);

  // Disable bet type changes during point phase
  document.getElementById('craps-roll')!.addEventListener('click', () => {
    betTypeEl.disabled = phase === 'point' && betTypeEl.value !== 'field';
  });

  // ── Monte Carlo: house edge convergence ──

  const edgeCanvas = document.getElementById('craps-edge-canvas') as HTMLCanvasElement;
  if (!edgeCanvas) return;
  const edgeCtx = edgeCanvas.getContext('2d')!;
  const EW = edgeCanvas.width, EH = edgeCanvas.height;

  interface EdgeSeries {
    label: string;
    color: string;
    theoretical: number;
    points: number[];
  }

  let edgeData: EdgeSeries[] | null = null;

  function simCrapsSession(N: number, samplePoints: number): EdgeSeries[] {
    const passWagered = new Float64Array(N);
    const passReturned = new Float64Array(N);
    const dpWagered = new Float64Array(N);
    const dpReturned = new Float64Array(N);
    const fieldWagered = new Float64Array(N);
    const fieldReturned = new Float64Array(N);

    // For pass/don't pass, simulate full craps rounds
    // Each "bet" is a fully resolved pass/don't pass outcome
    let passIdx = 0;
    let dpIdx = 0;
    while (passIdx < N || dpIdx < N) {
      // Come-out roll
      let d1 = Math.floor(Math.random() * 6) + 1;
      let d2 = Math.floor(Math.random() * 6) + 1;
      let total = d1 + d2;

      if (total === 7 || total === 11) {
        // Natural: pass wins, don't pass loses
        if (passIdx < N) { passWagered[passIdx] = 1; passReturned[passIdx] = 2; passIdx++; }
        if (dpIdx < N) { dpWagered[dpIdx] = 1; dpReturned[dpIdx] = 0; dpIdx++; }
      } else if (total === 2 || total === 3) {
        // Craps: pass loses, don't pass wins
        if (passIdx < N) { passWagered[passIdx] = 1; passReturned[passIdx] = 0; passIdx++; }
        if (dpIdx < N) { dpWagered[dpIdx] = 1; dpReturned[dpIdx] = 2; dpIdx++; }
      } else if (total === 12) {
        // 12: pass loses, don't pass pushes
        if (passIdx < N) { passWagered[passIdx] = 1; passReturned[passIdx] = 0; passIdx++; }
        if (dpIdx < N) { dpWagered[dpIdx] = 1; dpReturned[dpIdx] = 1; dpIdx++; }
      } else {
        // Point phase
        const pt = total;
        for (;;) {
          d1 = Math.floor(Math.random() * 6) + 1;
          d2 = Math.floor(Math.random() * 6) + 1;
          total = d1 + d2;
          if (total === pt) {
            // Point hit: pass wins, don't pass loses
            if (passIdx < N) { passWagered[passIdx] = 1; passReturned[passIdx] = 2; passIdx++; }
            if (dpIdx < N) { dpWagered[dpIdx] = 1; dpReturned[dpIdx] = 0; dpIdx++; }
            break;
          } else if (total === 7) {
            // Seven-out: pass loses, don't pass wins
            if (passIdx < N) { passWagered[passIdx] = 1; passReturned[passIdx] = 0; passIdx++; }
            if (dpIdx < N) { dpWagered[dpIdx] = 1; dpReturned[dpIdx] = 2; dpIdx++; }
            break;
          }
        }
      }
    }

    // Field bets: single-roll resolution
    for (let i = 0; i < N; i++) {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const t = d1 + d2;
      fieldWagered[i] = 1;
      if (t === 2 || t === 12) fieldReturned[i] = 3; // 2:1 + original
      else if (t === 3 || t === 4 || t === 9 || t === 10 || t === 11) fieldReturned[i] = 2;
      else fieldReturned[i] = 0;
    }

    // Build convergence series
    const step = Math.max(1, Math.floor(N / samplePoints));
    const series: EdgeSeries[] = [
      { label: 'pass line', color: '#00d4aa', theoretical: 1.41, points: [] },
      { label: "don't pass", color: '#e8d44d', theoretical: 1.36, points: [] },
      { label: 'field', color: '#e84057', theoretical: 5.56, points: [] },
    ];

    let pw = 0, pr = 0, dw = 0, dr = 0, fw = 0, fr = 0;
    for (let i = 0; i < N; i++) {
      pw += passWagered[i]; pr += passReturned[i];
      dw += dpWagered[i]; dr += dpReturned[i];
      fw += fieldWagered[i]; fr += fieldReturned[i];
      if ((i + 1) % step === 0 || i === N - 1) {
        series[0].points.push(pw > 0 ? ((pw - pr) / pw) * 100 : 0);
        series[1].points.push(dw > 0 ? ((dw - dr) / dw) * 100 : 0);
        series[2].points.push(fw > 0 ? ((fw - fr) / fw) * 100 : 0);
      }
    }

    return series;
  }

  function drawEdgeChart() {
    const pad = { top: 25, right: 20, bottom: 40, left: 55 };
    const pw = EW - pad.left - pad.right;
    const ph = EH - pad.top - pad.bottom;

    edgeCtx.fillStyle = '#111';
    edgeCtx.fillRect(0, 0, EW, EH);

    // Axes
    edgeCtx.strokeStyle = '#333';
    edgeCtx.lineWidth = 1;
    edgeCtx.beginPath();
    edgeCtx.moveTo(pad.left, pad.top);
    edgeCtx.lineTo(pad.left, pad.top + ph);
    edgeCtx.lineTo(pad.left + pw, pad.top + ph);
    edgeCtx.stroke();

    // Y-axis range: -5% to 12%
    const yMin = -5, yMax = 12;
    const yRange = yMax - yMin;

    function yToCanvas(val: number) {
      return pad.top + ph - ((val - yMin) / yRange) * ph;
    }

    // Y labels
    edgeCtx.fillStyle = '#555';
    edgeCtx.font = '10px JetBrains Mono';
    edgeCtx.textAlign = 'right';
    const yStep = niceStep(yRange, 6);
    for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) {
      const y = yToCanvas(v);
      edgeCtx.fillText(v.toFixed(1) + '%', pad.left - 5, y + 3);
      edgeCtx.strokeStyle = '#1a1a1a';
      edgeCtx.beginPath();
      edgeCtx.moveTo(pad.left, y);
      edgeCtx.lineTo(pad.left + pw, y);
      edgeCtx.stroke();
    }

    // Zero line
    edgeCtx.setLineDash([4, 4]);
    edgeCtx.strokeStyle = '#333';
    const yZero = yToCanvas(0);
    edgeCtx.beginPath();
    edgeCtx.moveTo(pad.left, yZero);
    edgeCtx.lineTo(pad.left + pw, yZero);
    edgeCtx.stroke();
    edgeCtx.setLineDash([]);

    if (!edgeData) {
      edgeCtx.fillStyle = '#333';
      edgeCtx.font = '11px JetBrains Mono';
      edgeCtx.textAlign = 'center';
      edgeCtx.fillText('click "run" to simulate house edge convergence', pad.left + pw / 2, pad.top + ph / 2);
      return;
    }

    const nPoints = edgeData[0].points.length;
    if (nPoints === 0) return;

    // Draw theoretical lines
    for (const s of edgeData) {
      const y = yToCanvas(s.theoretical);
      edgeCtx.setLineDash([2, 3]);
      edgeCtx.strokeStyle = s.color + '66';
      edgeCtx.lineWidth = 1;
      edgeCtx.beginPath();
      edgeCtx.moveTo(pad.left, y);
      edgeCtx.lineTo(pad.left + pw, y);
      edgeCtx.stroke();
      edgeCtx.setLineDash([]);
    }

    // Draw series
    for (const s of edgeData) {
      edgeCtx.strokeStyle = s.color;
      edgeCtx.lineWidth = 1.5;
      edgeCtx.beginPath();
      for (let i = 0; i < s.points.length; i++) {
        const x = pad.left + (i / (nPoints - 1)) * pw;
        const y = yToCanvas(s.points[i]);
        if (i === 0) edgeCtx.moveTo(x, y);
        else edgeCtx.lineTo(x, y);
      }
      edgeCtx.stroke();
    }

    // Legend
    edgeCtx.font = '9px JetBrains Mono';
    let lx = pad.left + 8;
    const ly = pad.top + 14;
    for (const s of edgeData) {
      edgeCtx.fillStyle = s.color;
      edgeCtx.fillRect(lx, ly - 5, 12, 3);
      edgeCtx.fillText(s.label + ' (' + s.theoretical.toFixed(2) + '%)', lx + 16, ly);
      lx += edgeCtx.measureText(s.label + ' (' + s.theoretical.toFixed(2) + '%)').width + 30;
    }

    // X-axis label
    edgeCtx.fillStyle = '#555';
    edgeCtx.font = '10px JetBrains Mono';
    edgeCtx.textAlign = 'center';
    edgeCtx.fillText('resolved bets', pad.left + pw / 2, EH - 5);
  }

  const simNEl = document.getElementById('craps-sim-n')!;
  const simPassEl = document.getElementById('craps-sim-pass')!;
  const simDpEl = document.getElementById('craps-sim-dp')!;
  const simFieldEl = document.getElementById('craps-sim-field')!;
  const simCountInput = document.getElementById('craps-sim-count') as HTMLInputElement;

  document.getElementById('craps-sim-run')!.addEventListener('click', () => {
    const N = parseInt(simCountInput.value) || 50000;
    edgeData = simCrapsSession(N, 500);
    simNEl.textContent = shortNum(N);
    const last = (s: EdgeSeries) => s.points[s.points.length - 1];
    simPassEl.textContent = last(edgeData[0]).toFixed(2) + '%';
    simDpEl.textContent = last(edgeData[1]).toFixed(2) + '%';
    simFieldEl.textContent = last(edgeData[2]).toFixed(2) + '%';
    drawEdgeChart();
  });

  document.getElementById('craps-sim-reset')!.addEventListener('click', () => {
    edgeData = null;
    simNEl.textContent = '0';
    simPassEl.textContent = '\u2014';
    simDpEl.textContent = '\u2014';
    simFieldEl.textContent = '\u2014';
    drawEdgeChart();
  });

  drawEdgeChart();

  // ── Bankroll trajectory chart ──

  const trajCanvas = document.getElementById('craps-bankroll-canvas') as HTMLCanvasElement;
  if (!trajCanvas) return;
  const trajCtx = trajCanvas.getContext('2d')!;
  const TW = trajCanvas.width, TH = trajCanvas.height;

  interface TrajData {
    pass: number[][];
    dontpass: number[][];
    field: number[][];
  }

  let trajData: TrajData | null = null;

  function simBankrollTrajectory(sessions: number, betsPerSession: number, startBankroll: number, wagerAmt: number): TrajData {
    const result: TrajData = { pass: [], dontpass: [], field: [] };

    for (let s = 0; s < sessions; s++) {
      // Pass line trajectory
      const passPath = [startBankroll];
      let bal = startBankroll;
      for (let b = 0; b < betsPerSession && bal >= wagerAmt; b++) {
        let d1 = Math.floor(Math.random() * 6) + 1;
        let d2 = Math.floor(Math.random() * 6) + 1;
        let total = d1 + d2;
        if (total === 7 || total === 11) {
          bal += wagerAmt;
        } else if (total === 2 || total === 3 || total === 12) {
          bal -= wagerAmt;
        } else {
          const pt = total;
          for (;;) {
            d1 = Math.floor(Math.random() * 6) + 1;
            d2 = Math.floor(Math.random() * 6) + 1;
            total = d1 + d2;
            if (total === pt) { bal += wagerAmt; break; }
            if (total === 7) { bal -= wagerAmt; break; }
          }
        }
        passPath.push(bal);
      }
      result.pass.push(passPath);

      // Don't pass trajectory
      const dpPath = [startBankroll];
      bal = startBankroll;
      for (let b = 0; b < betsPerSession && bal >= wagerAmt; b++) {
        let d1 = Math.floor(Math.random() * 6) + 1;
        let d2 = Math.floor(Math.random() * 6) + 1;
        let total = d1 + d2;
        if (total === 7 || total === 11) {
          bal -= wagerAmt;
        } else if (total === 2 || total === 3) {
          bal += wagerAmt;
        } else if (total === 12) {
          // push
        } else {
          const pt = total;
          for (;;) {
            d1 = Math.floor(Math.random() * 6) + 1;
            d2 = Math.floor(Math.random() * 6) + 1;
            total = d1 + d2;
            if (total === pt) { bal -= wagerAmt; break; }
            if (total === 7) { bal += wagerAmt; break; }
          }
        }
        dpPath.push(bal);
      }
      result.dontpass.push(dpPath);

      // Field trajectory
      const fieldPath = [startBankroll];
      bal = startBankroll;
      for (let b = 0; b < betsPerSession && bal >= wagerAmt; b++) {
        const fd1 = Math.floor(Math.random() * 6) + 1;
        const fd2 = Math.floor(Math.random() * 6) + 1;
        const ft = fd1 + fd2;
        if (ft === 2 || ft === 12) bal += wagerAmt * 2;
        else if (ft === 3 || ft === 4 || ft === 9 || ft === 10 || ft === 11) bal += wagerAmt;
        else bal -= wagerAmt;
        fieldPath.push(bal);
      }
      result.field.push(fieldPath);
    }

    return result;
  }

  function drawTrajChart() {
    const pad = { top: 20, right: 20, bottom: 40, left: 55 };
    const pw = TW - pad.left - pad.right;
    const ph = TH - pad.top - pad.bottom;

    trajCtx.fillStyle = '#111';
    trajCtx.fillRect(0, 0, TW, TH);

    // Axes
    trajCtx.strokeStyle = '#333';
    trajCtx.lineWidth = 1;
    trajCtx.beginPath();
    trajCtx.moveTo(pad.left, pad.top);
    trajCtx.lineTo(pad.left, pad.top + ph);
    trajCtx.lineTo(pad.left + pw, pad.top + ph);
    trajCtx.stroke();

    if (!trajData) {
      trajCtx.fillStyle = '#333';
      trajCtx.font = '11px JetBrains Mono';
      trajCtx.textAlign = 'center';
      trajCtx.fillText('click "run" to simulate bankroll trajectories', pad.left + pw / 2, pad.top + ph / 2);
      return;
    }

    // Find range
    const allPaths = [...trajData.pass, ...trajData.dontpass, ...trajData.field];
    let maxBets = 0;
    let minBal = Infinity, maxBal = -Infinity;
    for (const p of allPaths) {
      if (p.length > maxBets) maxBets = p.length;
      for (const v of p) {
        if (v < minBal) minBal = v;
        if (v > maxBal) maxBal = v;
      }
    }
    // Add margin
    const balRange = maxBal - minBal || 1;
    minBal -= balRange * 0.05;
    maxBal += balRange * 0.05;

    // Y labels
    trajCtx.fillStyle = '#555';
    trajCtx.font = '10px JetBrains Mono';
    trajCtx.textAlign = 'right';
    const yStep = niceStep(maxBal - minBal, 5);
    for (let v = Math.ceil(minBal / yStep) * yStep; v <= maxBal; v += yStep) {
      const y = pad.top + ph - ((v - minBal) / (maxBal - minBal)) * ph;
      trajCtx.fillText('$' + v.toFixed(0), pad.left - 5, y + 3);
      trajCtx.strokeStyle = '#1a1a1a';
      trajCtx.beginPath();
      trajCtx.moveTo(pad.left, y);
      trajCtx.lineTo(pad.left + pw, y);
      trajCtx.stroke();
    }

    // Draw paths
    const colors: [string, number[][]][] = [
      ['#00d4aa', trajData.pass],
      ['#e8d44d', trajData.dontpass],
      ['#e84057', trajData.field],
    ];

    for (const [color, paths] of colors) {
      for (const path of paths) {
        trajCtx.strokeStyle = color + '40';
        trajCtx.lineWidth = 1;
        trajCtx.beginPath();
        for (let i = 0; i < path.length; i++) {
          const x = pad.left + (i / (maxBets - 1)) * pw;
          const y = pad.top + ph - ((path[i] - minBal) / (maxBal - minBal)) * ph;
          if (i === 0) trajCtx.moveTo(x, y);
          else trajCtx.lineTo(x, y);
        }
        trajCtx.stroke();
      }
    }

    // Start line
    trajCtx.setLineDash([4, 4]);
    trajCtx.strokeStyle = '#555';
    const yStart = pad.top + ph - ((500 - minBal) / (maxBal - minBal)) * ph;
    trajCtx.beginPath();
    trajCtx.moveTo(pad.left, yStart);
    trajCtx.lineTo(pad.left + pw, yStart);
    trajCtx.stroke();
    trajCtx.setLineDash([]);

    // Legend
    trajCtx.font = '9px JetBrains Mono';
    const labels = ['pass line', "don't pass", 'field'];
    const lColors = ['#00d4aa', '#e8d44d', '#e84057'];
    let lx = pad.left + 8;
    for (let i = 0; i < labels.length; i++) {
      trajCtx.fillStyle = lColors[i];
      trajCtx.fillRect(lx, pad.top + 10, 12, 3);
      trajCtx.fillText(labels[i], lx + 16, pad.top + 14);
      lx += trajCtx.measureText(labels[i]).width + 30;
    }

    // X-axis label
    trajCtx.fillStyle = '#555';
    trajCtx.font = '10px JetBrains Mono';
    trajCtx.textAlign = 'center';
    trajCtx.fillText('bet number', pad.left + pw / 2, TH - 5);
  }

  const trajSessionsInput = document.getElementById('craps-traj-sessions') as HTMLInputElement;

  document.getElementById('craps-traj-run')!.addEventListener('click', () => {
    const sessions = parseInt(trajSessionsInput.value) || 20;
    trajData = simBankrollTrajectory(sessions, 200, 500, 10);
    drawTrajChart();
  });

  document.getElementById('craps-traj-reset')!.addEventListener('click', () => {
    trajData = null;
    drawTrajChart();
  });

  drawTrajChart();
}

main();
