---
title: "solitaire"
subtitle: "klondike · monte carlo win probability"
js: "solitaire.ts"
---

<div class="explanation">
  <p>Klondike is the most widely played solitaire variant — the one most people simply call "solitaire." Despite its familiarity, the exact probability of winning with optimal play remains an open question in combinatorial game theory.</p>
  <p class="formula">P(win | perfect play) ≈ 79% &emsp; P(win | greedy heuristic) ≈ 10–15%</p>
  <p>The gap between perfect play and heuristic play is enormous. Monte Carlo simulation lets us estimate win rates for different automated strategies by sampling thousands of random deals and playing them out with simple decision rules. Below, play a game interactively, then run simulations to compare strategy win rates.</p>
</div>

<div class="data-indicator live"><span class="dot"></span> interactive</div>

<div id="sol-game">
  <div id="sol-top-row" class="sol-top-row">
    <div class="sol-stock-waste">
      <div id="sol-stock" class="sol-pile sol-stock-pile"></div>
      <div id="sol-waste" class="sol-pile sol-waste-pile"></div>
    </div>
    <div class="sol-foundations">
      <div id="sol-f0" class="sol-pile sol-foundation" data-index="0"></div>
      <div id="sol-f1" class="sol-pile sol-foundation" data-index="1"></div>
      <div id="sol-f2" class="sol-pile sol-foundation" data-index="2"></div>
      <div id="sol-f3" class="sol-pile sol-foundation" data-index="3"></div>
    </div>
  </div>
  <div id="sol-tableau" class="sol-tableau">
    <div id="sol-t0" class="sol-column" data-col="0"></div>
    <div id="sol-t1" class="sol-column" data-col="1"></div>
    <div id="sol-t2" class="sol-column" data-col="2"></div>
    <div id="sol-t3" class="sol-column" data-col="3"></div>
    <div id="sol-t4" class="sol-column" data-col="4"></div>
    <div id="sol-t5" class="sol-column" data-col="5"></div>
    <div id="sol-t6" class="sol-column" data-col="6"></div>
  </div>
</div>

<div id="sol-message" class="game-message"></div>

<div class="controls" style="justify-content:center">
  <button id="sol-new">new game</button>
  <button id="sol-undo">undo</button>
</div>

<div class="stats" id="sol-game-stats">
  <div class="stat">
    <span class="label">moves</span>
    <span id="sol-moves" class="value">0</span>
  </div>
  <div class="stat">
    <span class="label">stock passes</span>
    <span id="sol-passes" class="value">0</span>
  </div>
  <div class="stat">
    <span class="label">foundations</span>
    <span id="sol-found-count" class="value">0 / 52</span>
  </div>
</div>

<h3 class="section-heading">monte carlo simulation</h3>

<p class="explanation" style="margin-bottom:1rem">Simulate thousands of Klondike deals played with automated greedy strategies. The "foundation-first" strategy always moves to foundations when possible; the "balanced" strategy delays foundation moves when the card might be needed for tableau building. Watch both converge to their true win rates.</p>

<div class="canvas-wrap">
  <canvas id="sol-canvas" width="600" height="350"></canvas>
</div>

<div class="stats">
  <div class="stat">
    <span class="label">games simulated</span>
    <span id="sol-sim-count" class="value">0</span>
  </div>
  <div class="stat">
    <span class="label">foundation-first</span>
    <span id="sol-sim-ff" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">balanced</span>
    <span id="sol-sim-bal" class="value">—</span>
  </div>
</div>

<div class="controls">
  <label>games <input type="number" id="sol-sim-n" value="2000" min="100" max="50000" step="100"></label>
  <button id="sol-run">run</button>
  <button id="sol-sim-reset">reset</button>
</div>

<h3 class="section-heading">about the math</h3>

<div class="explanation">
  <p>The solvability of Klondike solitaire has been studied extensively. With 52 cards dealt into a specific layout, there are roughly 8 × 10<sup>67</sup> possible deals. Not all are winnable — even with perfect play, some deals are provably unsolvable due to card ordering.</p>
  <p><strong>Bjarnason et al. (2007)</strong> used Monte Carlo sampling to estimate that approximately 79% of Klondike deals are solvable with perfect information (all cards visible). With the standard hidden-card rules, the effective win rate drops due to incomplete information.</p>
  <p><strong>Yan et al. (2005)</strong> studied automated solvers and found that simple greedy strategies win roughly 10–15% of games, while more sophisticated search-based approaches can reach 30–40%. The gap between these rates illustrates how much hidden information and lookahead matter.</p>
  <p>The simulation above estimates win rates for two greedy heuristics — neither attempts lookahead or backtracking, making them fast enough to simulate thousands of games in seconds while still revealing meaningful differences in strategy quality.</p>
</div>
