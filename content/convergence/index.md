---
title: "convergence"
subtitle: "central limit theorem in action"
js: "convergence.js"
---

<div class="canvas-row">
  <div>
    <h3>source distribution</h3>
    <canvas id="source-canvas" width="400" height="280"></canvas>
  </div>
  <div>
    <h3>sample means · n = <span id="n-label">1</span></h3>
    <canvas id="means-canvas" width="400" height="280"></canvas>
  </div>
</div>

<div class="stats">
  <div class="stat">
    <span class="label">mean of means</span>
    <span id="clt-mean" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">std of means</span>
    <span id="clt-std" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">samples</span>
    <span id="clt-count" class="value">0</span>
  </div>
</div>

<div class="controls">
  <label>n <input type="range" id="sample-size" min="1" max="100" value="1"></label>
  <label>
    <select id="dist-select">
      <option value="exponential">exponential</option>
      <option value="uniform">uniform</option>
      <option value="bimodal">bimodal</option>
    </select>
  </label>
  <button id="clt-run">run</button>
  <button id="clt-reset">reset</button>
</div>
