import {
  Card, createDeck, shuffleCards, renderCard,
  evaluatePokerHand, comparePokerHands, HAND_NAMES,
  pokerRankValue, HandRank
} from './lib/cards';

// ── best 5 of 7 ──

function bestFiveOfSeven(cards: Card[]): { rank: HandRank; kickers: number[] } {
  let best: { rank: HandRank; kickers: number[] } | null = null;
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const five = cards.filter((_, k) => k !== i && k !== j);
      if (five.length !== 5) continue;
      const result = evaluatePokerHand(five);
      if (!best || comparePokerHands(result, best) > 0) best = result;
    }
  }
  return best!;
}

function bestHand(holeCards: Card[], community: Card[]): { rank: HandRank; kickers: number[] } {
  const all = [...holeCards, ...community];
  if (all.length <= 5) return evaluatePokerHand(all);
  return bestFiveOfSeven(all);
}

// ── types ──

interface Player {
  cards: Card[];
  chips: number;
  bet: number;
  folded: boolean;
  isAI: boolean;
  name: string;
}

type Phase = 'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

// ── state ──

let deck: Card[] = [];
let community: Card[] = [];
let players: Player[] = [];
let pot = 0;
let phase: Phase = 'idle';
let currentPlayerIdx = 0;
let currentBet = 0;
const smallBlind = 5;
const bigBlind = 10;
const raiseAmount = 10;
let dealerPos = 0;
let actionsThisRound = 0;

const dom = {
  communityCards: document.getElementById('community-cards')!,
  playerCards: document.getElementById('player-cards')!,
  handName: document.getElementById('hand-name')!,
  potAmount: document.getElementById('pot-amount')!,
  bankroll: document.getElementById('bankroll')!,
  roundLabel: document.getElementById('round-label')!,
  blindsLabel: document.getElementById('blinds-label')!,
  betControls: document.getElementById('bet-controls')!,
  actionControls: document.getElementById('action-controls')!,
  dealBtn: document.getElementById('deal-btn')!,
  foldBtn: document.getElementById('fold-btn')!,
  checkBtn: document.getElementById('check-btn')!,
  callBtn: document.getElementById('call-btn') as HTMLButtonElement,
  callAmount: document.getElementById('call-amount')!,
  raiseBtn: document.getElementById('raise-btn')!,
  message: document.getElementById('message')!,
  aiCards: [
    document.getElementById('ai-cards-0')!,
    document.getElementById('ai-cards-1')!,
    document.getElementById('ai-cards-2')!,
  ],
  aiStatus: [
    document.getElementById('ai-status-0')!,
    document.getElementById('ai-status-1')!,
    document.getElementById('ai-status-2')!,
  ],
};

// ── helpers ──

function deal(): Card {
  return deck.pop()!;
}

function resetDeck(): void {
  deck = createDeck();
  shuffleCards(deck);
}

function activePlayers(): Player[] {
  return players.filter(p => !p.folded);
}

// ── rendering ──

function renderCommunity(): void {
  dom.communityCards.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    if (i < community.length) {
      dom.communityCards.appendChild(renderCard(community[i], false));
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'playing-card face-down';
      dom.communityCards.appendChild(placeholder);
    }
  }
}

function renderPlayerHand(): void {
  dom.playerCards.innerHTML = '';
  const player = players[0];
  if (!player) return;
  for (const c of player.cards) {
    dom.playerCards.appendChild(renderCard(c, false));
  }
  if (community.length >= 3 && player.cards.length === 2) {
    const result = bestHand(player.cards, community);
    dom.handName.textContent = HAND_NAMES[result.rank];
  } else {
    dom.handName.textContent = '';
  }
}

function renderAIHands(reveal: boolean): void {
  for (let i = 0; i < 3; i++) {
    const ai = players[i + 1];
    dom.aiCards[i].innerHTML = '';
    if (!ai) continue;
    if (ai.folded) {
      dom.aiStatus[i].textContent = 'folded';
      dom.aiStatus[i].className = 'ai-status folded';
      // show placeholder cards grayed out
      for (let j = 0; j < 2; j++) {
        const el = document.createElement('div');
        el.className = 'playing-card face-down folded-card';
        dom.aiCards[i].appendChild(el);
      }
    } else {
      if (reveal && ai.cards.length > 0) {
        for (const c of ai.cards) {
          dom.aiCards[i].appendChild(renderCard(c, false));
        }
        const result = bestHand(ai.cards, community);
        dom.aiStatus[i].textContent = HAND_NAMES[result.rank];
        dom.aiStatus[i].className = 'ai-status';
      } else {
        for (let j = 0; j < ai.cards.length; j++) {
          dom.aiCards[i].appendChild(renderCard(ai.cards[j], true));
        }
        dom.aiStatus[i].textContent = '';
        dom.aiStatus[i].className = 'ai-status';
      }
    }
  }
}

function updateDisplay(): void {
  dom.potAmount.textContent = '$' + pot;
  dom.bankroll.textContent = '$' + players[0].chips.toLocaleString();
  dom.blindsLabel.textContent = smallBlind + '/' + bigBlind;

  const phaseNames: Record<Phase, string> = {
    idle: '--', preflop: 'pre-flop', flop: 'flop',
    turn: 'turn', river: 'river', showdown: 'showdown',
  };
  dom.roundLabel.textContent = phaseNames[phase];

  renderCommunity();
  renderPlayerHand();
  renderAIHands(phase === 'showdown');

  const isPlayerTurn = phase !== 'idle' && phase !== 'showdown' && currentPlayerIdx === 0;
  dom.betControls.style.display = phase === 'idle' ? 'flex' : 'none';
  dom.actionControls.style.display = isPlayerTurn ? 'flex' : 'none';

  if (isPlayerTurn) {
    const toCall = currentBet - players[0].bet;
    if (toCall > 0) {
      dom.checkBtn.style.display = 'none';
      dom.callBtn.style.display = '';
      dom.callAmount.textContent = '$' + toCall;
    } else {
      dom.checkBtn.style.display = '';
      dom.callBtn.style.display = 'none';
    }
  }
}

function setMessage(text: string, isLoss = false): void {
  dom.message.textContent = text;
  dom.message.className = isLoss ? 'loss' : '';
}

// ── AI strategy ──

function aiHandStrength(ai: Player): number {
  // pre-flop: rank-based strength
  if (community.length === 0) {
    const v1 = pokerRankValue(ai.cards[0].rank);
    const v2 = pokerRankValue(ai.cards[1].rank);
    const high = Math.max(v1, v2);
    const low = Math.min(v1, v2);
    const suited = ai.cards[0].suit === ai.cards[1].suit;
    const pair = v1 === v2;

    let strength = 0;
    if (pair) {
      strength = 0.5 + (high / 14) * 0.5; // pairs: 0.5-1.0
    } else {
      strength = (high + low) / 28;
      if (suited) strength += 0.08;
      if (high - low === 1) strength += 0.04; // connectors
    }
    return Math.min(1, strength);
  }

  // post-flop: evaluate hand rank
  const result = bestHand(ai.cards, community);
  // scale rank 0-9 to 0-1
  return result.rank / 9 + 0.05;
}

function aiDecision(ai: Player): 'fold' | 'call' | 'raise' {
  const strength = aiHandStrength(ai);
  const toCall = currentBet - ai.bet;
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;

  // add some randomness
  const noise = (Math.random() - 0.5) * 0.15;
  const adjusted = strength + noise;

  if (toCall === 0) {
    // no bet to call — check or raise
    if (adjusted > 0.7) return 'raise';
    return 'call'; // check
  }

  if (adjusted < 0.25 + potOdds * 0.5) return 'fold';
  if (adjusted > 0.75) return 'raise';
  return 'call';
}

// ── betting ──

function playerBet(player: Player, amount: number): void {
  const actual = Math.min(amount, player.chips);
  player.chips -= actual;
  player.bet += actual;
  pot += actual;
}

function processAction(playerIdx: number, action: 'fold' | 'call' | 'raise'): void {
  const p = players[playerIdx];
  if (action === 'fold') {
    p.folded = true;
  } else if (action === 'call') {
    const toCall = currentBet - p.bet;
    playerBet(p, toCall);
  } else if (action === 'raise') {
    const toCall = currentBet - p.bet;
    playerBet(p, toCall + raiseAmount);
    currentBet = p.bet;
    actionsThisRound = 0; // others need to act again
  }
  actionsThisRound++;
}

// ── game flow ──

function startNewHand(): void {
  resetDeck();
  community = [];
  pot = 0;
  currentBet = 0;
  actionsThisRound = 0;

  const playerChips = players.length > 0 ? players[0].chips : 1000;
  if (playerChips <= 0) {
    setMessage('bankrupt -- refresh to restart', true);
    return;
  }

  players = [
    { cards: [], chips: playerChips, bet: 0, folded: false, isAI: false, name: 'you' },
    { cards: [], chips: 1000, bet: 0, folded: false, isAI: true, name: 'opponent 1' },
    { cards: [], chips: 1000, bet: 0, folded: false, isAI: true, name: 'opponent 2' },
    { cards: [], chips: 1000, bet: 0, folded: false, isAI: true, name: 'opponent 3' },
  ];

  // deal 2 cards each
  for (let round = 0; round < 2; round++) {
    for (const p of players) {
      p.cards.push(deal());
    }
  }

  // post blinds (simplified: player 1 = small, player 2 = big)
  const sbIdx = (dealerPos + 1) % 4;
  const bbIdx = (dealerPos + 2) % 4;
  playerBet(players[sbIdx], smallBlind);
  playerBet(players[bbIdx], bigBlind);
  currentBet = bigBlind;
  dealerPos = (dealerPos + 1) % 4;

  phase = 'preflop';
  currentPlayerIdx = (bbIdx + 1) % 4;
  actionsThisRound = 0;
  setMessage('');
  updateDisplay();

  if (players[currentPlayerIdx].isAI) {
    setTimeout(runAIActions, 400);
  }
}

function runAIActions(): void {
  if (phase === 'idle' || phase === 'showdown') return;
  if (activePlayers().length <= 1) {
    finishHand();
    return;
  }

  while (players[currentPlayerIdx].isAI && (phase as Phase) !== 'idle' && (phase as Phase) !== 'showdown') {
    const ai = players[currentPlayerIdx];

    if (ai.folded) {
      advancePlayer();
      continue;
    }

    const decision = aiDecision(ai);
    processAction(currentPlayerIdx, decision);
    updateDisplay();

    if (activePlayers().length <= 1) {
      finishHand();
      return;
    }

    if (shouldAdvancePhase()) {
      advancePhase();
      if ((phase as Phase) === 'showdown') return;
      if (players[currentPlayerIdx].isAI) continue;
      return;
    }

    advancePlayer();
    if (players[currentPlayerIdx].folded) {
      // skip folded players
      let safety = 0;
      while (players[currentPlayerIdx].folded && safety < 4) {
        advancePlayer();
        safety++;
      }
    }

    if (!players[currentPlayerIdx].isAI) {
      updateDisplay();
      return;
    }
  }

  updateDisplay();
}

function advancePlayer(): void {
  currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
}

function shouldAdvancePhase(): boolean {
  const active = activePlayers();
  if (active.length <= 1) return true;

  // all active players have matched the current bet and everyone has acted
  const allMatched = active.every(p => p.bet >= currentBet || p.chips === 0);
  const allActed = actionsThisRound >= active.length;
  return allMatched && allActed;
}

function advancePhase(): void {
  // reset bets for new round
  for (const p of players) p.bet = 0;
  currentBet = 0;
  actionsThisRound = 0;

  if (phase === 'preflop') {
    community.push(deal(), deal(), deal());
    phase = 'flop';
  } else if (phase === 'flop') {
    community.push(deal());
    phase = 'turn';
  } else if (phase === 'turn') {
    community.push(deal());
    phase = 'river';
  } else if (phase === 'river') {
    showdown();
    return;
  }

  // start from first active player after dealer
  currentPlayerIdx = (dealerPos + 1) % players.length;
  let safety = 0;
  while ((players[currentPlayerIdx].folded || players[currentPlayerIdx].chips === 0) && safety < 4) {
    currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
    safety++;
  }

  updateDisplay();

  if (players[currentPlayerIdx].isAI) {
    setTimeout(runAIActions, 400);
  }
}

function showdown(): void {
  phase = 'showdown';
  updateDisplay();

  const active = activePlayers();
  if (active.length === 0) return;

  // evaluate all hands
  let best: { rank: HandRank; kickers: number[] } | null = null;
  let winners: Player[] = [];

  for (const p of active) {
    const result = bestHand(p.cards, community);
    if (!best || comparePokerHands(result, best) > 0) {
      best = result;
      winners = [p];
    } else if (comparePokerHands(result, best) === 0) {
      winners.push(p);
    }
  }

  const share = Math.floor(pot / winners.length);
  for (const w of winners) {
    w.chips += share;
  }

  const winnerNames = winners.map(w => w.name).join(', ');
  const handDesc = best ? HAND_NAMES[best.rank] : '';
  const playerWon = winners.some(w => !w.isAI);

  if (winners.length === 1) {
    setMessage(winnerNames + ' wins with ' + handDesc + ' ($' + pot + ')', !playerWon);
  } else {
    setMessage('split pot: ' + winnerNames + ' (' + handDesc + ')', false);
  }

  pot = 0;
  phase = 'idle';
  setTimeout(() => {
    dom.betControls.style.display = 'flex';
    dom.actionControls.style.display = 'none';
    updateDisplay();
  }, 100);
}

function finishHand(): void {
  const active = activePlayers();
  if (active.length === 1) {
    const winner = active[0];
    winner.chips += pot;
    const playerWon = !winner.isAI;
    setMessage(winner.name + ' wins $' + pot + ' (others folded)', !playerWon);
    pot = 0;
    phase = 'showdown';
    updateDisplay();
    setTimeout(() => {
      phase = 'idle';
      dom.betControls.style.display = 'flex';
      dom.actionControls.style.display = 'none';
      updateDisplay();
    }, 100);
  } else {
    showdown();
  }
}

// ── player actions ──

function playerFold(): void {
  processAction(0, 'fold');
  updateDisplay();
  if (activePlayers().length <= 1) {
    finishHand();
    return;
  }
  advancePlayer();
  skipFolded();
  if (shouldAdvancePhase()) {
    advancePhase();
  } else if (players[currentPlayerIdx].isAI) {
    setTimeout(runAIActions, 400);
  }
}

function playerCheck(): void {
  processAction(0, 'call');
  updateDisplay();
  advancePlayer();
  skipFolded();
  if (shouldAdvancePhase()) {
    advancePhase();
  } else if (players[currentPlayerIdx].isAI) {
    setTimeout(runAIActions, 400);
  }
}

function playerCall(): void {
  processAction(0, 'call');
  updateDisplay();
  advancePlayer();
  skipFolded();
  if (shouldAdvancePhase()) {
    advancePhase();
  } else if (players[currentPlayerIdx].isAI) {
    setTimeout(runAIActions, 400);
  }
}

function playerRaise(): void {
  processAction(0, 'raise');
  updateDisplay();
  advancePlayer();
  skipFolded();
  if (players[currentPlayerIdx].isAI) {
    setTimeout(runAIActions, 400);
  }
}

function skipFolded(): void {
  let safety = 0;
  while (players[currentPlayerIdx].folded && safety < 4) {
    advancePlayer();
    safety++;
  }
}

// ── monte carlo simulation ──

function mcSimulate(
  hole: Card[],
  numOpponents: number,
  numSims: number,
  onProgress?: (win: number, tie: number, loss: number, n: number) => void
): { win: number; tie: number; loss: number } {
  let wins = 0, ties = 0, losses = 0;
  const progressInterval = Math.max(1, Math.floor(numSims / 100));

  for (let i = 0; i < numSims; i++) {
    const d = createDeck();
    // remove hole cards from deck
    const remaining = d.filter(
      c => !(c.rank === hole[0].rank && c.suit === hole[0].suit) &&
           !(c.rank === hole[1].rank && c.suit === hole[1].suit)
    );
    shuffleCards(remaining);

    let idx = 0;
    // deal community cards
    const comm: Card[] = [];
    for (let j = 0; j < 5; j++) comm.push(remaining[idx++]);

    // deal opponent hands
    const opponents: Card[][] = [];
    for (let o = 0; o < numOpponents; o++) {
      opponents.push([remaining[idx++], remaining[idx++]]);
    }

    // evaluate
    const myHand = bestHand(hole, comm);
    let won = true;
    let tied = false;

    for (const opp of opponents) {
      const oppHand = bestHand(opp, comm);
      const cmp = comparePokerHands(myHand, oppHand);
      if (cmp < 0) { won = false; tied = false; break; }
      if (cmp === 0) { tied = true; }
    }

    if (won && !tied) wins++;
    else if (tied && won) ties++;
    else losses++;

    if (onProgress && (i + 1) % progressInterval === 0) {
      onProgress(wins, ties, losses, i + 1);
    }
  }

  return { win: wins, tie: ties, loss: losses };
}

// ── convergence canvas ──

function drawConvergenceChart(
  canvas: HTMLCanvasElement,
  data: number[],
  label: string
): void {
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;
  const accent = '#00d4aa';
  const dim = '#555';
  const border = '#1e1e1e';
  const surface = '#111';

  ctx.fillStyle = surface;
  ctx.fillRect(0, 0, W, H);

  if (data.length < 2) return;

  const pad = { top: 30, right: 20, bottom: 35, left: 55 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // find range
  let min = Infinity, max = -Infinity;
  for (const v of data) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  min -= range * 0.1;
  max += range * 0.1;

  // grid lines
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  const numGridLines = 5;
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.fillStyle = dim;
  ctx.textAlign = 'right';
  for (let i = 0; i <= numGridLines; i++) {
    const y = pad.top + (plotH * i) / numGridLines;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    const val = max - ((max - min) * i) / numGridLines;
    ctx.fillText((val * 100).toFixed(1) + '%', pad.left - 8, y + 3);
  }

  // x-axis labels
  ctx.textAlign = 'center';
  ctx.fillStyle = dim;
  const xSteps = 4;
  for (let i = 0; i <= xSteps; i++) {
    const x = pad.left + (plotW * i) / xSteps;
    const sample = Math.round((data.length * i) / xSteps);
    ctx.fillText(sample.toLocaleString(), x, H - 8);
  }

  // draw line
  ctx.beginPath();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < data.length; i++) {
    const x = pad.left + (i / (data.length - 1)) * plotW;
    const y = pad.top + plotH - ((data[i] - min) / (max - min)) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // label
  ctx.fillStyle = accent;
  ctx.textAlign = 'left';
  ctx.font = '11px JetBrains Mono, monospace';
  ctx.fillText(label, pad.left + 5, pad.top - 10);
}

// ── bar chart for hand categories ──

function drawCategoryChart(
  canvas: HTMLCanvasElement,
  categories: { name: string; winPct: number }[]
): void {
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;
  const accent = '#00d4aa';
  const dim = '#555';
  const border = '#1e1e1e';
  const surface = '#111';

  ctx.fillStyle = surface;
  ctx.fillRect(0, 0, W, H);

  if (categories.length === 0) return;

  const pad = { top: 20, right: 20, bottom: 80, left: 50 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const barW = plotW / categories.length;
  const maxVal = Math.max(...categories.map(c => c.winPct), 0.01);
  const ceilVal = Math.ceil(maxVal * 10) / 10;

  // grid lines
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.fillStyle = dim;
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + (plotH * i) / 5;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    const val = ceilVal - (ceilVal * i) / 5;
    ctx.fillText((val * 100).toFixed(0) + '%', pad.left - 8, y + 3);
  }

  // bars
  ctx.fillStyle = accent;
  for (let i = 0; i < categories.length; i++) {
    const barH = (categories[i].winPct / ceilVal) * plotH;
    const x = pad.left + i * barW + barW * 0.15;
    const w = barW * 0.7;
    const y = pad.top + plotH - barH;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x, y, w, barH);
    ctx.globalAlpha = 1;

    // value label on bar
    ctx.fillStyle = accent;
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      (categories[i].winPct * 100).toFixed(1) + '%',
      x + w / 2,
      y - 5
    );
    ctx.fillStyle = accent;
  }

  // x labels
  ctx.fillStyle = dim;
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  for (let i = 0; i < categories.length; i++) {
    const x = pad.left + i * barW + barW / 2;
    ctx.save();
    ctx.translate(x, pad.top + plotH + 12);
    ctx.rotate(Math.PI / 4);
    ctx.textAlign = 'left';
    ctx.fillText(categories[i].name, 0, 0);
    ctx.restore();
  }
}

// ── simulation UI ──

function setupSimulation(): void {
  const runBtn = document.getElementById('sim-run')!;
  const resetBtn = document.getElementById('sim-reset')!;
  const winEl = document.getElementById('sim-win')!;
  const tieEl = document.getElementById('sim-tie')!;
  const lossEl = document.getElementById('sim-loss')!;
  const samplesEl = document.getElementById('sim-samples')!;
  const canvas = document.getElementById('equity-canvas') as HTMLCanvasElement;
  const selectedHandEl = document.getElementById('sim-selected-hand')!;

  function getSelectedCards(): Card[] {
    const r1 = (document.getElementById('sim-rank1') as HTMLSelectElement).value;
    const s1 = (document.getElementById('sim-suit1') as HTMLSelectElement).value;
    const r2 = (document.getElementById('sim-rank2') as HTMLSelectElement).value;
    const s2 = (document.getElementById('sim-suit2') as HTMLSelectElement).value;
    return [{ rank: r1, suit: s1 }, { rank: r2, suit: s2 }];
  }

  function renderSelectedHand(): void {
    const cards = getSelectedCards();
    selectedHandEl.innerHTML = '';
    for (const c of cards) {
      selectedHandEl.appendChild(renderCard(c, false));
    }
  }

  // update preview when selectors change
  ['sim-rank1', 'sim-suit1', 'sim-rank2', 'sim-suit2'].forEach(id => {
    document.getElementById(id)!.addEventListener('change', renderSelectedHand);
  });
  renderSelectedHand();

  runBtn.addEventListener('click', () => {
    const cards = getSelectedCards();
    if (cards[0].rank === cards[1].rank && cards[0].suit === cards[1].suit) {
      setMessage('pick two different cards');
      return;
    }

    const numOpp = parseInt((document.getElementById('sim-opponents') as HTMLInputElement).value) || 3;
    const numSims = parseInt((document.getElementById('sim-count') as HTMLInputElement).value) || 10000;
    const convergenceData: number[] = [];

    runBtn.setAttribute('disabled', 'true');

    // run async in chunks to keep UI responsive
    let completed = 0;
    let wins = 0, tiesTotal = 0, lossesTotal = 0;
    const chunkSize = 200;

    function runChunk(): void {
      const end = Math.min(completed + chunkSize, numSims);
      for (let i = completed; i < end; i++) {
        const d = createDeck();
        const remaining = d.filter(
          c => !(c.rank === cards[0].rank && c.suit === cards[0].suit) &&
               !(c.rank === cards[1].rank && c.suit === cards[1].suit)
        );
        shuffleCards(remaining);

        let idx = 0;
        const comm: Card[] = [];
        for (let j = 0; j < 5; j++) comm.push(remaining[idx++]);
        const opponents: Card[][] = [];
        for (let o = 0; o < numOpp; o++) {
          opponents.push([remaining[idx++], remaining[idx++]]);
        }

        const myHand = bestHand(cards, comm);
        let won = true;
        let tied = false;
        for (const opp of opponents) {
          const oppHand = bestHand(opp, comm);
          const cmp = comparePokerHands(myHand, oppHand);
          if (cmp < 0) { won = false; tied = false; break; }
          if (cmp === 0) { tied = true; }
        }
        if (won && !tied) wins++;
        else if (tied && won) tiesTotal++;
        else lossesTotal++;
      }

      completed = end;
      const total = wins + tiesTotal + lossesTotal;
      const winPct = wins / total;
      const tiePct = tiesTotal / total;
      const lossPct = lossesTotal / total;

      convergenceData.push(winPct);

      winEl.textContent = (winPct * 100).toFixed(2) + '%';
      tieEl.textContent = (tiePct * 100).toFixed(2) + '%';
      lossEl.textContent = (lossPct * 100).toFixed(2) + '%';
      samplesEl.textContent = total.toLocaleString();

      drawConvergenceChart(canvas, convergenceData, 'win % convergence');

      if (completed < numSims) {
        requestAnimationFrame(runChunk);
      } else {
        runBtn.removeAttribute('disabled');
      }
    }

    // reset
    wins = 0; tiesTotal = 0; lossesTotal = 0;
    convergenceData.length = 0;
    runChunk();
  });

  resetBtn.addEventListener('click', () => {
    winEl.textContent = '--';
    tieEl.textContent = '--';
    lossEl.textContent = '--';
    samplesEl.textContent = '0';
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });
}

// ── category simulation ──

function setupCategorySimulation(): void {
  const catBtn = document.getElementById('cat-run')!;
  const catCanvas = document.getElementById('category-canvas') as HTMLCanvasElement;

  const categories = [
    { name: 'AA', cards: [{ rank: 'A', suit: '♠' }, { rank: 'A', suit: '♥' }] },
    { name: 'KK', cards: [{ rank: 'K', suit: '♠' }, { rank: 'K', suit: '♥' }] },
    { name: 'QQ', cards: [{ rank: 'Q', suit: '♠' }, { rank: 'Q', suit: '♥' }] },
    { name: 'AKs', cards: [{ rank: 'A', suit: '♠' }, { rank: 'K', suit: '♠' }] },
    { name: 'AKo', cards: [{ rank: 'A', suit: '♠' }, { rank: 'K', suit: '♥' }] },
    { name: 'JJ', cards: [{ rank: 'J', suit: '♠' }, { rank: 'J', suit: '♥' }] },
    { name: 'AQs', cards: [{ rank: 'A', suit: '♠' }, { rank: 'Q', suit: '♠' }] },
    { name: 'TT', cards: [{ rank: '10', suit: '♠' }, { rank: '10', suit: '♥' }] },
    { name: 'KQs', cards: [{ rank: 'K', suit: '♠' }, { rank: 'Q', suit: '♠' }] },
    { name: '88', cards: [{ rank: '8', suit: '♠' }, { rank: '8', suit: '♥' }] },
    { name: 'AJs', cards: [{ rank: 'A', suit: '♠' }, { rank: 'J', suit: '♠' }] },
    { name: '55', cards: [{ rank: '5', suit: '♠' }, { rank: '5', suit: '♥' }] },
    { name: 'T9s', cards: [{ rank: '10', suit: '♠' }, { rank: '9', suit: '♠' }] },
    { name: '72o', cards: [{ rank: '7', suit: '♠' }, { rank: '2', suit: '♥' }] },
  ];

  catBtn.addEventListener('click', () => {
    catBtn.setAttribute('disabled', 'true');
    const results: { name: string; winPct: number }[] = [];
    let catIdx = 0;
    const simsPerCat = 3000;

    function runNextCategory(): void {
      if (catIdx >= categories.length) {
        drawCategoryChart(catCanvas, results);
        catBtn.removeAttribute('disabled');
        return;
      }

      const cat = categories[catIdx];
      const result = mcSimulate(cat.cards, 3, simsPerCat);
      results.push({
        name: cat.name,
        winPct: result.win / simsPerCat,
      });

      catIdx++;
      drawCategoryChart(catCanvas, results);
      requestAnimationFrame(runNextCategory);
    }

    results.length = 0;
    runNextCategory();
  });
}

// ── init ──

function main(): void {
  players = [
    { cards: [], chips: 1000, bet: 0, folded: false, isAI: false, name: 'you' },
    { cards: [], chips: 1000, bet: 0, folded: false, isAI: true, name: 'opponent 1' },
    { cards: [], chips: 1000, bet: 0, folded: false, isAI: true, name: 'opponent 2' },
    { cards: [], chips: 1000, bet: 0, folded: false, isAI: true, name: 'opponent 3' },
  ];

  updateDisplay();

  dom.dealBtn.addEventListener('click', startNewHand);
  dom.foldBtn.addEventListener('click', playerFold);
  dom.checkBtn.addEventListener('click', playerCheck);
  dom.callBtn.addEventListener('click', playerCall);
  dom.raiseBtn.addEventListener('click', playerRaise);

  setupSimulation();
  setupCategorySimulation();
}

main();
