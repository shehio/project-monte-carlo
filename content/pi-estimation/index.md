---
title: "π estimation"
subtitle: "random sampling in the unit square"
js: "pi-estimation.js"
---

<div class="explanation">
  <p>A quarter circle of radius 1 inscribed in the unit square has area π/4. Drop random points in the square — the fraction landing inside the quarter circle approximates π/4.</p>
  <p class="formula">π ≈ 4 × (points inside) / (total points)</p>
  <p>The error decreases as <code>1/√n</code> — quadrupling the points halves the error. This is the Monte Carlo convergence rate.</p>
</div>

<div id="pi-indicator" class="data-indicator live"><span class="dot"></span>live simulation</div>

<div class="canvas-wrap">
  <canvas id="pi-canvas" width="600" height="600"></canvas>
</div>

<div class="stats">
  <div class="stat">
    <span class="label">π estimate</span>
    <span id="pi-value" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">points</span>
    <span id="point-count" class="value">0</span>
  </div>
  <div class="stat">
    <span class="label">error</span>
    <span id="pi-error" class="value">—</span>
  </div>
</div>

<div class="controls">
  <button id="pi-start">start</button>
  <button id="pi-reset">reset</button>
  <label>speed <input type="range" id="pi-speed" min="1" max="200" value="20"></label>
</div>
