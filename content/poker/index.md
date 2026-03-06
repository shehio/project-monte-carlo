---
title: "poker"
subtitle: "texas hold'em · monte carlo hand evaluation"
js: "poker.ts"
---

<div class="explanation">
  <p>Texas Hold'em is a game of incomplete information — you see 2 of 52 cards and must decide whether to bet, call, or fold. Exact win probabilities are computationally expensive: with 5 community cards and multiple opponents, the combinatorial space explodes.</p>
  <p class="formula">C(50,5) × C(45,2)^N opponents ≈ billions of board combinations</p>
  <p><strong>Monte Carlo sampling</strong> cuts through this by dealing thousands of random boards and counting wins. Given your two hole cards, the simulator deals random community cards and opponent hands, evaluates all hands, and estimates your equity — the fraction of the time you win or tie.</p>
  <p>This technique underpins the solvers used in modern poker. Programs like Pluribus (Brown & Sandholm, 2019) and student-of-games architectures (Schmid et al., 2023) use Monte Carlo counterfactual regret minimization (MCCFR) to approximate Nash equilibria in imperfect-information games. Even simpler equity calculators — like the simulator below — rely on random rollouts to estimate hand strength in real time.</p>
  <p>Recent work by Zha et al. (2024) on RL environments for card games and Lanctot et al. (2019) on the OpenSpiel framework demonstrate that MC sampling remains foundational: it provides the ground-truth equity estimates that more sophisticated algorithms refine.</p>
</div>

<div class="data-indicator live"><span class="dot"></span> interactive</div>

<!-- game table -->
<div id="poker-table" class="poker-table">
  <div class="ai-row">
    <div class="ai-area">
      <h3>opponent 1</h3>
      <div id="ai-cards-0" class="hand"></div>
      <div id="ai-status-0" class="ai-status"></div>
    </div>
    <div class="ai-area">
      <h3>opponent 2</h3>
      <div id="ai-cards-1" class="hand"></div>
      <div id="ai-status-1" class="ai-status"></div>
    </div>
    <div class="ai-area">
      <h3>opponent 3</h3>
      <div id="ai-cards-2" class="hand"></div>
      <div id="ai-status-2" class="ai-status"></div>
    </div>
  </div>

  <div class="community-area">
    <h3>community cards</h3>
    <div id="community-cards" class="hand"></div>
  </div>

  <div id="pot-display" class="pot-display">
    <span class="label">pot</span>
    <span id="pot-amount" class="value">$0</span>
  </div>

  <div class="player-area">
    <h3>your hand</h3>
    <div id="player-cards" class="hand"></div>
    <div id="hand-name" class="hand-label"></div>
  </div>
</div>

<div class="game-info">
  <div class="stat">
    <span class="label">bankroll</span>
    <span id="bankroll" class="value">$1,000</span>
  </div>
  <div class="stat">
    <span class="label">round</span>
    <span id="round-label" class="value">--</span>
  </div>
  <div class="stat">
    <span class="label">blinds</span>
    <span id="blinds-label" class="value">5/10</span>
  </div>
</div>

<div class="controls">
  <div id="bet-controls" style="display:flex;gap:0.5rem;justify-content:center">
    <button id="deal-btn">deal</button>
  </div>
  <div id="action-controls" style="display:none;gap:0.5rem;justify-content:center">
    <button id="fold-btn">fold</button>
    <button id="check-btn">check</button>
    <button id="call-btn" style="display:none">call <span id="call-amount"></span></button>
    <button id="raise-btn">raise</button>
  </div>
</div>

<div id="message"></div>

<!-- MC simulation section -->
<h3 class="section-heading">monte carlo hand equity</h3>

<div class="explanation">
  <p>Pick any two hole cards and choose how many opponents to simulate against. The simulator deals <code>10,000</code> random boards, evaluates all hands, and reports your estimated win percentage. The convergence chart shows how the estimate stabilizes as more samples are drawn — a visual demonstration of the law of large numbers.</p>
</div>

<div class="sim-controls">
  <div class="card-picker">
    <label>card 1
      <select id="sim-rank1">
        <option value="A">A</option><option value="K">K</option><option value="Q">Q</option>
        <option value="J">J</option><option value="10">10</option><option value="9">9</option>
        <option value="8">8</option><option value="7">7</option><option value="6">6</option>
        <option value="5">5</option><option value="4">4</option><option value="3">3</option>
        <option value="2">2</option>
      </select>
      <select id="sim-suit1">
        <option value="♠">♠</option><option value="♥">♥</option>
        <option value="♦">♦</option><option value="♣">♣</option>
      </select>
    </label>
    <label>card 2
      <select id="sim-rank2">
        <option value="K">K</option><option value="A">A</option><option value="Q">Q</option>
        <option value="J">J</option><option value="10">10</option><option value="9">9</option>
        <option value="8">8</option><option value="7">7</option><option value="6">6</option>
        <option value="5">5</option><option value="4">4</option><option value="3">3</option>
        <option value="2">2</option>
      </select>
      <select id="sim-suit2">
        <option value="♠">♠</option><option value="♥">♥</option>
        <option value="♦">♦</option><option value="♣">♣</option>
      </select>
    </label>
  </div>
  <label>opponents <input type="number" id="sim-opponents" value="3" min="1" max="8"></label>
  <label>simulations <input type="number" id="sim-count" value="10000" min="1000" max="100000" step="1000"></label>
  <button id="sim-run">run simulation</button>
  <button id="sim-reset">reset</button>
</div>

<div id="sim-selected-hand" class="hand" style="justify-content:flex-start;min-height:0;margin:1rem 0"></div>

<div class="stats">
  <div class="stat">
    <span class="label">win %</span>
    <span id="sim-win" class="value">--</span>
  </div>
  <div class="stat">
    <span class="label">tie %</span>
    <span id="sim-tie" class="value">--</span>
  </div>
  <div class="stat">
    <span class="label">loss %</span>
    <span id="sim-loss" class="value">--</span>
  </div>
  <div class="stat">
    <span class="label">samples</span>
    <span id="sim-samples" class="value">0</span>
  </div>
</div>

<div class="canvas-wrap">
  <canvas id="equity-canvas" width="600" height="350"></canvas>
</div>

<h3 class="section-heading">starting hand categories</h3>

<div class="explanation">
  <p>The bar chart below shows estimated win percentages for common starting hand categories vs 3 opponents, computed via Monte Carlo. Suited hands gain ~3–4% equity from flush potential. Pocket aces dominate but still lose ~35% of the time against three opponents — a reminder that even the best hand needs the board to cooperate.</p>
</div>

<div class="canvas-wrap">
  <canvas id="category-canvas" width="600" height="400"></canvas>
</div>

<div class="controls">
  <button id="cat-run">compute categories</button>
</div>
