---
title: "go"
subtitle: "9×9 · chinese scoring · komi 5.5"
js: "go.ts"
---

<div class="explanation">
  <p>Go is the canonical success story for Monte Carlo Tree Search. Unlike chess, where random play produces nonsense, random Go games carry meaningful signal — enough for MCTS to build a competent strategy from pure simulation.</p>
  <p>The AI uses <strong>UCB1 selection</strong> with random rollouts to completion. A "don't fill own eyes" heuristic keeps rollouts from self-destructing. With ~5,000 iterations per move, it plays at a weak-intermediate level on the 9×9 board.</p>
  <p class="formula">UCB1(i) = w̄ᵢ + c · √(ln N / nᵢ)</p>
  <p>Chinese area scoring: each player's score = own stones on the board + empty points surrounded entirely by own stones. White receives 5.5 points komi to compensate for black's first-move advantage.</p>
  <p class="formula">references</p>
  <p>Silver et al. "Mastering the game of Go with deep neural networks and tree search." <em>Nature</em>, 2016.</p>
  <p>Gelly & Silver. "Combining online and offline knowledge in UCT." <em>ICML</em>, 2007.</p>
</div>

<div class="data-indicator live"><span class="dot"></span> live · mcts</div>

<div class="canvas-wrap">
  <canvas id="go-board" width="560" height="560"></canvas>
</div>

<div id="go-score" class="go-score"></div>
<div id="go-message" class="game-message">black to play</div>

<div class="controls">
  <button id="go-pass">pass</button>
  <button id="go-resign">resign</button>
  <button id="go-new">new game</button>
  <label>iterations <input type="number" id="go-iterations" value="5000" min="100" max="50000" step="500"></label>
  <label>depth <input type="number" id="go-depth" value="200" min="50" max="500" step="50"></label>
</div>

<div id="mcts-stats" class="mcts-stats"></div>

<div id="mcts-tree" class="mcts-tree"></div>

<div class="explanation" style="margin-top: 2rem;">
  <h3 style="color: var(--accent); font-size: 0.85rem; font-weight: 500; letter-spacing: 1px; margin-bottom: 0.5rem;">how the search tree works</h3>
  <p>MCTS builds a game tree incrementally. Each iteration follows four phases:</p>
  <p><strong>1. Selection</strong> — descend the tree, choosing the child with the highest UCB1 score at each level. UCB1 balances win rate (exploitation) with visit count (exploration).</p>
  <p class="formula">UCB1 = w̄ + c · √(ln N / n)</p>
  <p><strong>2. Expansion</strong> — at a node with untried moves, add one as a new leaf.</p>
  <p><strong>3. Simulation</strong> — play random moves from the new leaf until the game ends. In Go, random rollouts naturally carry meaningful signal about territory.</p>
  <p><strong>4. Backpropagation</strong> — propagate the win/loss result back up to the root, updating each ancestor's statistics.</p>
  <p>The tree above shows the top branches after the AI's search. More visits = more confidence in that line of play.</p>
</div>
