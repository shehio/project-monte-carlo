---
title: "craps"
subtitle: "dice probabilities · house edge simulation"
js: "craps.ts"
---

<div class="explanation">
  <p>Craps is decided by a pair of dice. The come-out roll determines the game's trajectory: <strong>7 or 11</strong> wins immediately (a "natural"), <strong>2, 3, or 12</strong> loses ("craps"), and anything else establishes a <strong>point</strong>. The shooter then rolls until the point hits (win) or a 7 appears (lose).</p>
  <p class="formula">P(pass line win) = 244/495 ≈ 49.29% · house edge ≈ 1.41%</p>
  <p>The field bet pays on 2, 3, 4, 9, 10, 11, 12 (with 2 and 12 paying double), giving a house edge of ~5.56%. The don't pass bet is nearly the mirror of the pass line — the house edge drops to ~1.36%, making it one of the best bets in the casino.</p>
  <p>Run the Monte Carlo simulation below to watch empirical house edges converge to their theoretical values across thousands of resolved bets.</p>
</div>

<div class="data-indicator live"><span class="dot"></span> interactive</div>

<!-- dice display -->
<div class="craps-table" id="craps-table">
  <div class="craps-dice-row">
    <div class="craps-die" id="die-1">
      <div class="die-face"></div>
    </div>
    <div class="craps-die" id="die-2">
      <div class="die-face"></div>
    </div>
  </div>
  <div class="craps-roll-total" id="roll-total">&mdash;</div>
  <div class="craps-phase" id="phase-display">place your bet and roll</div>
  <div class="craps-point" id="point-display"></div>
</div>

<!-- bet controls -->
<div class="controls" style="justify-content:center;flex-wrap:wrap">
  <label>bet type
    <select id="craps-bet-type">
      <option value="pass">pass line</option>
      <option value="dontpass">don't pass</option>
      <option value="field">field</option>
    </select>
  </label>
  <label>wager <input type="number" id="craps-wager" value="25" min="5" max="500" step="5"></label>
  <button id="craps-roll">roll</button>
  <button id="craps-reset-game">new shooter</button>
</div>

<div class="game-info" style="justify-content:center">
  <div class="stat">
    <span class="label">bankroll</span>
    <span id="craps-bankroll" class="value">$1,000</span>
  </div>
  <div class="stat">
    <span class="label">point</span>
    <span id="craps-point-val" class="value">&mdash;</span>
  </div>
  <div class="stat">
    <span class="label">wins</span>
    <span id="craps-wins" class="value">0</span>
  </div>
  <div class="stat">
    <span class="label">losses</span>
    <span id="craps-losses" class="value">0</span>
  </div>
</div>

<div id="craps-message" class="game-message"></div>

<!-- roll history -->
<div class="craps-history" id="craps-history"></div>

<h3 class="section-heading">monte carlo · house edge convergence</h3>

<div class="explanation">
  <p>Simulate thousands of resolved craps bets for each strategy. The chart shows how the measured house edge converges toward the theoretical value as sample size grows. Pass line and don't pass hover near 1.4%, while the field bet stabilizes around 5.6%.</p>
  <p class="formula">house edge = (total wagered &minus; total returned) / total wagered</p>
</div>

<div class="canvas-wrap">
  <canvas id="craps-edge-canvas" width="600" height="350"></canvas>
</div>

<div class="stats">
  <div class="stat">
    <span class="label">simulated bets</span>
    <span id="craps-sim-n" class="value">0</span>
  </div>
  <div class="stat">
    <span class="label">pass edge</span>
    <span id="craps-sim-pass" class="value">&mdash;</span>
  </div>
  <div class="stat">
    <span class="label">don't pass edge</span>
    <span id="craps-sim-dp" class="value">&mdash;</span>
  </div>
  <div class="stat">
    <span class="label">field edge</span>
    <span id="craps-sim-field" class="value">&mdash;</span>
  </div>
</div>

<div class="controls">
  <label>bets <input type="number" id="craps-sim-count" value="50000" min="1000" max="1000000" step="1000"></label>
  <button id="craps-sim-run">run</button>
  <button id="craps-sim-reset">reset</button>
</div>

<h3 class="section-heading">bankroll trajectories</h3>

<div class="explanation">
  <p>Each line traces one simulated session of 200 bets at $10 per wager, starting with $500. The pass line and don't pass trajectories drift slowly downward; the field bet erodes bankrolls faster. Variance keeps individual paths noisy, but the trend is clear.</p>
</div>

<div class="canvas-wrap">
  <canvas id="craps-bankroll-canvas" width="600" height="350"></canvas>
</div>

<div class="controls">
  <label>sessions <input type="number" id="craps-traj-sessions" value="20" min="1" max="100" step="1"></label>
  <button id="craps-traj-run">run</button>
  <button id="craps-traj-reset">reset</button>
</div>

<h3 class="section-heading">references</h3>

<div class="explanation">
  <p>Epstein, R. A. <em>The Theory of Gambling and Statistical Logic</em>, 2nd ed. Academic Press, 2009. Comprehensive treatment of dice probabilities and optimal play.</p>
  <p>Ethier, S. N. <em>The Doctrine of Chances: Probabilistic Aspects of Gambling</em>. Springer, 2010. Chapter 6 covers craps combinatorics and house-edge derivations.</p>
  <p>Haigh, J. <em>Taking Chances: Winning with Probability</em>. Oxford University Press, 2003. Accessible introduction to gambling mathematics including craps expected values.</p>
</div>
