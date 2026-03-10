---
title: "monty hall"
subtitle: "should you switch doors?"
js: "monty-hall.js"
---

<div class="explanation">
  <p>You're on a game show. Three doors — behind one is a car, behind the other two are goats. You pick a door. The host, who knows what's behind each door, opens another door to reveal a goat. Should you <strong>switch</strong> to the remaining door?</p>
  <p class="formula" id="mh-formula">P(win | switch) = 2/3 &emsp; P(win | stay) = 1/3</p>
  <p>Counterintuitively, switching doubles your odds. Your initial pick had a 1/3 chance of being right — the host's reveal doesn't change that. The remaining door absorbs the full 2/3 probability. Play the game below, then run the simulation to watch the numbers converge.</p>
</div>

<div class="data-indicator live"><span class="dot"></span> interactive</div>

<div class="controls" style="margin-top:0">
  <label>doors <input type="number" id="mh-door-count" value="3" min="3" max="20"></label>
</div>

<div class="monty-doors" id="monty-doors"></div>

<div id="mh-message" class="game-message">pick a door</div>

<div id="mh-choice" class="mh-choice-buttons" style="display:none">
  <button id="mh-switch">switch</button>
  <button id="mh-stay">stay</button>
</div>

<div class="controls">
  <button id="mh-new">new game</button>
</div>

<div class="stats" id="mh-game-stats">
  <div class="stat">
    <span class="label">games</span>
    <span id="mh-games" class="value">0</span>
  </div>
  <div class="stat">
    <span class="label">switched &amp; won</span>
    <span id="mh-sw-wins" class="value">0</span>
  </div>
  <div class="stat">
    <span class="label">stayed &amp; won</span>
    <span id="mh-st-wins" class="value">0</span>
  </div>
  <div class="stat">
    <span class="label">switch win %</span>
    <span id="mh-sw-pct" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">stay win %</span>
    <span id="mh-st-pct" class="value">—</span>
  </div>
</div>

<h3 class="section-heading">monte carlo simulation</h3>

<div class="canvas-wrap">
  <canvas id="mh-canvas" width="600" height="350"></canvas>
</div>

<div class="stats">
  <div class="stat">
    <span class="label">trials</span>
    <span id="mh-trials" class="value">0</span>
  </div>
  <div class="stat">
    <span class="label">switch win rate</span>
    <span id="mh-sim-sw" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">stay win rate</span>
    <span id="mh-sim-st" class="value">—</span>
  </div>
</div>

<div class="controls">
  <label>trials <input type="number" id="mh-trial-count" value="10000" min="100" max="1000000" step="1000"></label>
  <button id="mh-run">run</button>
  <button id="mh-reset">reset</button>
</div>
