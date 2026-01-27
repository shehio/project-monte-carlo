---
title: "option pricing"
subtitle: "monte carlo vs black-scholes"
js: "option-pricing.js"
---

<div class="canvas-row">
  <div>
    <h3>simulated paths</h3>
    <canvas id="paths-canvas" width="400" height="280"></canvas>
  </div>
  <div>
    <h3>terminal prices</h3>
    <canvas id="dist-canvas" width="400" height="280"></canvas>
  </div>
</div>

<div class="stats">
  <div class="stat">
    <span class="label">mc price</span>
    <span id="mc-price" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">bs price</span>
    <span id="bs-price" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">paths</span>
    <span id="path-count" class="value">0</span>
  </div>
</div>

<div class="controls">
  <label>S₀ <input type="number" id="spot" value="100" step="5"></label>
  <label>K <input type="number" id="strike" value="100" step="5"></label>
  <label>σ <input type="range" id="vol" min="0.05" max="0.80" step="0.05" value="0.20"></label>
  <label>T <input type="range" id="maturity" min="0.25" max="2.0" step="0.25" value="1.0"></label>
  <button id="price-run">simulate</button>
  <button id="price-reset">reset</button>
</div>
