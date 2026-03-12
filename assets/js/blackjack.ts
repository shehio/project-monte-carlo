import { Card, createShoe, cardValue, handTotal, isBlackjack, canSplit, hiLoValue, renderHand } from './lib/cards';

function main() {
  const NUM_DECKS = 6;
  const RESHUFFLE_AT = 78;

  let shoe = createShoe(NUM_DECKS);
  let bankroll = 1000;
  let bet = 0;
  let playerHands: { cards: Card[]; bet: number }[] = [];
  let activeHandIdx = 0;
  let dealerHand: Card[] = [];
  let runningCount = 0;
  let phase: 'betting' | 'playing' | 'dealer' | 'done' = 'betting';

  const dom = {
    dealerCards: document.getElementById('dealer-cards')!,
    dealerTotal: document.getElementById('dealer-total')!,
    playerCards: document.getElementById('player-cards')!,
    playerTotal: document.getElementById('player-total')!,
    bankroll: document.getElementById('bankroll')!,
    currentBet: document.getElementById('current-bet')!,
    runningCount: document.getElementById('running-count')!,
    betControls: document.getElementById('bet-controls')!,
    actionControls: document.getElementById('action-controls')!,
    betInput: document.getElementById('bet-input') as HTMLInputElement,
    message: document.getElementById('message')!,
    hitBtn: document.getElementById('hit-btn') as HTMLButtonElement,
    standBtn: document.getElementById('stand-btn') as HTMLButtonElement,
    doubleBtn: document.getElementById('double-btn') as HTMLButtonElement,
    splitBtn: document.getElementById('split-btn') as HTMLButtonElement,
  };

  function draw(): Card {
    const c = shoe.pop()!;
    runningCount += hiLoValue(c);
    dom.runningCount.textContent = String(runningCount);
    return c;
  }

  function updateDisplay() {
    dom.bankroll.textContent = '$' + bankroll.toLocaleString();
    dom.currentBet.textContent = bet > 0 ? '$' + bet : '\u2014';

    if (playerHands.length > 0) {
      const hand = playerHands[activeHandIdx];
      renderHand('player-cards', hand.cards, false);
      dom.playerTotal.textContent = String(handTotal(hand.cards));
    }

    if (dealerHand.length > 0) {
      const hideHole = phase === 'playing';
      renderHand('dealer-cards', dealerHand, hideHole);
      dom.dealerTotal.textContent = hideHole
        ? String(cardValue(dealerHand[1]))
        : String(handTotal(dealerHand));
    }

    dom.betControls.style.display = phase === 'betting' ? 'flex' : 'none';
    dom.actionControls.style.display = phase === 'playing' ? 'flex' : 'none';

    if (phase === 'playing') {
      const hand = playerHands[activeHandIdx];
      dom.doubleBtn.disabled = hand.cards.length !== 2 || bankroll < hand.bet;
      dom.splitBtn.disabled = !canSplit(hand.cards) || bankroll < hand.bet;
    }
  }

  function setMessage(text: string, isLoss?: boolean) {
    dom.message.textContent = text;
    dom.message.className = isLoss ? 'loss' : '';
  }

  function deal() {
    const b = parseInt(dom.betInput.value);
    if (isNaN(b) || b < 10 || b > bankroll) {
      setMessage('invalid bet');
      return;
    }

    if (shoe.length < RESHUFFLE_AT) {
      shoe = createShoe(NUM_DECKS);
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

    if (isBlackjack(playerHands[0].cards)) {
      phase = 'done';
      renderHand('dealer-cards', dealerHand, false);
      dom.dealerTotal.textContent = String(handTotal(dealerHand));
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
    const splitCard = hand.cards.pop()!;
    bankroll -= hand.bet;

    hand.cards.push(draw());
    const newHand = { cards: [splitCard, draw()], bet: hand.bet };
    playerHands.splice(activeHandIdx + 1, 0, newHand);

    updateDisplay();
  }

  function advanceHand(): boolean {
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
    dom.dealerTotal.textContent = String(handTotal(dealerHand));
    dom.actionControls.style.display = 'none';

    function dealerStep() {
      if (handTotal(dealerHand) < 17) {
        dealerHand.push(draw());
        renderHand('dealer-cards', dealerHand, false);
        dom.dealerTotal.textContent = String(handTotal(dealerHand));
        setTimeout(dealerStep, 300);
      } else {
        resolveHands();
      }
    }

    setTimeout(dealerStep, 450);
  }

  function resolveHands() {
    const dealerT = handTotal(dealerHand);
    const dealerBust = dealerT > 21;
    const msg: string[] = [];

    for (const hand of playerHands) {
      const playerT = handTotal(hand.cards);
      if (playerT > 21) {
        msg.push('bust');
      } else if (dealerBust || playerT > dealerT) {
        bankroll += hand.bet * 2;
        msg.push('win');
      } else if (playerT === dealerT) {
        bankroll += hand.bet;
        msg.push('push');
      } else {
        msg.push('lose');
      }
    }

    const isLoss = msg.every(m => m === 'bust' || m === 'lose');
    setMessage(msg.join(' \u00b7 '), isLoss);
    finishRound();
  }

  function finishRound() {
    phase = 'betting';
    renderHand('dealer-cards', dealerHand, false);
    dom.dealerTotal.textContent = String(handTotal(dealerHand));
    updateDisplay();

    if (bankroll <= 0) {
      setMessage('bankrupt \u2014 refresh to restart', true);
      dom.betControls.style.display = 'none';
    }
  }

  document.getElementById('deal-btn')!.addEventListener('click', deal);
  dom.hitBtn.addEventListener('click', hit);
  dom.standBtn.addEventListener('click', stand);
  dom.doubleBtn.addEventListener('click', doubleDown);
  dom.splitBtn.addEventListener('click', split);

  updateDisplay();
}

main();
