export {};

function main() {
  'use strict';

  type Move = 'C' | 'D';
  const PAYOFF: Record<string, [number, number]> = { CC: [3, 3], CD: [0, 5], DC: [5, 0], DD: [1, 1] };

  interface Strategy {
    name: string;
    fn: (my: Move[], their: Move[]) => Move;
  }

  const STRATEGIES: Record<string, Strategy> = {
    'tit-for-tat': {
      name: 'tit for tat',
      fn: (_my, their) => their.length === 0 ? 'C' : their[their.length - 1],
    },
    'always-cooperate': {
      name: 'always cooperate',
      fn: () => 'C',
    },
    'always-defect': {
      name: 'always defect',
      fn: () => 'D',
    },
    'grudger': {
      name: 'grudger',
      fn: (_my, their) => their.includes('D') ? 'D' : 'C',
    },
    'random': {
      name: 'random',
      fn: () => Math.random() < 0.5 ? 'C' : 'D',
    },
    'pavlov': {
      name: 'pavlov',
      fn: (my, their) => {
        if (my.length === 0) return 'C';
        const p = PAYOFF[my[my.length - 1] + their[their.length - 1]][0];
        return p >= 3 ? my[my.length - 1] : (my[my.length - 1] === 'C' ? 'D' : 'C');
      },
    },
    'tit-for-two-tats': {
      name: 'tit for two tats',
      fn: (_my, their) => {
        if (their.length < 2) return 'C';
        return (their[their.length - 1] === 'D' && their[their.length - 2] === 'D') ? 'D' : 'C';
      },
    },
  };

  const strategiesEl = document.getElementById('pd-strategies')!;
  const roundsInput = document.getElementById('pd-rounds') as HTMLInputElement | null;
  const noiseInput = document.getElementById('pd-noise') as HTMLInputElement | null;
  const canvas = document.getElementById('pd-canvas') as HTMLCanvasElement;
  const matchupsEl = document.getElementById('pd-matchups')!;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const CW = canvas.width, CH = canvas.height;

  interface TournamentResult {
    scores: Record<string, number>;
    matchups: Record<string, Record<string, number>>;
    sorted: string[];
    rounds: number;
  }

  let results: TournamentResult | null = null;

  function getSelected(): string[] {
    return Array.from(strategiesEl.querySelectorAll('input:checked')).map(cb => (cb as HTMLInputElement).value);
  }

  function applyNoise(move: Move, rate: number): Move {
    return Math.random() < rate ? (move === 'C' ? 'D' : 'C') : move;
  }

  function playMatch(s1Key: string, s2Key: string, rounds: number, noise: number) {
    const s1 = STRATEGIES[s1Key], s2 = STRATEGIES[s2Key];
    const h1: Move[] = [], h2: Move[] = [];
    let score1 = 0, score2 = 0;

    for (let r = 0; r < rounds; r++) {
      const m1 = applyNoise(s1.fn(h1, h2), noise);
      const m2 = applyNoise(s2.fn(h2, h1), noise);
      score1 += PAYOFF[m1 + m2][0];
      score2 += PAYOFF[m1 + m2][1];
      h1.push(m1);
      h2.push(m2);
    }
    return { score1, score2 };
  }

  function runTournament(): TournamentResult | null {
    const selected = getSelected();
    if (selected.length < 2) return null;
    const rounds = parseInt(roundsInput?.value ?? '200') || 200;
    const noise = (parseInt(noiseInput?.value ?? '0') || 0) / 100;

    const scores: Record<string, number> = {};
    const matchups: Record<string, Record<string, number>> = {};
    selected.forEach(s => { scores[s] = 0; matchups[s] = {}; });

    for (let i = 0; i < selected.length; i++) {
      for (let j = i; j < selected.length; j++) {
        const r = playMatch(selected[i], selected[j], rounds, noise);
        scores[selected[i]] += r.score1;
        scores[selected[j]] += r.score2;
        matchups[selected[i]][selected[j]] = r.score1;
        if (i !== j) matchups[selected[j]][selected[i]] = r.score2;
      }
    }

    const sorted = selected.slice().sort((a, b) => scores[b] - scores[a]);
    return { scores, matchups, sorted, rounds };
  }

  function drawResults() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, CW, CH);

    if (!results) {
      ctx.fillStyle = '#333';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('select strategies and run tournament', CW / 2, CH / 2);
      return;
    }

    const { scores, sorted } = results;
    const maxScore = Math.max(...sorted.map(s => scores[s]));
    const pad = { top: 15, right: 20, bottom: 10, left: 130 };
    const pw = CW - pad.left - pad.right;
    const ph = CH - pad.top - pad.bottom;
    const barH = Math.min(30, (ph - (sorted.length - 1) * 6) / sorted.length);
    const gap = 6;
    const totalH = sorted.length * barH + (sorted.length - 1) * gap;
    const startY = pad.top + (ph - totalH) / 2;

    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      const y = startY + i * (barH + gap);
      const w = maxScore > 0 ? (scores[s] / maxScore) * pw : 0;

      ctx.fillStyle = i === 0 ? '#00d4aa' : (i === sorted.length - 1 ? '#e84057' : '#2a2a2a');
      ctx.fillRect(pad.left, y, w, barH);

      ctx.fillStyle = '#888';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(STRATEGIES[s].name, pad.left - 8, y + barH / 2 + 4);

      ctx.fillStyle = '#c8c8c8';
      ctx.textAlign = 'left';
      ctx.fillText(scores[s].toLocaleString(), pad.left + w + 6, y + barH / 2 + 4);
    }
  }

  function renderMatchups() {
    if (!results) { matchupsEl.innerHTML = ''; return; }
    const { matchups, sorted, rounds } = results;

    let html = '<div class="pd-matrix"><div class="pd-matrix-row pd-matrix-header"><span class="pd-row-label"></span>';
    sorted.forEach(s => {
      const short = STRATEGIES[s].name.split(' ').map(w => w[0]).join('').toUpperCase();
      html += '<span class="pd-cell pd-head" title="' + STRATEGIES[s].name + '">' + short + '</span>';
    });
    html += '</div>';

    sorted.forEach(s1 => {
      html += '<div class="pd-matrix-row"><span class="pd-row-label">' + STRATEGIES[s1].name + '</span>';
      sorted.forEach(s2 => {
        const score = matchups[s1]?.[s2];
        if (score !== undefined) {
          const avg = (score / rounds).toFixed(1);
          html += '<span class="pd-cell" title="' + score + ' total">' + avg + '</span>';
        } else {
          html += '<span class="pd-cell">\u2014</span>';
        }
      });
      html += '</div>';
    });
    html += '</div>';
    matchupsEl.innerHTML = html;
  }

  document.getElementById('pd-run')!.addEventListener('click', () => {
    results = runTournament();
    drawResults();
    renderMatchups();
  });

  drawResults();
}

main();
