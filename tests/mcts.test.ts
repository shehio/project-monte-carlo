import { search, MCTSState } from '@lib/mcts';

// Simple game: pick a number 0-4, goal is to pick highest
class SimpleGame implements MCTSState {
  picked: number | null;
  player: number;

  constructor(picked: number | null = null, player = 1) {
    this.picked = picked;
    this.player = player;
  }

  getLegalMoves(): number[] {
    if (this.picked !== null) return [];
    return [0, 1, 2, 3, 4];
  }

  applyMove(move: number): void {
    this.picked = move;
  }

  isTerminal(): boolean {
    return this.picked !== null;
  }

  getResult(player: number): number {
    return this.picked !== null ? this.picked / 4 : 0;
  }

  getCurrentPlayer(): number {
    return this.player;
  }

  clone(): MCTSState {
    return new SimpleGame(this.picked, this.player);
  }
}

// Tic-tac-toe for more thorough testing
class TicTacToe implements MCTSState {
  board: number[];
  current: number;

  constructor(board?: number[], current?: number) {
    this.board = board ? [...board] : new Array(9).fill(0);
    this.current = current ?? 1;
  }

  getLegalMoves(): number[] {
    if (this.getWinner() !== 0) return [];
    const moves: number[] = [];
    for (let i = 0; i < 9; i++) {
      if (this.board[i] === 0) moves.push(i);
    }
    return moves;
  }

  applyMove(move: number): void {
    this.board[move] = this.current;
    this.current = this.current === 1 ? 2 : 1;
  }

  getWinner(): number {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6],
    ];
    for (const [a,b,c] of lines) {
      if (this.board[a] !== 0 && this.board[a] === this.board[b] && this.board[b] === this.board[c]) {
        return this.board[a];
      }
    }
    return 0;
  }

  isTerminal(): boolean {
    if (this.getWinner() !== 0) return true;
    return this.board.every(c => c !== 0);
  }

  getResult(player: number): number {
    const winner = this.getWinner();
    if (winner === 0) return 0.5;
    return winner === player ? 1 : 0;
  }

  getCurrentPlayer(): number {
    return this.current;
  }

  clone(): MCTSState {
    return new TicTacToe([...this.board], this.current);
  }
}

describe('MCTS search', () => {
  it('returns a valid move', () => {
    const game = new SimpleGame();
    const result = search(game, { iterations: 100 });
    expect(result.bestMove).not.toBeNull();
    expect([0, 1, 2, 3, 4]).toContain(result.bestMove);
  });

  it('prefers higher-value moves with enough iterations', () => {
    const game = new SimpleGame();
    const result = search(game, { iterations: 1000 });
    // With enough iterations, should prefer 4 (highest reward)
    expect(result.bestMove).toBe(4);
  });

  it('returns stats with top moves', () => {
    const game = new SimpleGame();
    const result = search(game, { iterations: 500 });
    expect(result.stats.topMoves.length).toBeGreaterThan(0);
    expect(result.stats.iterations).toBe(500);
  });

  it('blocks winning move in tic-tac-toe', () => {
    // X has two in a row, O should block
    const board = [
      1, 1, 0,
      0, 0, 0,
      0, 0, 0,
    ];
    const game = new TicTacToe(board, 2); // O's turn
    const result = search(game, { iterations: 1000 });
    // O should play position 2 to block
    expect(result.bestMove).toBe(2);
  });

  it('takes winning move in tic-tac-toe', () => {
    // X has two in a row, X should win
    const board = [
      1, 1, 0,
      2, 2, 0,
      0, 0, 0,
    ];
    const game = new TicTacToe(board, 1); // X's turn
    const result = search(game, { iterations: 1000 });
    expect(result.bestMove).toBe(2);
  });

  it('returns tree structure', () => {
    const game = new SimpleGame();
    const result = search(game, { iterations: 200 });
    expect(result.stats.tree).toBeDefined();
    expect(result.stats.tree.visits).toBe(200);
    expect(result.stats.tree.children.length).toBeGreaterThan(0);
  });
});
