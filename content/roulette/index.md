---
title: "roulette"
subtitle: "does the wheel have a memory?"
js: "roulette.ts"
---

<div class="explanation">
  <p>The <strong>gambler's fallacy</strong> is the belief that past random outcomes affect future ones. After five reds in a row, many players bet black — convinced it's "due." But the wheel has no memory.</p>
  <p class="formula">P(red | any streak) = 18/37 ≈ 48.6%</p>
  <p>Each spin is independent. No pattern of past results changes the odds of the next spin. Spin the wheel below, then run the simulation to watch the fallacy shatter against the data.</p>
  <p class="formula">references</p>
  <p>Ethier. "The Doctrine of Chances." <em>Springer</em>, 2010.</p>
  <p>Kaivanto. "The effect of decayed expectations on hot hand beliefs." <em>Cognition</em>, 2023.</p>
</div>

<div class="data-indicator live"><span class="dot"></span> interactive</div>

<div class="rl-game">
  <div class="rl-result" id="rl-result">—</div>
  <div class="rl-history" id="rl-history"></div>
</div>

<div class="controls" style="justify-content:center">
  <button id="rl-spin">spin</button>
  <button id="rl-spin10">×10</button>
  <button id="rl-spin100">×100</button>
</div>

<div class="stats">
  <div class="stat">
    <span class="label">spins</span>
    <span id="rl-spins" class="value">0</span>
  </div>
  <div class="stat">
    <span class="label">red</span>
    <span id="rl-red-pct" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">black</span>
    <span id="rl-black-pct" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">streak</span>
    <span id="rl-streak" class="value">—</span>
  </div>
</div>

<h3 class="section-heading">the fallacy test</h3>

<p class="explanation" style="margin-bottom:1rem">After a streak of K reds, what's the probability the next spin is red? Run the simulation — every bar lands near 48.6%, regardless of streak length.</p>

<div class="canvas-wrap">
  <canvas id="rl-canvas" width="600" height="350"></canvas>
</div>

<div class="stats">
  <div class="stat">
    <span class="label">simulated spins</span>
    <span id="rl-sim-spins" class="value">0</span>
  </div>
</div>

<div class="controls">
  <label>spins <input type="number" id="rl-sim-count" value="100000" min="10000" max="10000000" step="10000"></label>
  <button id="rl-run">run</button>
  <button id="rl-reset">reset</button>
</div>
