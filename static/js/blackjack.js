(() => {
  const SUITS = ['\u2660', '\u2665', '\u2666', '\u2663'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const RED_SUITS = new Set(['\u2665', '\u2666']);
  const NUM_DECKS = 6;
  const RESHUFFLE_AT = 78;

  // ── shoe ──

  function createShoe() {
    const cards = [];
    for (let d = 0; d < NUM_DECKS; d++)
      for (const suit of SUITS)
        for (const rank of RANKS)
          cards.push({ rank, suit });
    shuffle(cards);
    return cards;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // ── hand logic ──

  function cardValue(card) {
    if (card.rank === 'A') return 11;
    if ('JQK'.includes(card.rank)) return 10;
    return parseInt(card.rank);
  }

  function handTotal(cards) {
    let total = 0, aces = 0;
    for (const c of cards) {
      total += cardValue(c);
      if (c.rank === 'A') aces++;
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  }

  function isSoft(cards) {
    let total = 0, aces = 0;
    for (const c of cards) {
      total += cardValue(c);
      if (c.rank === 'A') aces++;
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return aces > 0 && total <= 21;
  }

  function isBlackjack(cards) {
    return cards.length === 2 && handTotal(cards) === 21;
  }

  function canSplit(cards) {
    return cards.length === 2 && cardValue(cards[0]) === cardValue(cards[1]);
  }

  // ── hi-lo ──

  function hiLoValue(card) {
    const v = cardValue(card);
    if (card.rank === 'A' || v === 10) return -1;
    if (v >= 2 && v <= 6) return 1;
    return 0;
  }

  // ── rendering ──

  function renderCard(card, faceDown) {
    const el = document.createElement('div');
    el.className = 'playing-card';

    if (faceDown) {
      el.classList.add('face-down');
      return el;
    }

    if (RED_SUITS.has(card.suit)) el.classList.add('red');

    const top = document.createElement('div');
    top.className = 'rank-suit';
    top.textContent = card.rank + card.suit;

    const center = document.createElement('div');
    center.className = 'center-suit';
    center.textContent = card.suit;

    const bottom = document.createElement('div');
    bottom.className = 'rank-suit-flip';
    bottom.textContent = card.rank + card.suit;

    el.append(top, center, bottom);
    return el;
  }

  function renderHand(containerId, cards, hideFirst) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    cards.forEach((c, i) => container.appendChild(renderCard(c, hideFirst && i === 0)));
  }

  // ── state ──

  let shoe = createShoe();
  let bankroll = 1000;
  let bet = 0;
  let playerHands = [];
  let activeHandIdx = 0;
  let dealerHand = [];
  let runningCount = 0;
  let phase = 'betting'; // betting | playing | dealer | done

  const dom = {
    dealerCards: document.getElementById('dealer-cards'),
    dealerTotal: document.getElementById('dealer-total'),
    playerCards: document.getElementById('player-cards'),
    playerTotal: document.getElementById('player-total'),
    bankroll: document.getElementById('bankroll'),
    currentBet: document.getElementById('current-bet'),
    runningCount: document.getElementById('running-count'),
    betControls: document.getElementById('bet-controls'),
    actionControls: document.getElementById('action-controls'),
    betInput: document.getElementById('bet-input'),
    message: document.getElementById('message'),
    hitBtn: document.getElementById('hit-btn'),
    standBtn: document.getElementById('stand-btn'),
    doubleBtn: document.getElementById('double-btn'),
    splitBtn: document.getElementById('split-btn'),
  };

  function draw() {
    const c = shoe.pop();
    runningCount += hiLoValue(c);
    dom.runningCount.textContent = runningCount;
    return c;
  }

  function updateDisplay() {
    dom.bankroll.textContent = '$' + bankroll.toLocaleString();
    dom.currentBet.textContent = bet > 0 ? '$' + bet : '\u2014';

    if (playerHands.length > 0) {
      const hand = playerHands[activeHandIdx];
      renderHand('player-cards', hand.cards, false);
      dom.playerTotal.textContent = handTotal(hand.cards);
    }

    if (dealerHand.length > 0) {
      const hideHole = phase === 'playing';
      renderHand('dealer-cards', dealerHand, hideHole);
      dom.dealerTotal.textContent = hideHole
        ? cardValue(dealerHand[1])
        : handTotal(dealerHand);
    }

    dom.betControls.style.display = phase === 'betting' ? 'flex' : 'none';
    dom.actionControls.style.display = phase === 'playing' ? 'flex' : 'none';

    if (phase === 'playing') {
      const hand = playerHands[activeHandIdx];
      dom.doubleBtn.disabled = hand.cards.length !== 2 || bankroll < hand.bet;
      dom.splitBtn.disabled = !canSplit(hand.cards) || bankroll < hand.bet;
    }
  }

  function setMessage(text, isLoss) {
    dom.message.textContent = text;
    dom.message.className = isLoss ? 'loss' : '';
  }

  // ── game flow ──

  function deal() {
    const b = parseInt(dom.betInput.value);
    if (isNaN(b) || b < 10 || b > bankroll) {
      setMessage('invalid bet');
      return;
    }

    if (shoe.length < RESHUFFLE_AT) {
      shoe = createShoe();
      runningCount = 0;
      dom.runningCount.textContent = '0';
    }

    bet = b;
    bankroll -= bet;
    playerHands = [{ cards: [], bet }];
    activeHandIdx = 0;
    dealerHand = [];
    setMessage('');

    playerHands[0].cards.push(draw(), draw());
    dealerHand.push(draw(), draw());

    phase = 'playing';
    updateDisplay();

    // natural blackjack
    if (isBlackjack(playerHands[0].cards)) {
      phase = 'done';
      renderHand('dealer-cards', dealerHand, false);
      dom.dealerTotal.textContent = handTotal(dealerHand);
      if (isBlackjack(dealerHand)) {
        bankroll += bet;
        setMessage('push');
      } else {
        bankroll += bet + Math.floor(bet * 1.5);
        setMessage('blackjack!');
      }
      phase = 'betting';
      updateDisplay();
    }
  }

  function hit() {
    const hand = playerHands[activeHandIdx];
    hand.cards.push(draw());
    updateDisplay();

    if (handTotal(hand.cards) > 21) {
      if (!advanceHand()) {
        setMessage('bust', true);
        finishRound();
      }
    }
  }

  function stand() {
    if (!advanceHand()) {
      dealerPlay();
    }
  }

  function doubleDown() {
    const hand = playerHands[activeHandIdx];
    bankroll -= hand.bet;
    hand.bet *= 2;
    hand.cards.push(draw());
    updateDisplay();

    if (handTotal(hand.cards) > 21) {
      if (!advanceHand()) {
        setMessage('bust', true);
        finishRound();
      }
    } else if (!advanceHand()) {
      dealerPlay();
    }
  }

  function split() {
    const hand = playerHands[activeHandIdx];
    const splitCard = hand.cards.pop();
    bankroll -= hand.bet;

    hand.cards.push(draw());
    const newHand = { cards: [splitCard, draw()], bet: hand.bet };
    playerHands.splice(activeHandIdx + 1, 0, newHand);

    updateDisplay();
  }

  function advanceHand() {
    if (activeHandIdx < playerHands.length - 1) {
      activeHandIdx++;
      updateDisplay();
      return true;
    }
    return false;
  }

  function dealerPlay() {
    phase = 'dealer';
    renderHand('dealer-cards', dealerHand, false);
    dom.dealerTotal.textContent = handTotal(dealerHand);
    dom.actionControls.style.display = 'none';

    function dealerStep() {
      if (handTotal(dealerHand) < 17) {
        dealerHand.push(draw());
        renderHand('dealer-cards', dealerHand, false);
        dom.dealerTotal.textContent = handTotal(dealerHand);
        setTimeout(dealerStep, 300);
      } else {
        resolveHands();
      }
    }

    setTimeout(dealerStep, 400);
  }

  function resolveHands() {
    const dealerT = handTotal(dealerHand);
    const dealerBust = dealerT > 21;
    let totalWin = 0;
    let msg = [];

    for (const hand of playerHands) {
      const playerT = handTotal(hand.cards);
      if (playerT > 21) {
        msg.push('bust');
      } else if (dealerBust || playerT > dealerT) {
        bankroll += hand.bet * 2;
        totalWin += hand.bet;
        msg.push('win');
      } else if (playerT === dealerT) {
        bankroll += hand.bet;
        msg.push('push');
      } else {
        msg.push('lose');
      }
    }

    const isLoss = msg.every(m => m === 'bust' || m === 'lose');
    setMessage(msg.join(' · '), isLoss);
    finishRound();
  }

  function finishRound() {
    phase = 'betting';
    renderHand('dealer-cards', dealerHand, false);
    dom.dealerTotal.textContent = handTotal(dealerHand);
    updateDisplay();

    if (bankroll <= 0) {
      setMessage('bankrupt — refresh to restart', true);
      dom.betControls.style.display = 'none';
    }
  }

  // ── events ──

  document.getElementById('deal-btn').addEventListener('click', deal);
  dom.hitBtn.addEventListener('click', hit);
  dom.standBtn.addEventListener('click', stand);
  dom.doubleBtn.addEventListener('click', doubleDown);
  dom.splitBtn.addEventListener('click', split);

  updateDisplay();
})();
