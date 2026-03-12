---
title: "integration"
subtitle: "monte carlo area estimation"
js: "integration.ts"
---

<div class="explanation">
  <p>Estimate <code>∫f(x)dx</code> by throwing random points into a bounding box. The fraction landing under the curve times the box area approximates the integral.</p>
  <p class="formula">∫f(x)dx ≈ (points under curve / total points) × box area</p>
  <p>MC integration scales to arbitrary dimensions where deterministic methods fail — this is why it powers physics simulations and financial models.</p>
  <p class="formula">references</p>
  <p>Caflisch. "Monte Carlo and quasi-Monte Carlo methods." <em>Acta Numerica</em>, 1998.</p>
  <p>Dick et al. "High-dimensional integration: the quasi-Monte Carlo way." <em>Acta Numerica</em>, 2013.</p>
</div>

<div id="int-indicator" class="data-indicator live"><span class="dot"></span>live simulation</div>

<div class="canvas-wrap">
  <canvas id="int-canvas" width="600" height="400"></canvas>
</div>

<div class="stats">
  <div class="stat">
    <span class="label">estimate</span>
    <span id="int-estimate" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">exact</span>
    <span id="int-exact" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">points</span>
    <span id="int-count" class="value">0</span>
  </div>
  <div class="stat">
    <span class="label">error</span>
    <span id="int-error" class="value">—</span>
  </div>
</div>

<div class="controls">
  <label>
    <select id="fn-select">
      <option value="sin">sin(x) on [0, π]</option>
      <option value="gaussian">e^(-x²) on [0, 2]</option>
      <option value="quadratic">x² on [0, 1]</option>
    </select>
  </label>
  <button id="int-start">start</button>
  <button id="int-reset">reset</button>
  <label>speed <input type="range" id="int-speed" min="1" max="100" value="10"></label>
</div>
