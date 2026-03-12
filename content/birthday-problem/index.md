---
title: "birthday problem"
subtitle: "probability of shared birthdays"
js: "birthday-problem.ts"
---

<div class="explanation">
  <p>In a room of n people, the probability of at least two sharing a birthday is surprisingly high. With just 23 people, it's over 50%.</p>
  <p class="formula">P(match) = 1 − 365!/(365ⁿ · (365−n)!)</p>
  <p>This counterintuitive result illustrates the birthday paradox — the number of possible pairs grows as <code>n(n−1)/2</code>, much faster than n itself.</p>
  <p class="formula">references</p>
  <p>DasGupta. "The matching, birthday and strong birthday problem: a contemporary review." <em>Journal of Statistical Planning and Inference</em>, 2005.</p>
  <p>Wendl. "Collision probability between sets of random variables." <em>Statistics & Probability Letters</em>, 2003.</p>
</div>

<div id="bday-indicator" class="data-indicator live"><span class="dot"></span>live simulation</div>

<div class="canvas-wrap">
  <canvas id="bday-canvas" width="600" height="400"></canvas>
</div>

<div class="stats">
  <div class="stat">
    <span class="label">room size</span>
    <span id="bday-n" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">P(match) simulated</span>
    <span id="bday-p-sim" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">P(match) theoretical</span>
    <span id="bday-p-theory" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">trials</span>
    <span id="bday-trials" class="value">0</span>
  </div>
</div>

<div class="controls">
  <label>room size <input type="range" id="bday-size" min="2" max="70" value="23"></label>
  <button id="bday-run">run 10,000 trials</button>
  <button id="bday-reset">reset</button>
</div>
