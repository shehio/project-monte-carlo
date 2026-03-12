import { Card, createDeck, createShoe, shuffleCards, cardValue, handTotal, isSoft, isBlackjack, canSplit, hiLoValue, pokerRankValue, evaluatePokerHand, comparePokerHands, HAND_NAMES } from '@lib/cards';

describe('createDeck', () => {
  it('creates 52 cards', () => {
    expect(createDeck()).toHaveLength(52);
  });

  it('has 4 suits', () => {
    const deck = createDeck();
    const suits = new Set(deck.map(c => c.suit));
    expect(suits.size).toBe(4);
  });

  it('has 13 ranks per suit', () => {
    const deck = createDeck();
    const spades = deck.filter(c => c.suit === '\u2660');
    expect(spades).toHaveLength(13);
  });
});

describe('createShoe', () => {
  it('creates correct number of cards for 6 decks', () => {
    const shoe = createShoe(6);
    expect(shoe).toHaveLength(312);
  });
});

describe('cardValue', () => {
  it('returns 11 for ace', () => {
    expect(cardValue({ rank: 'A', suit: '\u2660' })).toBe(11);
  });

  it('returns 10 for face cards', () => {
    expect(cardValue({ rank: 'J', suit: '\u2660' })).toBe(10);
    expect(cardValue({ rank: 'Q', suit: '\u2665' })).toBe(10);
    expect(cardValue({ rank: 'K', suit: '\u2666' })).toBe(10);
  });

  it('returns numeric value for number cards', () => {
    expect(cardValue({ rank: '2', suit: '\u2660' })).toBe(2);
    expect(cardValue({ rank: '7', suit: '\u2665' })).toBe(7);
    expect(cardValue({ rank: '10', suit: '\u2663' })).toBe(10);
  });
});

describe('handTotal', () => {
  it('sums card values', () => {
    const hand: Card[] = [
      { rank: '10', suit: '\u2660' },
      { rank: '7', suit: '\u2665' },
    ];
    expect(handTotal(hand)).toBe(17);
  });

  it('counts ace as 1 when total would bust', () => {
    const hand: Card[] = [
      { rank: 'A', suit: '\u2660' },
      { rank: '10', suit: '\u2665' },
      { rank: '5', suit: '\u2666' },
    ];
    expect(handTotal(hand)).toBe(16);
  });

  it('counts ace as 11 when safe', () => {
    const hand: Card[] = [
      { rank: 'A', suit: '\u2660' },
      { rank: '7', suit: '\u2665' },
    ];
    expect(handTotal(hand)).toBe(18);
  });

  it('handles multiple aces', () => {
    const hand: Card[] = [
      { rank: 'A', suit: '\u2660' },
      { rank: 'A', suit: '\u2665' },
      { rank: '9', suit: '\u2666' },
    ];
    expect(handTotal(hand)).toBe(21);
  });
});

describe('isSoft', () => {
  it('returns true for soft hand', () => {
    const hand: Card[] = [
      { rank: 'A', suit: '\u2660' },
      { rank: '7', suit: '\u2665' },
    ];
    expect(isSoft(hand)).toBe(true);
  });

  it('returns false for hard hand', () => {
    const hand: Card[] = [
      { rank: '10', suit: '\u2660' },
      { rank: '7', suit: '\u2665' },
    ];
    expect(isSoft(hand)).toBe(false);
  });

  it('returns false when ace must count as 1', () => {
    const hand: Card[] = [
      { rank: 'A', suit: '\u2660' },
      { rank: '10', suit: '\u2665' },
      { rank: '5', suit: '\u2666' },
    ];
    expect(isSoft(hand)).toBe(false);
  });
});

describe('isBlackjack', () => {
  it('returns true for ace + 10', () => {
    const hand: Card[] = [
      { rank: 'A', suit: '\u2660' },
      { rank: '10', suit: '\u2665' },
    ];
    expect(isBlackjack(hand)).toBe(true);
  });

  it('returns true for ace + face card', () => {
    const hand: Card[] = [
      { rank: 'A', suit: '\u2660' },
      { rank: 'K', suit: '\u2665' },
    ];
    expect(isBlackjack(hand)).toBe(true);
  });

  it('returns false for 3-card 21', () => {
    const hand: Card[] = [
      { rank: '7', suit: '\u2660' },
      { rank: '7', suit: '\u2665' },
      { rank: '7', suit: '\u2666' },
    ];
    expect(isBlackjack(hand)).toBe(false);
  });
});

describe('canSplit', () => {
  it('returns true for matching values', () => {
    const hand: Card[] = [
      { rank: '8', suit: '\u2660' },
      { rank: '8', suit: '\u2665' },
    ];
    expect(canSplit(hand)).toBe(true);
  });

  it('returns true for face cards (same value)', () => {
    const hand: Card[] = [
      { rank: 'J', suit: '\u2660' },
      { rank: 'Q', suit: '\u2665' },
    ];
    expect(canSplit(hand)).toBe(true);
  });

  it('returns false for different values', () => {
    const hand: Card[] = [
      { rank: '8', suit: '\u2660' },
      { rank: '9', suit: '\u2665' },
    ];
    expect(canSplit(hand)).toBe(false);
  });
});

describe('hiLoValue', () => {
  it('returns -1 for high cards', () => {
    expect(hiLoValue({ rank: 'A', suit: '\u2660' })).toBe(-1);
    expect(hiLoValue({ rank: 'K', suit: '\u2660' })).toBe(-1);
    expect(hiLoValue({ rank: '10', suit: '\u2660' })).toBe(-1);
  });

  it('returns +1 for low cards', () => {
    expect(hiLoValue({ rank: '2', suit: '\u2660' })).toBe(1);
    expect(hiLoValue({ rank: '6', suit: '\u2660' })).toBe(1);
  });

  it('returns 0 for neutral cards', () => {
    expect(hiLoValue({ rank: '7', suit: '\u2660' })).toBe(0);
    expect(hiLoValue({ rank: '8', suit: '\u2660' })).toBe(0);
    expect(hiLoValue({ rank: '9', suit: '\u2660' })).toBe(0);
  });
});

describe('pokerRankValue', () => {
  it('returns 14 for ace', () => {
    expect(pokerRankValue('A')).toBe(14);
  });

  it('returns 13 for king', () => {
    expect(pokerRankValue('K')).toBe(13);
  });

  it('returns numeric value for number cards', () => {
    expect(pokerRankValue('2')).toBe(2);
    expect(pokerRankValue('10')).toBe(10);
  });
});

describe('evaluatePokerHand', () => {
  it('detects a pair', () => {
    const hand: Card[] = [
      { rank: 'A', suit: '\u2660' },
      { rank: 'A', suit: '\u2665' },
      { rank: 'K', suit: '\u2666' },
      { rank: '7', suit: '\u2663' },
      { rank: '3', suit: '\u2660' },
    ];
    expect(evaluatePokerHand(hand).rank).toBe(1);
  });

  it('detects two pair', () => {
    const hand: Card[] = [
      { rank: 'A', suit: '\u2660' },
      { rank: 'A', suit: '\u2665' },
      { rank: 'K', suit: '\u2666' },
      { rank: 'K', suit: '\u2663' },
      { rank: '3', suit: '\u2660' },
    ];
    expect(evaluatePokerHand(hand).rank).toBe(2);
  });

  it('detects three of a kind', () => {
    const hand: Card[] = [
      { rank: '7', suit: '\u2660' },
      { rank: '7', suit: '\u2665' },
      { rank: '7', suit: '\u2666' },
      { rank: 'K', suit: '\u2663' },
      { rank: '3', suit: '\u2660' },
    ];
    expect(evaluatePokerHand(hand).rank).toBe(3);
  });

  it('detects a flush', () => {
    const hand: Card[] = [
      { rank: 'A', suit: '\u2660' },
      { rank: '10', suit: '\u2660' },
      { rank: '7', suit: '\u2660' },
      { rank: '4', suit: '\u2660' },
      { rank: '2', suit: '\u2660' },
    ];
    expect(evaluatePokerHand(hand).rank).toBe(5);
  });

  it('detects a full house', () => {
    const hand: Card[] = [
      { rank: 'A', suit: '\u2660' },
      { rank: 'A', suit: '\u2665' },
      { rank: 'A', suit: '\u2666' },
      { rank: 'K', suit: '\u2663' },
      { rank: 'K', suit: '\u2660' },
    ];
    expect(evaluatePokerHand(hand).rank).toBe(6);
  });

  it('detects four of a kind', () => {
    const hand: Card[] = [
      { rank: '9', suit: '\u2660' },
      { rank: '9', suit: '\u2665' },
      { rank: '9', suit: '\u2666' },
      { rank: '9', suit: '\u2663' },
      { rank: 'K', suit: '\u2660' },
    ];
    expect(evaluatePokerHand(hand).rank).toBe(7);
  });
});

describe('comparePokerHands', () => {
  it('higher rank wins', () => {
    const pair = evaluatePokerHand([
      { rank: 'A', suit: '\u2660' }, { rank: 'A', suit: '\u2665' },
      { rank: 'K', suit: '\u2666' }, { rank: '7', suit: '\u2663' }, { rank: '3', suit: '\u2660' },
    ]);
    const trips = evaluatePokerHand([
      { rank: '7', suit: '\u2660' }, { rank: '7', suit: '\u2665' },
      { rank: '7', suit: '\u2666' }, { rank: 'K', suit: '\u2663' }, { rank: '3', suit: '\u2660' },
    ]);
    expect(comparePokerHands(trips, pair)).toBeGreaterThan(0);
  });
});
