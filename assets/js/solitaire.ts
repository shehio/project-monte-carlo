import { Card, createDeck, shuffleCards, RED_SUITS, RANKS, SUITS } from './lib/cards';

function main() {
  // ── helpers ──

  const RANK_ORDER = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

  function rankIndex(rank: string): number {
    return RANK_ORDER.indexOf(rank);
  }

  function isRed(card: Card): boolean {
    return RED_SUITS.has(card.suit);
  }

  function canPlaceOnFoundation(card: Card, topCard: Card | null): boolean {
    if (!topCard) return card.rank === 'A';
    if (card.suit !== topCard.suit) return false;
    return rankIndex(card.rank) === rankIndex(topCard.rank) + 1;
  }

  function canPlaceOnTableau(card: Card, topCard: Card | null): boolean {
    if (!topCard) return card.rank === 'K';
    if (isRed(card) === isRed(topCard)) return false;
    return rankIndex(card.rank) === rankIndex(topCard.rank) - 1;
  }

  // ── card rendering ──

  function renderSolCard(card: Card, faceDown: boolean): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'playing-card';
    if (faceDown) {
      el.classList.add('face-down');
      return el;
    }
    if (isRed(card)) el.classList.add('red');
    const top = document.createElement('div');
    top.className = 'rank-suit';
    top.textContent = card.rank + card.suit;
    const center = document.createElement('div');
    center.className = 'center-suit';
    center.textContent = card.suit;
    const bottom = document.createElement('div');
    bottom.className = 'rank-suit-flip';
    bottom.textContent = card.rank + card.suit;
    el.append(top, center, bottom);
    return el;
  }

  // ── game state ──

  interface TableauColumn {
    faceDown: Card[];
    faceUp: Card[];
  }

  interface GameState {
    stock: Card[];
    waste: Card[];
    foundations: (Card | null)[][];
    tableau: TableauColumn[];
    stockPasses: number;
    moveCount: number;
  }

  let state: GameState;
  let selected: { source: string; colIdx?: number; cardIdx?: number } | null = null;
  let undoStack: string[] = [];

  function newGame(): void {
    const deck = createDeck();
    shuffleCards(deck);

    const tableau: TableauColumn[] = [];
    let idx = 0;
    for (let c = 0; c < 7; c++) {
      const faceDown: Card[] = [];
      for (let r = 0; r < c; r++) {
        faceDown.push(deck[idx++]);
      }
      const faceUp: Card[] = [deck[idx++]];
      tableau.push({ faceDown, faceUp });
    }

    state = {
      stock: deck.slice(idx),
      waste: [],
      foundations: [[], [], [], []],
      tableau,
      stockPasses: 0,
      moveCount: 0,
    };

    selected = null;
    undoStack = [];
    messageEl.textContent = '';
    messageEl.className = 'game-message';
    render();
  }

  function saveUndo(): void {
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > 200) undoStack.shift();
  }

  function undo(): void {
    if (undoStack.length === 0) return;
    state = JSON.parse(undoStack.pop()!);
    selected = null;
    messageEl.textContent = '';
    messageEl.className = 'game-message';
    render();
  }

  function foundationTop(fIdx: number): Card | null {
    const pile = state.foundations[fIdx];
    return pile.length > 0 ? pile[pile.length - 1] : null;
  }

  function tableauTop(col: TableauColumn): Card | null {
    return col.faceUp.length > 0 ? col.faceUp[col.faceUp.length - 1] : null;
  }

  function flipTopCard(col: TableauColumn): void {
    if (col.faceUp.length === 0 && col.faceDown.length > 0) {
      col.faceUp.push(col.faceDown.pop()!);
    }
  }

  function foundationCount(): number {
    return state.foundations.reduce((s, f) => s + f.length, 0);
  }

  function checkWin(): boolean {
    return foundationCount() === 52;
  }

  // ── auto-move to foundation ──

  function tryAutoFoundation(card: Card): number {
    for (let f = 0; f < 4; f++) {
      if (canPlaceOnFoundation(card, foundationTop(f))) return f;
    }
    return -1;
  }

  // ── draw from stock ──

  function drawStock(): void {
    if (state.stock.length === 0) {
      if (state.waste.length === 0) return;
      saveUndo();
      state.stock = state.waste.reverse();
      state.waste = [];
      state.stockPasses++;
      state.moveCount++;
    } else {
      saveUndo();
      state.waste.push(state.stock.pop()!);
      state.moveCount++;
    }
    selected = null;
    render();
  }

  // ── click handling ──

  function handleWasteClick(): void {
    if (state.waste.length === 0) return;
    const card = state.waste[state.waste.length - 1];

    if (selected && selected.source === 'waste') {
      selected = null;
      render();
      return;
    }

    // Try auto-move to foundation
    const fIdx = tryAutoFoundation(card);
    if (fIdx >= 0) {
      saveUndo();
      state.foundations[fIdx].push(state.waste.pop()!);
      state.moveCount++;
      selected = null;
      if (checkWin()) showWin();
      render();
      return;
    }

    // Try auto-move to tableau
    for (let c = 0; c < 7; c++) {
      const top = tableauTop(state.tableau[c]);
      if (canPlaceOnTableau(card, top)) {
        saveUndo();
        state.tableau[c].faceUp.push(state.waste.pop()!);
        state.moveCount++;
        selected = null;
        render();
        return;
      }
    }

    // Select for manual placement
    selected = { source: 'waste' };
    render();
  }

  function handleFoundationClick(fIdx: number): void {
    if (selected) {
      // Try to place selected card on this foundation
      let card: Card | null = null;
      if (selected.source === 'waste' && state.waste.length > 0) {
        card = state.waste[state.waste.length - 1];
      } else if (selected.source === 'tableau' && selected.colIdx !== undefined && selected.cardIdx !== undefined) {
        const col = state.tableau[selected.colIdx];
        if (selected.cardIdx === col.faceUp.length - 1) {
          card = col.faceUp[col.faceUp.length - 1];
        }
      }

      if (card && canPlaceOnFoundation(card, foundationTop(fIdx))) {
        saveUndo();
        if (selected.source === 'waste') {
          state.foundations[fIdx].push(state.waste.pop()!);
        } else if (selected.source === 'tableau' && selected.colIdx !== undefined) {
          const col = state.tableau[selected.colIdx];
          state.foundations[fIdx].push(col.faceUp.pop()!);
          flipTopCard(col);
        }
        state.moveCount++;
        selected = null;
        if (checkWin()) showWin();
        render();
        return;
      }

      selected = null;
      render();
      return;
    }
  }

  function handleTableauClick(colIdx: number, cardIdx: number): void {
    const col = state.tableau[colIdx];

    // Clicking a face-down card does nothing useful
    if (cardIdx < 0) {
      selected = null;
      render();
      return;
    }

    // If something is already selected, try to place it
    if (selected) {
      const targetTop = tableauTop(col);

      if (selected.source === 'waste' && state.waste.length > 0) {
        const card = state.waste[state.waste.length - 1];
        if (canPlaceOnTableau(card, targetTop)) {
          saveUndo();
          col.faceUp.push(state.waste.pop()!);
          state.moveCount++;
          selected = null;
          render();
          return;
        }
      } else if (selected.source === 'tableau' && selected.colIdx !== undefined && selected.cardIdx !== undefined) {
        if (selected.colIdx === colIdx) {
          // Clicking the same column — try auto-move the top card
          if (cardIdx === col.faceUp.length - 1) {
            const card = col.faceUp[col.faceUp.length - 1];
            const fIdx = tryAutoFoundation(card);
            if (fIdx >= 0) {
              saveUndo();
              state.foundations[fIdx].push(col.faceUp.pop()!);
              flipTopCard(col);
              state.moveCount++;
              selected = null;
              if (checkWin()) showWin();
              render();
              return;
            }
          }
          selected = null;
          render();
          return;
        }

        const srcCol = state.tableau[selected.colIdx];
        const movingCards = srcCol.faceUp.slice(selected.cardIdx);
        const firstCard = movingCards[0];

        if (canPlaceOnTableau(firstCard, targetTop)) {
          saveUndo();
          srcCol.faceUp.splice(selected.cardIdx);
          col.faceUp.push(...movingCards);
          flipTopCard(srcCol);
          state.moveCount++;
          selected = null;
          render();
          return;
        }
      }

      selected = null;
      render();
      return;
    }

    // Nothing selected — select this card (or auto-move single card)
    const card = col.faceUp[cardIdx];

    // If top card, try auto-move to foundation first
    if (cardIdx === col.faceUp.length - 1) {
      const fIdx = tryAutoFoundation(card);
      if (fIdx >= 0) {
        saveUndo();
        state.foundations[fIdx].push(col.faceUp.pop()!);
        flipTopCard(col);
        state.moveCount++;
        selected = null;
        if (checkWin()) showWin();
        render();
        return;
      }
    }

    // If single top card, try auto-move to valid tableau
    if (cardIdx === col.faceUp.length - 1) {
      for (let c = 0; c < 7; c++) {
        if (c === colIdx) continue;
        if (canPlaceOnTableau(card, tableauTop(state.tableau[c]))) {
          saveUndo();
          state.tableau[c].faceUp.push(col.faceUp.pop()!);
          flipTopCard(col);
          state.moveCount++;
          selected = null;
          render();
          return;
        }
      }
    }

    // Select for manual multi-card move
    selected = { source: 'tableau', colIdx, cardIdx };
    render();
  }

  function handleEmptyTableauClick(colIdx: number): void {
    if (!selected) return;

    if (selected.source === 'waste' && state.waste.length > 0) {
      const card = state.waste[state.waste.length - 1];
      if (card.rank === 'K') {
        saveUndo();
        state.tableau[colIdx].faceUp.push(state.waste.pop()!);
        state.moveCount++;
        selected = null;
        render();
        return;
      }
    } else if (selected.source === 'tableau' && selected.colIdx !== undefined && selected.cardIdx !== undefined) {
      const srcCol = state.tableau[selected.colIdx];
      const firstCard = srcCol.faceUp[selected.cardIdx];
      if (firstCard.rank === 'K') {
        saveUndo();
        const movingCards = srcCol.faceUp.splice(selected.cardIdx);
        state.tableau[colIdx].faceUp.push(...movingCards);
        flipTopCard(srcCol);
        state.moveCount++;
        selected = null;
        render();
        return;
      }
    }

    selected = null;
    render();
  }

  function showWin(): void {
    messageEl.textContent = 'you win!';
    messageEl.className = 'game-message';
  }

  // ── DOM references ──

  const messageEl = document.getElementById('sol-message')!;
  const movesEl = document.getElementById('sol-moves')!;
  const passesEl = document.getElementById('sol-passes')!;
  const foundCountEl = document.getElementById('sol-found-count')!;

  // ── rendering ──

  function render(): void {
    // Stats
    movesEl.textContent = String(state.moveCount);
    passesEl.textContent = String(state.stockPasses);
    foundCountEl.textContent = foundationCount() + ' / 52';

    // Stock
    const stockEl = document.getElementById('sol-stock')!;
    stockEl.innerHTML = '';
    if (state.stock.length > 0) {
      const cardEl = renderSolCard(state.stock[state.stock.length - 1], true);
      cardEl.classList.add('sol-clickable');
      stockEl.appendChild(cardEl);
    } else {
      const empty = document.createElement('div');
      empty.className = 'sol-empty-pile sol-clickable';
      empty.textContent = '\u21BB';
      stockEl.appendChild(empty);
    }
    stockEl.onclick = () => drawStock();

    // Waste
    const wasteEl = document.getElementById('sol-waste')!;
    wasteEl.innerHTML = '';
    if (state.waste.length > 0) {
      const card = state.waste[state.waste.length - 1];
      const cardEl = renderSolCard(card, false);
      cardEl.classList.add('sol-clickable');
      if (selected && selected.source === 'waste') cardEl.classList.add('sol-selected');
      wasteEl.appendChild(cardEl);
    }
    wasteEl.onclick = () => handleWasteClick();

    // Foundations
    for (let f = 0; f < 4; f++) {
      const fEl = document.getElementById('sol-f' + f)!;
      fEl.innerHTML = '';
      const pile = state.foundations[f];
      if (pile.length > 0) {
        const cardEl = renderSolCard(pile[pile.length - 1]!, false);
        fEl.appendChild(cardEl);
      } else {
        const empty = document.createElement('div');
        empty.className = 'sol-empty-pile';
        empty.textContent = SUITS[f];
        fEl.appendChild(empty);
      }
      fEl.onclick = () => handleFoundationClick(f);
    }

    // Tableau
    for (let c = 0; c < 7; c++) {
      const colEl = document.getElementById('sol-t' + c)!;
      colEl.innerHTML = '';
      const col = state.tableau[c];

      if (col.faceDown.length === 0 && col.faceUp.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'sol-empty-pile sol-clickable';
        colEl.appendChild(empty);
        colEl.onclick = () => handleEmptyTableauClick(c);
        continue;
      }

      colEl.onclick = null;

      // Face-down cards
      for (let i = 0; i < col.faceDown.length; i++) {
        const cardEl = renderSolCard(col.faceDown[i], true);
        cardEl.style.top = (i * 18) + 'px';
        cardEl.classList.add('sol-stacked');
        colEl.appendChild(cardEl);
      }

      // Face-up cards
      const baseOffset = col.faceDown.length * 18;
      for (let i = 0; i < col.faceUp.length; i++) {
        const cardEl = renderSolCard(col.faceUp[i], false);
        cardEl.style.top = (baseOffset + i * 26) + 'px';
        cardEl.classList.add('sol-stacked', 'sol-clickable');

        if (selected && selected.source === 'tableau' &&
            selected.colIdx === c && selected.cardIdx !== undefined &&
            i >= selected.cardIdx) {
          cardEl.classList.add('sol-selected');
        }

        const cardIndex = i;
        const colIndex = c;
        cardEl.addEventListener('click', (e) => {
          e.stopPropagation();
          handleTableauClick(colIndex, cardIndex);
        });

        colEl.appendChild(cardEl);
      }

      // Set column height for proper spacing
      const lastOffset = col.faceDown.length * 18 + (col.faceUp.length - 1) * 26;
      colEl.style.minHeight = (lastOffset + 100) + 'px';

      // Handle click on empty area of column (for Kings)
      if (col.faceUp.length === 0 && col.faceDown.length === 0) {
        colEl.addEventListener('click', () => handleEmptyTableauClick(c));
      }
    }
  }

  // ── events ──

  document.getElementById('sol-new')!.addEventListener('click', newGame);
  document.getElementById('sol-undo')!.addEventListener('click', undo);

  // ── Monte Carlo simulation ──

  interface SimCard {
    rank: string;
    suit: string;
  }

  interface SimColumn {
    faceDown: SimCard[];
    faceUp: SimCard[];
  }

  interface SimState {
    stock: SimCard[];
    waste: SimCard[];
    foundations: SimCard[][];
    tableau: SimColumn[];
    stockPasses: number;
  }

  function simCreateDeck(): SimCard[] {
    const cards: SimCard[] = [];
    for (const suit of SUITS)
      for (const rank of RANKS)
        cards.push({ rank, suit });
    return cards;
  }

  function simShuffle(arr: SimCard[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
  }

  function simDeal(): SimState {
    const deck = simCreateDeck();
    simShuffle(deck);
    const tableau: SimColumn[] = [];
    let idx = 0;
    for (let c = 0; c < 7; c++) {
      const faceDown: SimCard[] = [];
      for (let r = 0; r < c; r++) faceDown.push(deck[idx++]);
      const faceUp: SimCard[] = [deck[idx++]];
      tableau.push({ faceDown, faceUp });
    }
    return {
      stock: deck.slice(idx),
      waste: [],
      foundations: [[], [], [], []],
      tableau,
      stockPasses: 0,
    };
  }

  function simFoundTop(s: SimState, f: number): SimCard | null {
    return s.foundations[f].length > 0 ? s.foundations[f][s.foundations[f].length - 1] : null;
  }

  function simTabTop(col: SimColumn): SimCard | null {
    return col.faceUp.length > 0 ? col.faceUp[col.faceUp.length - 1] : null;
  }

  function simFlip(col: SimColumn): void {
    if (col.faceUp.length === 0 && col.faceDown.length > 0) {
      col.faceUp.push(col.faceDown.pop()!);
    }
  }

  function simCanFoundation(card: SimCard, top: SimCard | null): boolean {
    if (!top) return card.rank === 'A';
    if (card.suit !== top.suit) return false;
    return rankIndex(card.rank) === rankIndex(top.rank) + 1;
  }

  function simCanTableau(card: SimCard, top: SimCard | null): boolean {
    if (!top) return card.rank === 'K';
    if (RED_SUITS.has(card.suit) === RED_SUITS.has(top.suit)) return false;
    return rankIndex(card.rank) === rankIndex(top.rank) - 1;
  }

  function simFoundCount(s: SimState): number {
    return s.foundations.reduce((sum, f) => sum + f.length, 0);
  }

  // Check if moving a card to the foundation is "safe" — all lower-rank cards
  // of opposite color are already on foundations
  function isFoundationSafe(s: SimState, card: SimCard): boolean {
    const ri = rankIndex(card.rank);
    if (ri <= 1) return true; // Aces and 2s always safe
    const cardIsRed = RED_SUITS.has(card.suit);
    // Check that opposite-color cards of rank-1 are on foundations
    let minOpposite = 13;
    for (let f = 0; f < 4; f++) {
      const pile = s.foundations[f];
      const topRank = pile.length > 0 ? rankIndex(pile[pile.length - 1].rank) : -1;
      const fSuit = pile.length > 0 ? pile[pile.length - 1].suit : null;
      // Determine which suit this foundation is for
      if (pile.length === 0) {
        minOpposite = -1;
        continue;
      }
      const fIsRed = RED_SUITS.has(fSuit!);
      if (fIsRed !== cardIsRed) {
        minOpposite = Math.min(minOpposite, topRank);
      }
    }
    // If we haven't found both opposite foundations, be conservative
    return ri <= minOpposite + 2;
  }

  function simulateGame(foundationFirst: boolean): boolean {
    const s = simDeal();
    let stuck = 0;
    const maxMoves = 1000;
    let moves = 0;

    while (simFoundCount(s) < 52 && moves < maxMoves) {
      let moved = false;

      // Phase 1: Move to foundations
      if (foundationFirst) {
        // Always try foundation moves
        for (let pass = 0; pass < 2 && !moved; pass++) {
          // Check tableau tops
          for (let c = 0; c < 7; c++) {
            const top = simTabTop(s.tableau[c]);
            if (!top) continue;
            for (let f = 0; f < 4; f++) {
              if (simCanFoundation(top, simFoundTop(s, f))) {
                s.foundations[f].push(s.tableau[c].faceUp.pop()!);
                simFlip(s.tableau[c]);
                moved = true;
                break;
              }
            }
            if (moved) break;
          }
          // Check waste
          if (!moved && s.waste.length > 0) {
            const wTop = s.waste[s.waste.length - 1];
            for (let f = 0; f < 4; f++) {
              if (simCanFoundation(wTop, simFoundTop(s, f))) {
                s.foundations[f].push(s.waste.pop()!);
                moved = true;
                break;
              }
            }
          }
        }
      } else {
        // Balanced: only move to foundation if safe
        for (let c = 0; c < 7; c++) {
          const top = simTabTop(s.tableau[c]);
          if (!top) continue;
          for (let f = 0; f < 4; f++) {
            if (simCanFoundation(top, simFoundTop(s, f)) && isFoundationSafe(s, top)) {
              s.foundations[f].push(s.tableau[c].faceUp.pop()!);
              simFlip(s.tableau[c]);
              moved = true;
              break;
            }
          }
          if (moved) break;
        }
        if (!moved && s.waste.length > 0) {
          const wTop = s.waste[s.waste.length - 1];
          for (let f = 0; f < 4; f++) {
            if (simCanFoundation(wTop, simFoundTop(s, f)) && isFoundationSafe(s, wTop)) {
              s.foundations[f].push(s.waste.pop()!);
              moved = true;
              break;
            }
          }
        }
      }

      // Phase 2: Move cards between tableau columns
      if (!moved) {
        // Try to reveal face-down cards by moving face-up stacks
        for (let src = 0; src < 7 && !moved; src++) {
          const srcCol = s.tableau[src];
          if (srcCol.faceUp.length === 0) continue;

          for (let ci = 0; ci < srcCol.faceUp.length && !moved; ci++) {
            const card = srcCol.faceUp[ci];

            // Prefer moves that reveal face-down cards
            if (ci === 0 && srcCol.faceDown.length === 0 && card.rank === 'K') continue;

            for (let dst = 0; dst < 7; dst++) {
              if (dst === src) continue;
              const dstTop = simTabTop(s.tableau[dst]);
              if (simCanTableau(card, dstTop)) {
                // Only move if it reveals a face-down card or builds meaningfully
                const reveals = (ci === 0 && srcCol.faceDown.length > 0);
                const movingKingToEmpty = (card.rank === 'K' && s.tableau[dst].faceUp.length === 0 && s.tableau[dst].faceDown.length === 0);
                if (reveals || (!movingKingToEmpty && ci === 0)) {
                  const moving = srcCol.faceUp.splice(ci);
                  s.tableau[dst].faceUp.push(...moving);
                  simFlip(srcCol);
                  moved = true;
                }
                break;
              }
            }
          }
        }
      }

      // Phase 3: Move waste to tableau
      if (!moved && s.waste.length > 0) {
        const wTop = s.waste[s.waste.length - 1];
        for (let c = 0; c < 7; c++) {
          if (simCanTableau(wTop, simTabTop(s.tableau[c]))) {
            s.tableau[c].faceUp.push(s.waste.pop()!);
            moved = true;
            break;
          }
        }
      }

      // Phase 4: Draw from stock
      if (!moved) {
        if (s.stock.length > 0) {
          s.waste.push(s.stock.pop()!);
          moved = true;
          stuck = 0;
        } else if (s.waste.length > 0) {
          if (s.stockPasses < 3) {
            s.stock = s.waste.reverse();
            s.waste = [];
            s.stockPasses++;
            moved = true;
            stuck++;
          } else {
            break; // No more passes allowed
          }
        } else {
          break; // No stock or waste
        }
      } else {
        stuck = 0;
      }

      if (stuck > (s.stock.length + s.waste.length + 1) * 4) break;
      moves++;
    }

    return simFoundCount(s) === 52;
  }

  // ── Simulation UI ──

  const canvas = document.getElementById('sol-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const CW = canvas.width, CH = canvas.height;

  let simData: { n: number; ffRate: number; balRate: number }[] = [];
  let totalGames = 0;
  let ffWins = 0;
  let balWins = 0;
  let simRunning = false;

  const simCountEl = document.getElementById('sol-sim-count')!;
  const simFFEl = document.getElementById('sol-sim-ff')!;
  const simBalEl = document.getElementById('sol-sim-bal')!;

  function drawChart(): void {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, CW, CH);

    const pad = { top: 20, right: 20, bottom: 35, left: 50 };
    const pw = CW - pad.left - pad.right;
    const ph = CH - pad.top - pad.bottom;

    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + ph);
    ctx.lineTo(pad.left + pw, pad.top + ph);
    ctx.stroke();

    // Y-axis labels (0% to 30%)
    ctx.fillStyle = '#555';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'right';
    const yMax = 0.30;
    for (let p = 0; p <= yMax; p += 0.05) {
      const y = pad.top + ph - (p / yMax) * ph;
      ctx.fillText((p * 100).toFixed(0) + '%', pad.left - 5, y + 3);
      ctx.strokeStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + pw, y);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#555';
    ctx.fillText('games simulated', pad.left + pw / 2, CH - 5);

    if (simData.length < 2) {
      ctx.fillStyle = '#333';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('click "run" to simulate', pad.left + pw / 2, pad.top + ph / 2);
      return;
    }

    const maxN = simData[simData.length - 1].n;

    // X-axis tick labels
    ctx.fillStyle = '#555';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'center';
    const step = niceStep(maxN, 5);
    for (let t = step; t <= maxN; t += step) {
      const x = pad.left + (t / maxN) * pw;
      ctx.fillText(shortNum(t), x, pad.top + ph + 15);
    }

    // Foundation-first line
    ctx.beginPath();
    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = 2;
    for (let i = 0; i < simData.length; i++) {
      const x = pad.left + (simData[i].n / maxN) * pw;
      const y = pad.top + ph - (Math.min(simData[i].ffRate, yMax) / yMax) * ph;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Balanced line
    ctx.beginPath();
    ctx.strokeStyle = '#e84057';
    ctx.lineWidth = 2;
    for (let i = 0; i < simData.length; i++) {
      const x = pad.left + (simData[i].n / maxN) * pw;
      const y = pad.top + ph - (Math.min(simData[i].balRate, yMax) / yMax) * ph;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Legend
    ctx.lineWidth = 1;
    const lx = pad.left + pw - 130;
    const ly = pad.top + 10;
    ctx.strokeStyle = '#00d4aa';
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 14, ly); ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText('foundation-first', lx + 18, ly + 3);

    ctx.strokeStyle = '#e84057';
    ctx.beginPath(); ctx.moveTo(lx, ly + 14); ctx.lineTo(lx + 14, ly + 14); ctx.stroke();
    ctx.fillText('balanced', lx + 18, ly + 17);
  }

  function niceStep(max: number, targetTicks: number): number {
    const rough = max / targetTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let s: number;
    if (norm < 1.5) s = 1;
    else if (norm < 3.5) s = 2;
    else if (norm < 7.5) s = 5;
    else s = 10;
    return s * mag;
  }

  function shortNum(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'k';
    return String(n);
  }

  function updateSimStats(): void {
    simCountEl.textContent = totalGames.toLocaleString();
    simFFEl.textContent = totalGames > 0 ? (ffWins / totalGames * 100).toFixed(2) + '%' : '\u2014';
    simBalEl.textContent = totalGames > 0 ? (balWins / totalGames * 100).toFixed(2) + '%' : '\u2014';
  }

  function resetSim(): void {
    if (simRunning) return;
    totalGames = 0;
    ffWins = 0;
    balWins = 0;
    simData = [];
    drawChart();
    updateSimStats();
  }

  const simNInput = document.getElementById('sol-sim-n') as HTMLInputElement;

  document.getElementById('sol-run')!.addEventListener('click', () => {
    if (simRunning) return;
    simRunning = true;

    const target = parseInt(simNInput.value) || 2000;
    const batchSize = Math.max(2, Math.floor(target / 50));
    let done = 0;

    function step(): void {
      const end = Math.min(done + batchSize, target);
      for (let i = done; i < end; i++) {
        if (simulateGame(true)) ffWins++;
        if (simulateGame(false)) balWins++;
        totalGames++;
      }
      done = end;

      simData.push({
        n: totalGames,
        ffRate: ffWins / totalGames,
        balRate: balWins / totalGames,
      });

      drawChart();
      updateSimStats();

      if (done < target) {
        requestAnimationFrame(step);
      } else {
        simRunning = false;
      }
    }

    requestAnimationFrame(step);
  });

  document.getElementById('sol-sim-reset')!.addEventListener('click', () => resetSim());

  // ── init ──

  newGame();
  drawChart();
  updateSimStats();
}

main();
