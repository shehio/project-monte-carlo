---
title: "blackjack"
subtitle: "6-deck shoe · dealer stands on 17"
js: "blackjack.ts"
---

<div class="explanation">
  <p>The house edge in blackjack is ~0.5% with basic strategy. Card counting tilts the odds by tracking the ratio of high to low cards remaining in the shoe.</p>
  <p class="formula">Hi-Lo: +1 for 2–6 · 0 for 7–9 · −1 for 10,J,Q,K,A</p>
  <p>A positive running count means more high cards remain, favoring the player. True count = running count / decks remaining — bet more when it's high.</p>
  <p class="formula">references</p>
  <p>Thorp. "Beat the Dealer." <em>Vintage</em>, 1966.</p>
  <p>Griffin. "The Theory of Blackjack." <em>Huntington Press</em>, 1999.</p>
</div>

<div class="table">
  <div class="dealer-area">
    <h3>dealer</h3>
    <div id="dealer-cards" class="hand"></div>
    <div id="dealer-total" class="total"></div>
  </div>
  <div class="player-area">
    <h3>player</h3>
    <div id="player-cards" class="hand"></div>
    <div id="player-total" class="total"></div>
  </div>
</div>

<div class="game-info">
  <div class="stat">
    <span class="label">bankroll</span>
    <span id="bankroll" class="value">$1,000</span>
  </div>
  <div class="stat">
    <span class="label">bet</span>
    <span id="current-bet" class="value">—</span>
  </div>
  <div class="stat">
    <span class="label">hi-lo count</span>
    <span id="running-count" class="value">0</span>
  </div>
</div>

<div class="controls">
  <div id="bet-controls">
    <input type="number" id="bet-input" value="25" min="10" max="500" step="5">
    <button id="deal-btn">deal</button>
  </div>
  <div id="action-controls" style="display:none">
    <button id="hit-btn">hit</button>
    <button id="stand-btn">stand</button>
    <button id="double-btn">double</button>
    <button id="split-btn" disabled>split</button>
  </div>
</div>

<div id="message"></div>
