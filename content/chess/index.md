---
title: "chess"
subtitle: "mcts with piece-square evaluation"
js: ["mcts.js", "chess.js"]
---

<div class="explanation">
  <p>Pure random rollouts are useless for chess — random play produces meaningless noise. Instead, the AI uses a <strong>hybrid approach</strong>: short capture-biased rollouts (25 ply) terminated with a static evaluation function.</p>
  <p>The evaluation combines <strong>material counting</strong> (pawn=100, knight=320, bishop=330, rook=500, queen=900) with <strong>piece-square tables</strong> that encode positional knowledge — central pawns score higher, knights prefer the center, kings hide in corners during the middlegame.</p>
  <p class="formula">eval = Σ (material + PST[piece][square]) per piece</p>
  <p>With ~3,000 MCTS iterations per move, the AI plays at roughly 1000–1200 Elo. It understands basic tactics (captures, forks) and positional concepts (center control, king safety) but can miss deep combinations.</p>
</div>

<div class="data-indicator live"><span class="dot"></span> live · mcts</div>

<div class="chess-layout">
  <div class="chess-board-col">
    <div class="canvas-wrap">
      <canvas id="chess-board" width="560" height="560"></canvas>
    </div>
  </div>
  <div class="chess-history-col">
    <div class="history-header">moves</div>
    <div id="move-history" class="move-history">
      <span class="history-placeholder">moves will appear here</span>
    </div>
  </div>
</div>

<div id="chess-message" class="game-message">white to play</div>

<div class="controls">
  <button id="chess-undo">undo</button>
  <button id="chess-new">new game</button>
  <label>iterations <input type="number" id="chess-iterations" value="3000" min="100" max="50000" step="500"></label>
  <label>depth <input type="number" id="chess-depth" value="25" min="5" max="100" step="5"></label>
</div>

<div id="promotion-overlay" class="promotion-overlay" style="display:none">
  <div class="promotion-choices">
    <button class="promo-piece" data-piece="5">&#9813;</button>
    <button class="promo-piece" data-piece="4">&#9814;</button>
    <button class="promo-piece" data-piece="3">&#9815;</button>
    <button class="promo-piece" data-piece="2">&#9816;</button>
  </div>
</div>

<div id="mcts-stats" class="mcts-stats"></div>
