export interface Card {
  rank: string;
  suit: string;
}

export const SUITS = ['\u2660', '\u2665', '\u2666', '\u2663'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export const RED_SUITS = new Set(['\u2665', '\u2666']);

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS)
    for (const rank of RANKS)
      cards.push({ rank, suit });
  return cards;
}

export function createShoe(numDecks: number): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < numDecks; d++)
    for (const suit of SUITS)
      for (const rank of RANKS)
        cards.push({ rank, suit });
  shuffleCards(cards);
  return cards;
}

export function shuffleCards(arr: Card[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
}

export function cardValue(card: Card): number {
  if (card.rank === 'A') return 11;
  if ('JQK'.includes(card.rank)) return 10;
  return parseInt(card.rank);
}

export function handTotal(cards: Card[]): number {
  let total = 0, aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

export function isSoft(cards: Card[]): boolean {
  let total = 0, aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return aces > 0 && total <= 21;
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handTotal(cards) === 21;
}

export function canSplit(cards: Card[]): boolean {
  return cards.length === 2 && cardValue(cards[0]) === cardValue(cards[1]);
}

export function hiLoValue(card: Card): number {
  const v = cardValue(card);
  if (card.rank === 'A' || v === 10) return -1;
  if (v >= 2 && v <= 6) return 1;
  return 0;
}

export function renderCard(card: Card, faceDown: boolean): HTMLDivElement {
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

export function renderHand(containerId: string, cards: Card[], hideFirst: boolean): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  cards.forEach((c, i) => container.appendChild(renderCard(c, hideFirst && i === 0)));
}

// Poker hand evaluation
export type HandRank = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export const HAND_NAMES = [
  'high card', 'one pair', 'two pair', 'three of a kind',
  'straight', 'flush', 'full house', 'four of a kind',
  'straight flush', 'royal flush'
] as const;

export function pokerRankValue(rank: string): number {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank);
}

export function evaluatePokerHand(cards: Card[]): { rank: HandRank; kickers: number[] } {
  const vals = cards.map(c => pokerRankValue(c.rank)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check straight
  let isStraight = false;
  const unique = [...new Set(vals)].sort((a, b) => b - a);
  if (unique.length >= 5) {
    for (let i = 0; i <= unique.length - 5; i++) {
      if (unique[i] - unique[i + 4] === 4) {
        isStraight = true;
        break;
      }
    }
    // Ace-low straight (A-2-3-4-5)
    if (!isStraight && unique.includes(14) && unique.includes(2) && unique.includes(3) && unique.includes(4) && unique.includes(5)) {
      isStraight = true;
    }
  }

  // Count ranks
  const counts: Record<number, number> = {};
  for (const v of vals) counts[v] = (counts[v] || 0) + 1;
  const groups = Object.entries(counts)
    .map(([v, c]) => ({ val: parseInt(v), count: c }))
    .sort((a, b) => b.count - a.count || b.val - a.val);

  if (isFlush && isStraight) {
    if (vals.includes(14) && vals.includes(13)) return { rank: 9, kickers: vals };
    return { rank: 8, kickers: vals };
  }
  if (groups[0].count === 4) return { rank: 7, kickers: [groups[0].val, groups[1].val] };
  if (groups[0].count === 3 && groups[1].count >= 2) return { rank: 6, kickers: [groups[0].val, groups[1].val] };
  if (isFlush) return { rank: 5, kickers: vals };
  if (isStraight) return { rank: 4, kickers: vals };
  if (groups[0].count === 3) return { rank: 3, kickers: [groups[0].val, ...groups.slice(1).map(g => g.val)] };
  if (groups[0].count === 2 && groups[1].count === 2) return { rank: 2, kickers: [Math.max(groups[0].val, groups[1].val), Math.min(groups[0].val, groups[1].val), groups[2].val] };
  if (groups[0].count === 2) return { rank: 1, kickers: [groups[0].val, ...groups.slice(1).map(g => g.val)] };
  return { rank: 0, kickers: vals };
}

export function comparePokerHands(a: { rank: HandRank; kickers: number[] }, b: { rank: HandRank; kickers: number[] }): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.min(a.kickers.length, b.kickers.length); i++) {
    if (a.kickers[i] !== b.kickers[i]) return a.kickers[i] - b.kickers[i];
  }
  return 0;
}
