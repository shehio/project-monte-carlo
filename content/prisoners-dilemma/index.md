---
title: "prisoner's dilemma"
subtitle: "cooperate or defect?"
js: "prisoners-dilemma.js"
---

<div class="explanation">
  <p>Two prisoners can <strong>cooperate</strong> (stay silent) or <strong>defect</strong> (betray). Mutual cooperation pays 3 each. Mutual defection pays 1 each. Betraying a cooperator pays 5, while the cooperator gets 0.</p>
  <p class="formula">CC → 3,3 &emsp; CD → 0,5 &emsp; DC → 5,0 &emsp; DD → 1,1</p>
  <p>In a single game, defection dominates. But iterated over hundreds of rounds with noise, cooperation can emerge and thrive. Select strategies below and run a round-robin tournament.</p>
</div>

<div class="data-indicator live"><span class="dot"></span> interactive</div>

<div class="pd-strategies" id="pd-strategies">
  <label><input type="checkbox" value="tit-for-tat" checked> tit for tat</label>
  <label><input type="checkbox" value="always-cooperate" checked> always cooperate</label>
  <label><input type="checkbox" value="always-defect" checked> always defect</label>
  <label><input type="checkbox" value="grudger" checked> grudger</label>
  <label><input type="checkbox" value="random" checked> random</label>
  <label><input type="checkbox" value="pavlov" checked> pavlov</label>
  <label><input type="checkbox" value="tit-for-two-tats" checked> tit for two tats</label>
</div>

<div class="controls">
  <label>rounds <input type="number" id="pd-rounds" value="200" min="10" max="10000"></label>
  <label>noise <input type="number" id="pd-noise" value="5" min="0" max="50">%</label>
  <button id="pd-run">run tournament</button>
</div>

<h3 class="section-heading">results</h3>

<div class="canvas-wrap">
  <canvas id="pd-canvas" width="600" height="350"></canvas>
</div>

<div id="pd-matchups" class="pd-matchups"></div>
