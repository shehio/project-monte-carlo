---
title: "π estimation"
subtitle: "random sampling in the unit square"
js: "pi-estimation.js"
---

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
