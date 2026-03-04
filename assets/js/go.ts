// Go (9x9) with MCTS AI
import { search, MCTSState } from './lib/mcts';

const SIZE = 9;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const KOMI = 5.5;

// ── Game State ──

class GoState implements MCTSState {
  board: Int8Array;
  current: number;
  koPoint: number;
  passes: number;
  moveHistory: number[];
  capturedByBlack: number;
  capturedByWhite: number;

  constructor() {
    this.board = new Int8Array(SIZE * SIZE);
    this.current = BLACK;
    this.koPoint = -1;
    this.passes = 0;
    this.moveHistory = [];
    this.capturedByBlack = 0;
    this.capturedByWhite = 0;
  }

  idx(r: number, c: number): number {
    return r * SIZE + c;
  }

  rc(i: number): [number, number] {
    return [Math.floor(i / SIZE), i % SIZE];
  }

  clone(): GoState {
    const s = new GoState();
    s.board = new Int8Array(this.board);
    s.current = this.current;
    s.koPoint = this.koPoint;
    s.passes = this.passes;
    s.capturedByBlack = this.capturedByBlack;
    s.capturedByWhite = this.capturedByWhite;
    s.moveHistory = this.moveHistory.slice();
    return s;
  }

  opponent(c: number): number {
    return c === BLACK ? WHITE : BLACK;
  }

  neighbors(i: number): number[] {
    const [r, c] = this.rc(i);
    const n: number[] = [];
    if (r > 0) n.push(this.idx(r - 1, c));
    if (r < SIZE - 1) n.push(this.idx(r + 1, c));
    if (c > 0) n.push(this.idx(r, c - 1));
    if (c < SIZE - 1) n.push(this.idx(r, c + 1));
    return n;
  }

  getGroup(i: number): { stones: number[]; liberties: number } {
    const color = this.board[i];
    if (color === EMPTY) return { stones: [], liberties: 0 };
    const visited: Record<number, boolean> = {};
    const stack: number[] = [i];
    const stones: number[] = [];
    const liberties: Record<number, boolean> = {};
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (visited[cur]) continue;
      visited[cur] = true;
      stones.push(cur);
      const nb = this.neighbors(cur);
      for (let j = 0; j < nb.length; j++) {
        const n = nb[j];
        if (this.board[n] === EMPTY) {
          liberties[n] = true;
        } else if (this.board[n] === color && !visited[n]) {
          stack.push(n);
        }
      }
    }
    return { stones, liberties: Object.keys(liberties).length };
  }

  removeGroup(stones: number[]): number {
    for (let i = 0; i < stones.length; i++) {
      this.board[stones[i]] = EMPTY;
    }
    return stones.length;
  }

  isLegalMove(pos: number): boolean {
    if (pos === -1) return true; // pass
    if (this.board[pos] !== EMPTY) return false;
    if (pos === this.koPoint) return false;

    // Try placing
    this.board[pos] = this.current;
    const opp = this.opponent(this.current);

    // Check captures
    let captured = 0;
    const nb = this.neighbors(pos);
    for (let i = 0; i < nb.length; i++) {
      if (this.board[nb[i]] === opp) {
        const g = this.getGroup(nb[i]);
        if (g.liberties === 0) captured += g.stones.length;
      }
    }

    // Check self-capture (suicide)
    if (captured === 0) {
      const self = this.getGroup(pos);
      if (self.liberties === 0) {
        this.board[pos] = EMPTY;
        return false;
      }
    }

    this.board[pos] = EMPTY;
    return true;
  }

  applyMove(pos: number): void {
    if (pos === -1) {
      // Pass
      this.passes++;
      this.current = this.opponent(this.current);
      this.koPoint = -1;
      this.moveHistory.push(-1);
      return;
    }

    this.passes = 0;
    this.board[pos] = this.current;
    const opp = this.opponent(this.current);

    // Capture opponent groups with no liberties
    let totalCaptured = 0;
    let capturedStones: number[] = [];
    const nb = this.neighbors(pos);
    for (let i = 0; i < nb.length; i++) {
      if (this.board[nb[i]] === opp) {
        const g = this.getGroup(nb[i]);
        if (g.liberties === 0) {
          totalCaptured += this.removeGroup(g.stones);
          capturedStones = capturedStones.concat(g.stones);
        }
      }
    }

    if (this.current === BLACK) this.capturedByBlack += totalCaptured;
    else this.capturedByWhite += totalCaptured;

    // Ko detection: if exactly 1 stone captured and placed stone has 1 liberty
    if (totalCaptured === 1) {
      const selfGroup = this.getGroup(pos);
      if (selfGroup.stones.length === 1 && selfGroup.liberties === 1) {
        this.koPoint = capturedStones[0];
      } else {
        this.koPoint = -1;
      }
    } else {
      this.koPoint = -1;
    }

    this.moveHistory.push(pos);
    this.current = opp;
  }

  getLegalMoves(): number[] {
    const moves: number[] = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      if (this.isLegalMove(i)) moves.push(i);
    }
    moves.push(-1); // pass is always legal
    return moves;
  }

  isTerminal(): boolean {
    return this.passes >= 2;
  }

  // Chinese area scoring
  score(): { black: number; white: number } {
    let blackTerritory = 0;
    let whiteTerritory = 0;
    let blackStones = 0;
    let whiteStones = 0;
    const visited: Record<number, boolean> = {};

    for (let i = 0; i < SIZE * SIZE; i++) {
      if (this.board[i] === BLACK) blackStones++;
      else if (this.board[i] === WHITE) whiteStones++;
    }

    // Flood fill empty areas to determine territory
    for (let j = 0; j < SIZE * SIZE; j++) {
      if (this.board[j] !== EMPTY || visited[j]) continue;
      const stack: number[] = [j];
      const area: number[] = [];
      let touchesBlack = false;
      let touchesWhite = false;
      while (stack.length > 0) {
        const cur = stack.pop()!;
        if (visited[cur]) continue;
        visited[cur] = true;
        area.push(cur);
        const nb = this.neighbors(cur);
        for (let k = 0; k < nb.length; k++) {
          if (this.board[nb[k]] === EMPTY && !visited[nb[k]]) {
            stack.push(nb[k]);
          } else if (this.board[nb[k]] === BLACK) {
            touchesBlack = true;
          } else if (this.board[nb[k]] === WHITE) {
            touchesWhite = true;
          }
        }
      }
      if (touchesBlack && !touchesWhite) blackTerritory += area.length;
      else if (touchesWhite && !touchesBlack) whiteTerritory += area.length;
    }

    return {
      black: blackStones + blackTerritory,
      white: whiteStones + whiteTerritory + KOMI,
    };
  }

  getResult(player: number): number {
    const s = this.score();
    if (player === BLACK) return s.black > s.white ? 1 : 0;
    return s.white > s.black ? 1 : 0;
  }

  getCurrentPlayer(): number {
    return this.current;
  }

  evaluate(player: number): number {
    return this.getResult(player);
  }
}

// ── Rollout with "don't fill own eyes" heuristic ──

function goRollout(state: MCTSState, maxDepth: number): MCTSState {
  const s = state.clone() as GoState;
  let depth = 0;
  while (!s.isTerminal() && depth < maxDepth) {
    const moves: number[] = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      if (s.isLegalMove(i) && !isOwnEye(s, i, s.current)) {
        moves.push(i);
      }
    }
    if (moves.length === 0) {
      s.applyMove(-1); // pass
    } else {
      s.applyMove(moves[Math.floor(Math.random() * moves.length)]);
    }
    depth++;
  }
  return s;
}

function isOwnEye(state: GoState, pos: number, color: number): boolean {
  const nb = state.neighbors(pos);
  // All neighbors must be same color
  for (let i = 0; i < nb.length; i++) {
    if (state.board[nb[i]] !== color) return false;
  }
  // At least 3 of 4 diagonals must be same color (or edge)
  const [r, c] = state.rc(pos);
  const diags: number[] = [];
  if (r > 0 && c > 0) diags.push(state.idx(r - 1, c - 1));
  if (r > 0 && c < SIZE - 1) diags.push(state.idx(r - 1, c + 1));
  if (r < SIZE - 1 && c > 0) diags.push(state.idx(r + 1, c - 1));
  if (r < SIZE - 1 && c < SIZE - 1) diags.push(state.idx(r + 1, c + 1));
  let bad = 0;
  for (let j = 0; j < diags.length; j++) {
    if (state.board[diags[j]] !== color) bad++;
  }
  const isEdge = r === 0 || r === SIZE - 1 || c === 0 || c === SIZE - 1;
  return isEdge ? bad === 0 : bad <= 1;
}

// ── Board Rendering ──

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
const PADDING = 30;
let cellSize: number;
let gameState: GoState;
let gameOver = false;
let aiThinking = false;
let hoverPos = -1;
let lastMove = -1;
const playerColor: number = BLACK;
let statsEl: HTMLElement;
let messageEl: HTMLElement;
let scoreEl: HTMLElement;
let passBtn: HTMLButtonElement;
let newGameBtn: HTMLButtonElement;
let resignBtn: HTMLButtonElement;
let iterationsInput: HTMLInputElement;
let depthInput: HTMLInputElement;

function init(): void {
  const canvasEl = document.getElementById('go-board') as HTMLCanvasElement | null;
  if (!canvasEl) return;
  canvas = canvasEl;
  ctx = canvas.getContext('2d')!;
  statsEl = document.getElementById('mcts-stats')!;
  messageEl = document.getElementById('go-message')!;
  scoreEl = document.getElementById('go-score')!;
  passBtn = document.getElementById('go-pass') as HTMLButtonElement;
  newGameBtn = document.getElementById('go-new') as HTMLButtonElement;
  resignBtn = document.getElementById('go-resign') as HTMLButtonElement;
  iterationsInput = document.getElementById('go-iterations') as HTMLInputElement;
  depthInput = document.getElementById('go-depth') as HTMLInputElement;

  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('mousemove', onCanvasMove);
  canvas.addEventListener('mouseleave', (): void => { hoverPos = -1; draw(); });
  passBtn.addEventListener('click', onPass);
  newGameBtn.addEventListener('click', newGame);
  resignBtn.addEventListener('click', onResign);

  newGame();
  // Defer resize to ensure layout is computed
  requestAnimationFrame((): void => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  });
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  let w = container.clientWidth;
  if (w < 100) w = 560;
  w = Math.min(w, 560);
  canvas.width = w;
  canvas.height = w;
  cellSize = (w - 2 * PADDING) / (SIZE - 1);
  draw();
}

function newGame(): void {
  gameState = new GoState();
  gameOver = false;
  aiThinking = false;
  lastMove = -1;
  hoverPos = -1;
  messageEl.textContent = 'black to play';
  messageEl.className = '';
  scoreEl.textContent = '';
  statsEl.innerHTML = '';
  draw();
}

function boardToPixel(r: number, c: number): { x: number; y: number } {
  return {
    x: PADDING + c * cellSize,
    y: PADDING + r * cellSize,
  };
}

function pixelToBoard(x: number, y: number): number {
  const c = Math.round((x - PADDING) / cellSize);
  const r = Math.round((y - PADDING) / cellSize);
  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return -1;
  return gameState.idx(r, c);
}

function draw(): void {
  if (!ctx || !gameState) return;
  const w = canvas.width;

  // Background
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, w);

  // Grid lines
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  for (let i = 0; i < SIZE; i++) {
    const p0 = boardToPixel(i, 0);
    const p1 = boardToPixel(i, SIZE - 1);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    const q0 = boardToPixel(0, i);
    const q1 = boardToPixel(SIZE - 1, i);
    ctx.beginPath();
    ctx.moveTo(q0.x, q0.y);
    ctx.lineTo(q1.x, q1.y);
    ctx.stroke();
  }

  // Star points (hoshi)
  const starPoints: [number, number][] = SIZE === 9 ? [[2, 2], [2, 6], [6, 2], [6, 6], [4, 4]] : [];
  ctx.fillStyle = '#444';
  for (let s = 0; s < starPoints.length; s++) {
    const sp = boardToPixel(starPoints[s][0], starPoints[s][1]);
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Coordinate labels
  ctx.fillStyle = '#444';
  ctx.font = (cellSize * 0.32) + 'px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const colLabels = 'ABCDEFGHJ'; // I is skipped in Go
  for (let ci = 0; ci < SIZE; ci++) {
    const px = boardToPixel(0, ci);
    ctx.fillText(colLabels[ci], px.x, PADDING * 0.45);
    ctx.fillText(colLabels[ci], px.x, canvas.height - PADDING * 0.45);
  }
  for (let ri = 0; ri < SIZE; ri++) {
    const py = boardToPixel(ri, 0);
    ctx.fillText(String(SIZE - ri), PADDING * 0.4, py.y);
    ctx.fillText(String(SIZE - ri), canvas.width - PADDING * 0.4, py.y);
  }

  const stoneRadius = cellSize * 0.43;

  // Hover preview
  if (hoverPos >= 0 && !gameOver && !aiThinking && gameState.current === playerColor) {
    const hr = gameState.rc(hoverPos);
    const hp = boardToPixel(hr[0], hr[1]);
    if (gameState.board[hoverPos] === EMPTY && gameState.isLegalMove(hoverPos)) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = playerColor === BLACK ? '#fff' : '#ddd';
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, stoneRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Stones
  for (let b = 0; b < SIZE * SIZE; b++) {
    if (gameState.board[b] === EMPTY) continue;
    const brc = gameState.rc(b);
    const bp = boardToPixel(brc[0], brc[1]);

    if (gameState.board[b] === BLACK) {
      ctx.fillStyle = '#e0e0e0';
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, stoneRadius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#222';
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, stoneRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Last move marker
  if (lastMove >= 0 && gameState.board[lastMove] !== EMPTY) {
    const lr = gameState.rc(lastMove);
    const lp = boardToPixel(lr[0], lr[1]);
    ctx.fillStyle = gameState.board[lastMove] === BLACK ? '#111' : '#aaa';
    ctx.beginPath();
    ctx.arc(lp.x, lp.y, stoneRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function onCanvasMove(e: MouseEvent): void {
  if (gameOver || aiThinking || gameState.current !== playerColor) return;
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (e.clientX - rect.left) * scale;
  const y = (e.clientY - rect.top) * scale;
  const newHover = pixelToBoard(x, y);
  if (newHover !== hoverPos) {
    hoverPos = newHover;
    draw();
  }
}

function onCanvasClick(e: MouseEvent): void {
  if (gameOver || aiThinking || gameState.current !== playerColor) return;
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (e.clientX - rect.left) * scale;
  const y = (e.clientY - rect.top) * scale;
  const pos = pixelToBoard(x, y);
  if (pos < 0) return;
  if (!gameState.isLegalMove(pos)) return;

  gameState.applyMove(pos);
  lastMove = pos;
  hoverPos = -1;
  draw();

  if (gameState.isTerminal()) {
    endGame();
    return;
  }

  aiTurn();
}

function onPass(): void {
  if (gameOver || aiThinking || gameState.current !== playerColor) return;
  gameState.applyMove(-1);
  lastMove = -1;
  messageEl.textContent = 'you passed';
  draw();

  if (gameState.isTerminal()) {
    endGame();
    return;
  }

  aiTurn();
}

function onResign(): void {
  if (gameOver || aiThinking) return;
  gameOver = true;
  messageEl.textContent = 'you resigned — white wins';
  messageEl.className = 'loss';
}

function aiTurn(): void {
  aiThinking = true;
  messageEl.textContent = 'thinking...';
  passBtn.disabled = true;
  resignBtn.disabled = true;

  setTimeout((): void => {
    const iters = iterationsInput ? parseInt(iterationsInput.value) || 5000 : 5000;
    const depth = depthInput ? parseInt(depthInput.value) || 200 : 200;
    const result = search(gameState, {
      iterations: iters,
      explorationC: 1.414,
      rolloutDepth: depth,
      rolloutFn: goRollout,
    });

    if (result.bestMove === null || result.bestMove === -1) {
      gameState.applyMove(-1);
      lastMove = -1;
      messageEl.textContent = 'ai passed';
    } else {
      gameState.applyMove(result.bestMove);
      lastMove = result.bestMove;
      const rc = gameState.rc(result.bestMove);
      const colLabels = 'ABCDEFGHJ';
      messageEl.textContent = 'ai played ' + colLabels[rc[1]] + (SIZE - rc[0]);
    }

    updateStats(result.stats);
    aiThinking = false;
    passBtn.disabled = false;
    resignBtn.disabled = false;
    draw();

    if (gameState.isTerminal()) {
      endGame();
    }
  }, 50);
}

function endGame(): void {
  gameOver = true;
  const s = gameState.score();
  scoreEl.textContent = 'black ' + s.black.toFixed(1) + ' — white ' + s.white.toFixed(1);
  if (s.black > s.white) {
    messageEl.textContent = 'black wins by ' + (s.black - s.white).toFixed(1);
    messageEl.className = playerColor === BLACK ? '' : 'loss';
  } else {
    messageEl.textContent = 'white wins by ' + (s.white - s.black).toFixed(1);
    messageEl.className = playerColor === WHITE ? '' : 'loss';
  }
}

interface GoMoveStats {
  move: number;
  visits: number;
  winRate: number;
}

interface GoTreeNode {
  move: number | null;
  visits: number;
  winRate: number;
  children: GoTreeNode[];
}

interface GoSearchStats {
  iterations: number;
  topMoves: GoMoveStats[];
  tree: GoTreeNode;
}

function updateStats(stats: GoSearchStats): void {
  const colLabels = 'ABCDEFGHJ';
  let html = '<div class="mcts-header">mcts search \u00b7 ' + stats.iterations.toLocaleString() + ' iterations</div>';
  const maxVisits = stats.topMoves.length > 0 ? stats.topMoves[0].visits : 1;
  for (let i = 0; i < Math.min(stats.topMoves.length, 6); i++) {
    const m = stats.topMoves[i];
    let label: string;
    if (m.move === -1) {
      label = 'pass';
    } else {
      const rc = gameState.rc(m.move);
      label = colLabels[rc[1]] + (SIZE - rc[0]);
    }
    const barWidth = Math.max(2, (m.visits / maxVisits) * 100);
    html += '<div class="mcts-move">' +
      '<span class="mcts-label">' + label.padEnd(4) + '</span>' +
      '<span class="mcts-visits">' + m.visits + '</span>' +
      '<span class="mcts-bar"><span style="width:' + barWidth + '%"></span></span>' +
      '<span class="mcts-wr">' + m.winRate.toFixed(1) + '%</span>' +
      '</div>';
  }
  statsEl.innerHTML = html;

  // Render tree visualization
  if (stats.tree) renderTree(stats.tree, colLabels);
}

function goMoveLabel(move: number | null, colLabels: string): string {
  if (move === -1 || move === null) return 'pass';
  const rc = gameState.rc(move);
  return colLabels[rc[1]] + (SIZE - rc[0]);
}

interface TreeLayoutNode {
  x: number;
  y: number;
  data: GoTreeNode;
  isBest: boolean;
}

function renderTree(tree: GoTreeNode, colLabels: string): void {
  const container = document.getElementById('mcts-tree');
  if (!container) return;

  const children = tree.children.slice(0, 5);
  if (children.length === 0) {
    container.innerHTML = '';
    return;
  }

  let tc = container.querySelector('canvas') as HTMLCanvasElement | null;
  if (!tc) {
    container.innerHTML = '<div class="tree-header">search tree</div><canvas></canvas>';
    tc = container.querySelector('canvas') as HTMLCanvasElement;
  } else {
    container.querySelector('.tree-header')!.textContent = 'search tree';
  }

  const cw = container.clientWidth || 460;
  const dpr = window.devicePixelRatio || 1;
  const nodeR = 22;
  const levelGap = 80;
  const topPad = 30;
  const botPad = 20;

  let maxGC = 0;
  for (let ci = 0; ci < children.length; ci++) {
    const gcLen = children[ci].children ? children[ci].children.length : 0;
    if (gcLen > maxGC) maxGC = gcLen;
  }
  const levels = maxGC > 0 ? 3 : 2;
  const ch = topPad + levels * levelGap + botPad;

  tc.style.width = cw + 'px';
  tc.style.height = ch + 'px';
  tc.width = cw * dpr;
  tc.height = ch * dpr;

  const tx = tc.getContext('2d')!;
  tx.setTransform(dpr, 0, 0, dpr, 0, 0);
  tx.clearRect(0, 0, cw, ch);

  const rootX = cw / 2;
  const rootY = topPad + nodeR;
  const n1 = children.length;
  const spacing1 = cw / (n1 + 1);
  const l1Nodes: TreeLayoutNode[] = [];
  for (let i = 0; i < n1; i++) {
    l1Nodes.push({ x: spacing1 * (i + 1), y: rootY + levelGap, data: children[i], isBest: i === 0 });
  }

  tx.lineWidth = 1.5;
  for (let e1 = 0; e1 < l1Nodes.length; e1++) {
    const nd = l1Nodes[e1];
    tx.strokeStyle = nd.isBest ? '#00d4aa' : '#333';
    tx.beginPath();
    tx.moveTo(rootX, rootY + nodeR);
    tx.lineTo(nd.x, nd.y - nodeR);
    tx.stroke();
  }

  const l2Nodes: TreeLayoutNode[] = [];
  for (let c1 = 0; c1 < l1Nodes.length; c1++) {
    const parent = l1Nodes[c1];
    const gcs = parent.data.children || [];
    if (gcs.length === 0) continue;
    const gcSpan = Math.min(spacing1 * 0.8, gcs.length * 50);
    const gcStart = parent.x - gcSpan / 2;
    const gcStep = gcs.length > 1 ? gcSpan / (gcs.length - 1) : 0;
    for (let g = 0; g < gcs.length; g++) {
      const gx = gcs.length === 1 ? parent.x : gcStart + gcStep * g;
      const gy = parent.y + levelGap;
      tx.strokeStyle = '#2a2a2a';
      tx.lineWidth = 1;
      tx.beginPath();
      tx.moveTo(parent.x, parent.y + nodeR);
      tx.lineTo(gx, gy - nodeR);
      tx.stroke();
      l2Nodes.push({ x: gx, y: gy, data: gcs[g], isBest: false });
    }
  }

  drawGoNode(tx, rootX, rootY, nodeR, 'root', tree.visits, null, true, false);
  for (let d1 = 0; d1 < l1Nodes.length; d1++) {
    const n = l1Nodes[d1];
    drawGoNode(tx, n.x, n.y, nodeR, goMoveLabel(n.data.move, colLabels),
               n.data.visits, n.data.winRate, false, n.isBest);
  }
  const smallR = 16;
  for (let d2 = 0; d2 < l2Nodes.length; d2++) {
    const n2 = l2Nodes[d2];
    drawGoNode(tx, n2.x, n2.y, smallR, goMoveLabel(n2.data.move, colLabels),
               n2.data.visits, n2.data.winRate, false, false);
  }
}

function drawGoNode(
  tx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  label: string,
  visits: number,
  winRate: number | null,
  isRoot: boolean,
  isBest: boolean,
): void {
  tx.beginPath();
  tx.arc(x, y, r, 0, Math.PI * 2);
  if (isRoot) { tx.fillStyle = '#1a1a1a'; tx.strokeStyle = '#00d4aa'; tx.lineWidth = 2; }
  else if (isBest) { tx.fillStyle = '#0a2a22'; tx.strokeStyle = '#00d4aa'; tx.lineWidth = 2; }
  else { tx.fillStyle = '#1a1a1a'; tx.strokeStyle = '#333'; tx.lineWidth = 1.5; }
  tx.fill(); tx.stroke();

  const fs = r > 18 ? 10 : 8;
  tx.font = fs + 'px JetBrains Mono, monospace';
  tx.textAlign = 'center';
  tx.fillStyle = isBest ? '#00d4aa' : '#888';
  tx.fillText(label, x, y - r - 4);

  tx.fillStyle = '#c8c8c8';
  tx.font = 'bold ' + fs + 'px JetBrains Mono, monospace';
  tx.textBaseline = 'middle';
  if (isRoot) {
    tx.fillText(shortGoNum(visits), x, y);
  } else {
    tx.fillText(shortGoNum(visits), x, y - 3);
    tx.font = (r > 18 ? 9 : 7) + 'px JetBrains Mono, monospace';
    tx.fillStyle = winRate !== null && winRate >= 50 ? '#00d4aa' : '#e84057';
    tx.fillText((winRate !== null ? winRate.toFixed(0) : '0') + '%', x, y + (r > 18 ? 9 : 7));
  }
  tx.textBaseline = 'alphabetic';
}

function shortGoNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function main(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

main();
