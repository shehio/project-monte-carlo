---
title: "convergence"
subtitle: "central limit theorem in action"
js: "convergence.js"
---

<div class="explanation">
  <p>The Central Limit Theorem: the mean of n independent samples approaches a normal distribution as n grows — regardless of the source distribution's shape.</p>
  <p class="formula">σ_means = σ_source / √n</p>
  <p>This is why confidence intervals and hypothesis tests work. The spread of sample means shrinks predictably as <code>1/√n</code>, making estimation more precise with larger samples.</p>
</div>

<div id="clt-indicator" class="data-indicator live"><span class="dot"></span>live simulation</div>

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
    <span class="label">theoretical std</span>
    <span id="clt-theory-std" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">samples</span>
    <span id="clt-count" class="value">0</span>
  </div>
</div>

<div class="controls">
  <label>n <input type="range" id="sample-size" min="1" max="500" value="1"></label>
  <label>
    <select id="dist-select">
      <option value="exponential">exponential</option>
      <option value="uniform">uniform</option>
      <option value="bimodal">bimodal</option>
      <option value="chi-squared">chi-squared (k=2)</option>
      <option value="log-normal">log-normal</option>
      <option value="beta">beta(2,5)</option>
      <option value="poisson">poisson (λ=4)</option>
    </select>
  </label>
  <button id="clt-run">run</button>
  <button id="clt-reset">reset</button>
</div>
