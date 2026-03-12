---
title: "exotic options"
subtitle: "asian · barrier · lookback"
js: "exotic-options.ts"
---

<div class="explanation">
  <p>Exotic options have path-dependent payoffs — their value depends on the <em>entire</em> price history, not just the final price. No closed-form solutions exist, making Monte Carlo the primary pricing method.</p>
  <p class="formula">Asian: payoff = max(avg(S) − K, 0) · Barrier: knocked out if S hits B · Lookback: payoff = S_T − min(S)</p>
  <p>Asian options smooth out manipulation risk. Barrier options are cheaper than vanilla. Lookback options give perfect hindsight — and cost accordingly.</p>
  <p class="formula">references</p>
  <p>Broadie & Glasserman. "Estimating security price derivatives using simulation." <em>Management Science</em>, 1996.</p>
  <p>Bouchard & Warin. "Monte Carlo valuation of American options." <em>Mathematical Finance</em>, 2012.</p>
</div>

<div id="exotic-indicator" class="data-indicator live"><span class="dot"></span>live simulation</div>

<div class="canvas-row">
  <div>
    <h3>simulated paths</h3>
    <canvas id="exotic-paths-canvas" width="400" height="280"></canvas>
  </div>
  <div>
    <h3>price convergence</h3>
    <canvas id="exotic-conv-canvas" width="400" height="280"></canvas>
  </div>
</div>

<div class="stats">
  <div class="stat">
    <span class="label">vanilla (BS)</span>
    <span id="exotic-vanilla" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">asian</span>
    <span id="exotic-asian" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">barrier (U&O)</span>
    <span id="exotic-barrier" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">lookback</span>
    <span id="exotic-lookback" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">paths</span>
    <span id="exotic-count" class="value">0</span>
  </div>
</div>

<div class="controls">
  <label>S₀ <input type="number" id="exotic-spot" value="100" step="5"></label>
  <label>K <input type="number" id="exotic-strike" value="100" step="5"></label>
  <label>B <input type="number" id="exotic-barrier-input" value="130" step="5"></label>
  <label>σ <input type="range" id="exotic-vol" min="0.05" max="0.80" step="0.05" value="0.20"></label>
  <label>T <input type="range" id="exotic-maturity" min="0.25" max="2.0" step="0.25" value="1.0"></label>
  <button id="exotic-run">simulate</button>
  <button id="exotic-reset">reset</button>
</div>
