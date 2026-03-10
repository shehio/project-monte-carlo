---
title: "secretary problem"
subtitle: "when should you stop looking?"
js: "secretary-problem.js"
---

<div class="explanation">
  <p>You're hiring. <em>N</em> candidates arrive in random order. After each interview, you must hire or pass — no callbacks. The optimal strategy: <strong>reject the first 37%</strong>, then hire the next candidate who's better than everyone you've seen.</p>
  <p class="formula">optimal threshold = N/e ≈ 37% &emsp; P(best) ≈ 1/e ≈ 36.8%</p>
  <p>This is the <strong>optimal stopping problem</strong>. The 1/e rule maximizes your chance of picking the single best candidate. Play the game below, then run the simulation to see the peak at 37%.</p>
</div>

<div class="data-indicator live"><span class="dot"></span> interactive</div>

<div class="sp-candidate" id="sp-candidate">
  <div class="sp-number" id="sp-number">—</div>
  <div class="sp-score" id="sp-score"></div>
  <div class="sp-best-so-far" id="sp-best-label"></div>
</div>

<div id="sp-message" class="game-message">press "new game" to start</div>

<div class="controls">
  <label>candidates <input type="number" id="sp-n" value="20" min="3" max="200"></label>
  <button id="sp-hire">hire</button>
  <button id="sp-pass">pass</button>
  <button id="sp-new">new game</button>
</div>

<div class="stats" id="sp-game-stats">
  <div class="stat">
    <span class="label">games</span>
    <span id="sp-games" class="value">0</span>
  </div>
  <div class="stat">
    <span class="label">picked best</span>
    <span id="sp-wins" class="value">0</span>
  </div>
  <div class="stat">
    <span class="label">success rate</span>
    <span id="sp-rate" class="value">—</span>
  </div>
</div>

<h3 class="section-heading">monte carlo simulation</h3>

<p class="explanation" style="margin-bottom:1rem">For each rejection threshold (0%–100%), simulate thousands of hiring rounds. The peak reveals the optimal stopping point.</p>

<div class="canvas-wrap">
  <canvas id="sp-canvas" width="600" height="350"></canvas>
</div>

<div class="stats">
  <div class="stat">
    <span class="label">trials per point</span>
    <span id="sp-trials" class="value">0</span>
  </div>
  <div class="stat">
    <span class="label">peak threshold</span>
    <span id="sp-peak" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">peak success</span>
    <span id="sp-peak-rate" class="value">—</span>
  </div>
</div>

<div class="controls">
  <label>candidates <input type="number" id="sp-sim-n" value="100" min="10" max="1000"></label>
  <label>trials <input type="number" id="sp-sim-trials" value="5000" min="100" max="100000" step="1000"></label>
  <button id="sp-run">run</button>
  <button id="sp-sim-reset">reset</button>
</div>
