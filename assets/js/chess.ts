// Chess with MCTS AI (hybrid: short rollout + piece-square evaluation)
import { search, MCTSState } from './lib/mcts';
import { shortNum } from './lib/math';

// Piece values: +/-1 pawn, +/-2 knight, +/-3 bishop, +/-4 rook, +/-5 queen, +/-6 king
const EMPTY = 0, PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
const WHITE = 1, BLACK_P = -1; // player signs: white positive, black negative

// Piece-square tables (from white's perspective, index 0 = a8)
const PST: Record<number, number[]> = {};
PST[PAWN] = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];
PST[KNIGHT] = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];
PST[BISHOP] = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];
PST[ROOK] = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0
];
PST[QUEEN] = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];
PST[KING] = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

const PIECE_VALUES: number[] = [0, 100, 320, 330, 500, 900, 20000];

// ── Chess Move type ──

interface ChessMove {
  from: number;
  to: number;
  promo?: number;
  castle?: string;
}

// ── Chess State ──

class ChessState implements MCTSState {
  board: Int8Array;
  current: number;
  castling: boolean[];
  epSquare: number;
  halfmoveClock: number;
  fullmoveNumber: number;
  positionHistory: Record<string, number>;
  _legalMovesCache: ChessMove[] | null;
  _gameOverResult: string | null;

  constructor() {
    this.board = new Int8Array(64);
    const backRank: number[] = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];
    for (let i = 0; i < 8; i++) {
      this.board[i] = -backRank[i];
      this.board[8 + i] = -PAWN;
      this.board[48 + i] = PAWN;
      this.board[56 + i] = backRank[i];
    }
    this.current = WHITE;
    this.castling = [true, true, true, true];
    this.epSquare = -1;
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.positionHistory = {};
    this._legalMovesCache = null;
    this._gameOverResult = null;
  }

  clone(): ChessState {
    const s = new ChessState();
    s.board = new Int8Array(this.board);
    s.current = this.current;
    s.castling = this.castling.slice();
    s.epSquare = this.epSquare;
    s.halfmoveClock = this.halfmoveClock;
    s.fullmoveNumber = this.fullmoveNumber;
    s.positionHistory = {};
    for (const k in this.positionHistory) s.positionHistory[k] = this.positionHistory[k];
    s._legalMovesCache = null;
    s._gameOverResult = null;
    return s;
  }

  rc(sq: number): [number, number] { return [sq >> 3, sq & 7]; }
  sq(r: number, c: number): number { return (r << 3) | c; }
  onBoard(r: number, c: number): boolean { return r >= 0 && r < 8 && c >= 0 && c < 8; }
  sign(piece: number): number { return piece > 0 ? WHITE : BLACK_P; }

  pseudoLegalMoves(): ChessMove[] {
    const moves: ChessMove[] = [];
    const side: number = this.current;

    for (let sq = 0; sq < 64; sq++) {
      const piece: number = this.board[sq];
      if (piece === EMPTY || this.sign(piece) !== side) continue;
      const type: number = Math.abs(piece);
      const rc: [number, number] = this.rc(sq);
      const r: number = rc[0], c: number = rc[1];

      if (type === PAWN) {
        const dir: number = side === WHITE ? -1 : 1;
        const startRow: number = side === WHITE ? 6 : 1;
        const promoRow: number = side === WHITE ? 0 : 7;
        const fr: number = r + dir;
        if (this.onBoard(fr, c) && this.board[this.sq(fr, c)] === EMPTY) {
          if (fr === promoRow) {
            moves.push({from: sq, to: this.sq(fr, c), promo: QUEEN * side});
            moves.push({from: sq, to: this.sq(fr, c), promo: ROOK * side});
            moves.push({from: sq, to: this.sq(fr, c), promo: BISHOP * side});
            moves.push({from: sq, to: this.sq(fr, c), promo: KNIGHT * side});
          } else {
            moves.push({from: sq, to: this.sq(fr, c)});
          }
          if (r === startRow && this.board[this.sq(r + 2 * dir, c)] === EMPTY) {
            moves.push({from: sq, to: this.sq(r + 2 * dir, c)});
          }
        }
        for (let dc = -1; dc <= 1; dc += 2) {
          const cc: number = c + dc;
          if (!this.onBoard(fr, cc)) continue;
          const target: number = this.sq(fr, cc);
          if ((this.board[target] !== EMPTY && this.sign(this.board[target]) !== side) || target === this.epSquare) {
            if (fr === promoRow) {
              moves.push({from: sq, to: target, promo: QUEEN * side});
              moves.push({from: sq, to: target, promo: ROOK * side});
              moves.push({from: sq, to: target, promo: BISHOP * side});
              moves.push({from: sq, to: target, promo: KNIGHT * side});
            } else {
              moves.push({from: sq, to: target});
            }
          }
        }
      } else if (type === KNIGHT) {
        const knightMoves: number[][] = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (let ki = 0; ki < knightMoves.length; ki++) {
          const nr: number = r + knightMoves[ki][0], nc: number = c + knightMoves[ki][1];
          if (this.onBoard(nr, nc)) {
            const nt: number = this.board[this.sq(nr, nc)];
            if (nt === EMPTY || this.sign(nt) !== side) {
              moves.push({from: sq, to: this.sq(nr, nc)});
            }
          }
        }
      } else if (type === BISHOP || type === ROOK || type === QUEEN) {
        let dirs: number[][] = [];
        if (type === BISHOP || type === QUEEN) dirs = dirs.concat([[-1,-1],[-1,1],[1,-1],[1,1]]);
        if (type === ROOK || type === QUEEN) dirs = dirs.concat([[-1,0],[1,0],[0,-1],[0,1]]);
        for (let di = 0; di < dirs.length; di++) {
          const dr: number = dirs[di][0], dcc: number = dirs[di][1];
          let cr: number = r + dr, ccc: number = c + dcc;
          while (this.onBoard(cr, ccc)) {
            const t: number = this.board[this.sq(cr, ccc)];
            if (t === EMPTY) {
              moves.push({from: sq, to: this.sq(cr, ccc)});
            } else {
              if (this.sign(t) !== side) moves.push({from: sq, to: this.sq(cr, ccc)});
              break;
            }
            cr += dr;
            ccc += dcc;
          }
        }
      } else if (type === KING) {
        for (let kdr = -1; kdr <= 1; kdr++) {
          for (let kdc = -1; kdc <= 1; kdc++) {
            if (kdr === 0 && kdc === 0) continue;
            const kr: number = r + kdr, kc: number = c + kdc;
            if (this.onBoard(kr, kc)) {
              const kt: number = this.board[this.sq(kr, kc)];
              if (kt === EMPTY || this.sign(kt) !== side) {
                moves.push({from: sq, to: this.sq(kr, kc)});
              }
            }
          }
        }
        if (side === WHITE && sq === 60) {
          if (this.castling[0] && this.board[61] === EMPTY && this.board[62] === EMPTY &&
              this.board[63] === ROOK && !this.isAttacked(60, BLACK_P) && !this.isAttacked(61, BLACK_P) && !this.isAttacked(62, BLACK_P)) {
            moves.push({from: 60, to: 62, castle: 'K'});
          }
          if (this.castling[1] && this.board[59] === EMPTY && this.board[58] === EMPTY && this.board[57] === EMPTY &&
              this.board[56] === ROOK && !this.isAttacked(60, BLACK_P) && !this.isAttacked(59, BLACK_P) && !this.isAttacked(58, BLACK_P)) {
            moves.push({from: 60, to: 58, castle: 'Q'});
          }
        } else if (side === BLACK_P && sq === 4) {
          if (this.castling[2] && this.board[5] === EMPTY && this.board[6] === EMPTY &&
              this.board[7] === -ROOK && !this.isAttacked(4, WHITE) && !this.isAttacked(5, WHITE) && !this.isAttacked(6, WHITE)) {
            moves.push({from: 4, to: 6, castle: 'k'});
          }
          if (this.castling[3] && this.board[3] === EMPTY && this.board[2] === EMPTY && this.board[1] === EMPTY &&
              this.board[0] === -ROOK && !this.isAttacked(4, WHITE) && !this.isAttacked(3, WHITE) && !this.isAttacked(2, WHITE)) {
            moves.push({from: 4, to: 2, castle: 'q'});
          }
        }
      }
    }
    return moves;
  }

  isAttacked(sq: number, byColor: number): boolean {
    const rc: [number, number] = this.rc(sq);
    const r: number = rc[0], c: number = rc[1];

    const pawnDir: number = byColor === WHITE ? 1 : -1;
    for (let pdc = -1; pdc <= 1; pdc += 2) {
      const pr: number = r + pawnDir, pc: number = c + pdc;
      if (this.onBoard(pr, pc) && this.board[this.sq(pr, pc)] === PAWN * byColor) return true;
    }

    const knightDeltas: number[][] = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (let ki = 0; ki < knightDeltas.length; ki++) {
      const kr: number = r + knightDeltas[ki][0], kc: number = c + knightDeltas[ki][1];
      if (this.onBoard(kr, kc) && this.board[this.sq(kr, kc)] === KNIGHT * byColor) return true;
    }

    const diagDirs: number[][] = [[-1,-1],[-1,1],[1,-1],[1,1]];
    for (let di = 0; di < diagDirs.length; di++) {
      let dr: number = r + diagDirs[di][0], drc: number = c + diagDirs[di][1];
      while (this.onBoard(dr, drc)) {
        const p: number = this.board[this.sq(dr, drc)];
        if (p !== EMPTY) {
          if (this.sign(p) === byColor && (Math.abs(p) === BISHOP || Math.abs(p) === QUEEN)) return true;
          break;
        }
        dr += diagDirs[di][0];
        drc += diagDirs[di][1];
      }
    }
    const straightDirs: number[][] = [[-1,0],[1,0],[0,-1],[0,1]];
    for (let si = 0; si < straightDirs.length; si++) {
      let sr: number = r + straightDirs[si][0], sc: number = c + straightDirs[si][1];
      while (this.onBoard(sr, sc)) {
        const sp: number = this.board[this.sq(sr, sc)];
        if (sp !== EMPTY) {
          if (this.sign(sp) === byColor && (Math.abs(sp) === ROOK || Math.abs(sp) === QUEEN)) return true;
          break;
        }
        sr += straightDirs[si][0];
        sc += straightDirs[si][1];
      }
    }

    for (let kdr = -1; kdr <= 1; kdr++) {
      for (let kdc = -1; kdc <= 1; kdc++) {
        if (kdr === 0 && kdc === 0) continue;
        const kkr: number = r + kdr, kkc: number = c + kdc;
        if (this.onBoard(kkr, kkc) && this.board[this.sq(kkr, kkc)] === KING * byColor) return true;
      }
    }
    return false;
  }

  findKing(side: number): number {
    const king: number = KING * side;
    for (let i = 0; i < 64; i++) {
      if (this.board[i] === king) return i;
    }
    return -1;
  }

  inCheck(side: number): boolean {
    const kingPos: number = this.findKing(side);
    if (kingPos === -1) return true;
    return this.isAttacked(kingPos, side === WHITE ? BLACK_P : WHITE);
  }

  applyMove(move: ChessMove | number): void {
    const m: ChessMove = move as ChessMove;
    this._legalMovesCache = null;
    this._gameOverResult = null;

    const piece: number = this.board[m.from];
    const captured: number = this.board[m.to];
    const type: number = Math.abs(piece);

    if (type === PAWN && m.to === this.epSquare) {
      const epCaptureSq: number = this.current === WHITE ? m.to + 8 : m.to - 8;
      this.board[epCaptureSq] = EMPTY;
    }

    this.board[m.to] = m.promo || piece;
    this.board[m.from] = EMPTY;

    if (m.castle) {
      if (m.castle === 'K') { this.board[61] = ROOK; this.board[63] = EMPTY; }
      if (m.castle === 'Q') { this.board[59] = ROOK; this.board[56] = EMPTY; }
      if (m.castle === 'k') { this.board[5] = -ROOK; this.board[7] = EMPTY; }
      if (m.castle === 'q') { this.board[3] = -ROOK; this.board[0] = EMPTY; }
    }

    if (type === PAWN && Math.abs(m.to - m.from) === 16) {
      this.epSquare = (m.from + m.to) / 2;
    } else {
      this.epSquare = -1;
    }

    if (type === KING) {
      if (this.current === WHITE) { this.castling[0] = false; this.castling[1] = false; }
      else { this.castling[2] = false; this.castling[3] = false; }
    }
    if (m.from === 63 || m.to === 63) this.castling[0] = false;
    if (m.from === 56 || m.to === 56) this.castling[1] = false;
    if (m.from === 7 || m.to === 7) this.castling[2] = false;
    if (m.from === 0 || m.to === 0) this.castling[3] = false;

    if (type === PAWN || captured !== EMPTY) {
      this.halfmoveClock = 0;
    } else {
      this.halfmoveClock++;
    }

    if (this.current === BLACK_P) this.fullmoveNumber++;
    this.current = -this.current;

    const key: string = this.positionKey();
    this.positionHistory[key] = (this.positionHistory[key] || 0) + 1;
  }

  positionKey(): string {
    let key = '';
    for (let i = 0; i < 64; i++) key += String.fromCharCode(this.board[i] + 7);
    key += this.current + ',' + this.castling.join('') + ',' + this.epSquare;
    return key;
  }

  getLegalMoves(): ChessMove[] {
    if (this._legalMovesCache !== null) return this._legalMovesCache;
    const pseudo: ChessMove[] = this.pseudoLegalMoves();
    const legal: ChessMove[] = [];
    const side: number = this.current;
    for (let i = 0; i < pseudo.length; i++) {
      const s: ChessState = this.clone();
      s.current = side;
      s.applyMove(pseudo[i]);
      if (!s.inCheck(side)) {
        legal.push(pseudo[i]);
      }
    }
    this._legalMovesCache = legal;
    return legal;
  }

  isTerminal(): boolean {
    if (this._gameOverResult !== null) return this._gameOverResult !== 'playing';
    const result: string = this.getGameOverResult();
    return result !== 'playing';
  }

  getGameOverResult(): string {
    if (this._gameOverResult !== null) return this._gameOverResult;

    if (this.halfmoveClock >= 100) {
      this._gameOverResult = 'd';
      return 'd';
    }

    const key: string = this.positionKey();
    if (this.positionHistory[key] >= 3) {
      this._gameOverResult = 'd';
      return 'd';
    }

    const moves: ChessMove[] = this.getLegalMoves();
    if (moves.length === 0) {
      if (this.inCheck(this.current)) {
        this._gameOverResult = this.current === WHITE ? 'b' : 'w';
      } else {
        this._gameOverResult = 'd';
      }
      return this._gameOverResult;
    }

    if (this.insufficientMaterial()) {
      this._gameOverResult = 'd';
      return 'd';
    }

    this._gameOverResult = 'playing';
    return 'playing';
  }

  insufficientMaterial(): boolean {
    const whitePieces: number[] = [], blackPieces: number[] = [];
    for (let i = 0; i < 64; i++) {
      if (this.board[i] > 0) whitePieces.push(this.board[i]);
      else if (this.board[i] < 0) blackPieces.push(-this.board[i]);
    }
    if (whitePieces.length === 1 && blackPieces.length === 1) return true;
    if (whitePieces.length === 1 && blackPieces.length === 2) {
      if (blackPieces.indexOf(KNIGHT) >= 0 || blackPieces.indexOf(BISHOP) >= 0) return true;
    }
    if (blackPieces.length === 1 && whitePieces.length === 2) {
      if (whitePieces.indexOf(KNIGHT) >= 0 || whitePieces.indexOf(BISHOP) >= 0) return true;
    }
    return false;
  }

  getResult(player: number): number {
    const result: string = this.getGameOverResult();
    if (result === 'd') return 0.5;
    if (result === 'w') return player === WHITE ? 1 : 0;
    if (result === 'b') return player === BLACK_P ? 1 : 0;
    return 0.5;
  }

  getCurrentPlayer(): number { return this.current; }

  evaluate(player: number): number {
    let score = 0;
    for (let i = 0; i < 64; i++) {
      const p: number = this.board[i];
      if (p === EMPTY) continue;
      const type: number = Math.abs(p);
      const side: number = this.sign(p);
      let val: number = PIECE_VALUES[type];
      const pstIdx: number = side === WHITE ? i : (7 - (i >> 3)) * 8 + (i & 7);
      val += PST[type][pstIdx];
      score += val * side;
    }
    let normalized: number = (score + 3000) / 6000;
    if (normalized < 0) normalized = 0;
    if (normalized > 1) normalized = 1;
    return player === WHITE ? normalized : 1 - normalized;
  }
}

// Capture-biased rollout for chess
function chessRollout(state: MCTSState, maxDepth: number): MCTSState {
  const s: ChessState = state.clone() as ChessState;
  let depth = 0;
  while (!s.isTerminal() && depth < maxDepth) {
    const moves: ChessMove[] = s.getLegalMoves() as ChessMove[];
    if (moves.length === 0) break;
    const captures: ChessMove[] = [];
    for (let i = 0; i < moves.length; i++) {
      if (s.board[moves[i].to] !== EMPTY || moves[i].promo) {
        captures.push(moves[i]);
      }
    }
    let chosen: ChessMove;
    if (captures.length > 0 && Math.random() < 0.7) {
      chosen = captures[Math.floor(Math.random() * captures.length)];
    } else {
      chosen = moves[Math.floor(Math.random() * moves.length)];
    }
    s.applyMove(chosen);
    depth++;
  }
  return s;
}

// ── SAN (Standard Algebraic Notation) ──

const FILES = 'abcdefgh';
const PIECE_LETTERS: Record<number, string> = {1: '', 2: 'N', 3: 'B', 4: 'R', 5: 'Q', 6: 'K'};

// Generate SAN for a move BEFORE it is applied to the state
function toSAN(state: ChessState, move: ChessMove): string {
  if (move.castle === 'K' || move.castle === 'k') return 'O-O';
  if (move.castle === 'Q' || move.castle === 'q') return 'O-O-O';

  const piece: number = state.board[move.from];
  const type: number = Math.abs(piece);
  const side: number = state.current;
  const isCapture: boolean = state.board[move.to] !== EMPTY ||
                  (type === PAWN && move.to === state.epSquare);

  let san = '';

  if (type === PAWN) {
    if (isCapture) san += FILES[move.from & 7];
  } else {
    san += PIECE_LETTERS[type];
    // Disambiguation: check if another piece of same type can reach same square
    const legal: ChessMove[] = state.getLegalMoves();
    const ambiguous: ChessMove[] = [];
    for (let i = 0; i < legal.length; i++) {
      const m: ChessMove = legal[i];
      if (m.to === move.to && m.from !== move.from &&
          Math.abs(state.board[m.from]) === type && !m.castle) {
        ambiguous.push(m);
      }
    }
    if (ambiguous.length > 0) {
      let sameFile = false, sameRank = false;
      for (let j = 0; j < ambiguous.length; j++) {
        if ((ambiguous[j].from & 7) === (move.from & 7)) sameFile = true;
        if ((ambiguous[j].from >> 3) === (move.from >> 3)) sameRank = true;
      }
      if (!sameFile) {
        san += FILES[move.from & 7];
      } else if (!sameRank) {
        san += String(8 - (move.from >> 3));
      } else {
        san += FILES[move.from & 7] + String(8 - (move.from >> 3));
      }
    }
  }

  if (isCapture) san += 'x';
  san += FILES[move.to & 7] + String(8 - (move.to >> 3));

  if (move.promo) {
    san += '=' + PIECE_LETTERS[Math.abs(move.promo)];
  }

  // Check / checkmate annotation
  const test: ChessState = state.clone();
  test.current = side;
  test.applyMove(move);
  if (test.inCheck(test.current)) {
    const testMoves: ChessMove[] = test.getLegalMoves();
    san += testMoves.length === 0 ? '#' : '+';
  }

  return san;
}

// ── UI ──

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let SQUARE_SIZE: number;
let gameState: ChessState;
let gameOver = false;
let aiThinking = false;
let selectedSquare = -1;
let legalMovesForSelected: ChessMove[] = [];
const playerColor: number = WHITE;
let lastMoveFrom = -1, lastMoveTo = -1;
let statsEl: HTMLElement;
let messageEl: HTMLElement;
let newGameBtn: HTMLElement;
let undoBtn: HTMLElement | null;
let iterationsInput: HTMLInputElement | null;
let depthInput: HTMLInputElement | null;
let promotionOverlay: HTMLElement | null;
let promotionCallback: ((type: number) => void) | null = null;
let historyEl: HTMLElement | null;
const flipped = false;
let moveHistory: { num: number; white: string; black: string }[] = [];
let moveStack: ChessState[] = [];

// ── Piece images (SVG-based) ──
const pieceImages: Record<string, HTMLImageElement> = {};
let piecesLoaded = false;

function buildPieceImages(): void {
  const WF = '#f0e8dc', WS = '#1a1a1a';
  const BF = '#1a1a1a', BS = '#b0b0b0';

  function svgWrap(body: string, fill: string, stroke: string): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">' +
      '<g fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + body + '</g></svg>';
  }

  const P: Record<number, string> = {};
  P[PAWN] =
    '<circle cx="22.5" cy="12" r="6"/>' +
    '<path d="M 14 34 C 15 28 18.5 23.5 22.5 21 C 26.5 23.5 30 28 31 34 Z"/>' +
    '<path d="M 10 39 L 35 39 L 33 35 L 12 35 Z"/>';

  P[ROOK] =
    '<path d="M 9 39 L 36 39 L 36 36 L 9 36 Z"/>' +
    '<path d="M 12 36 L 12 32 L 33 32 L 33 36 Z"/>' +
    '<path d="M 14 32 L 14 16 L 31 16 L 31 32 Z"/>' +
    '<path d="M 11 14 L 11 9 L 15 9 L 15 11 L 20 11 L 20 9 L 25 9 L 25 11 L 30 11 L 30 9 L 34 9 L 34 14 Z"/>';

  P[KNIGHT] =
    '<path d="M 22 10 C 32.5 11 38.5 18 38 39 L 15 39 C 15 30 25 32.5 23 18 ' +
    'L 24 18 C 24.4 20.9 18.5 25.4 16 27 C 13 29 13.2 31.3 11 31 ' +
    'C 10 30 12.4 28 11 28 C 10 28 11.2 29.2 10 30 C 9 30 6 31 6 26 ' +
    'C 6 24 12 14 12 14 C 12 14 13.9 12.1 14 10.5 C 13.3 9.5 13.5 8.5 13.5 7.5 ' +
    'C 14.5 6.5 16.5 10 16.5 10 L 18.5 10 C 18.5 10 19.3 8 21 7 C 22 7 22 10 22 10 Z"/>';

  P[BISHOP] =
    '<path d="M 9 36 C 12.4 35 19.1 36.4 22.5 34 C 25.9 36.4 32.6 35 36 36 ' +
    'C 36 36 37.7 36.5 39 38 C 38.3 39 37.4 39 36 38.5 ' +
    'C 32.6 37.5 25.9 39 22.5 37.5 C 19.1 39 12.4 37.5 9 38.5 ' +
    'C 7.6 39 6.7 39 6 38 C 7.4 36.1 9 36 9 36 Z"/>' +
    '<path d="M 15 32 C 17.5 34.5 27.5 34.5 30 32 C 30.5 30.5 30 30 30 30 ' +
    'C 30 27.5 27.5 26 27.5 26 C 33 24.5 33.5 14.5 22.5 10.5 ' +
    'C 11.5 14.5 12 24.5 17.5 26 C 17.5 26 15 27.5 15 30 C 15 30 14.5 30.5 15 32 Z"/>' +
    '<circle cx="22.5" cy="8" r="2.5"/>';

  P[QUEEN] =
    '<circle cx="6" cy="12" r="2.5"/>' +
    '<circle cx="14" cy="9" r="2.5"/>' +
    '<circle cx="22.5" cy="8" r="2.5"/>' +
    '<circle cx="31" cy="9" r="2.5"/>' +
    '<circle cx="39" cy="12" r="2.5"/>' +
    '<path d="M 9 26 C 17.5 24.5 30 24.5 36 26 L 38.5 13.5 L 31 25 ' +
    'L 30.7 10.9 L 25.5 24.5 L 22.5 10 L 19.5 24.5 L 14.3 10.9 L 14 25 L 6.5 13.5 Z"/>' +
    '<path d="M 9 26 C 9 28 10.5 28.5 12.5 30 C 14.5 31.5 17.5 31 22.5 31 ' +
    'C 27.5 31 30.5 31.5 32.5 30 C 34.5 28.5 36 28 36 26 C 27.5 24.5 17.5 24.5 9 26 Z"/>' +
    '<path d="M 11.5 38.5 L 34 38.5 L 35 37 C 35 37 27.5 32.5 22.5 32.5 ' +
    'C 17.5 32.5 10 37 10 37 Z"/>';

  P[KING] =
    '<path d="M 22.5 11.63 L 22.5 6" fill="none" stroke-width="2"/>' +
    '<path d="M 20 8 L 25 8" fill="none" stroke-width="2"/>' +
    '<path d="M 22.5 25 C 22.5 25 27 17.5 25.5 14.5 C 25.5 14.5 24.5 12 22.5 12 ' +
    'C 20.5 12 19.5 14.5 19.5 14.5 C 18 17.5 22.5 25 22.5 25"/>' +
    '<path d="M 12.5 37 C 18 40.5 27 40.5 32.5 37 L 32.5 30 ' +
    'C 32.5 30 41.5 25.5 38.5 19.5 C 34.5 13 25 16 22.5 23.5 ' +
    'L 22.5 27 L 22.5 23.5 C 20 16 10.5 13 6.5 19.5 C 3.5 25.5 12.5 30 12.5 30 Z"/>' +
    '<path d="M 12.5 30 C 18 27 27 27 32.5 30" fill="none"/>' +
    '<path d="M 12.5 33.5 C 18 30.5 27 30.5 32.5 33.5" fill="none"/>' +
    '<path d="M 12.5 37 C 18 34 27 34 32.5 37" fill="none"/>';

  const types: number[] = [PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING];
  let loaded = 0;
  const total: number = types.length * 2;

  for (let ti = 0; ti < types.length; ti++) {
    (function (type: number): void {
      const variants: { key: string; fill: string; stroke: string }[] = [
        { key: 'w' + type, fill: WF, stroke: WS },
        { key: 'b' + type, fill: BF, stroke: BS }
      ];
      for (let vi = 0; vi < variants.length; vi++) {
        (function (v: { key: string; fill: string; stroke: string }): void {
          const svg: string = svgWrap(P[type], v.fill, v.stroke);
          const img: HTMLImageElement = new Image();
          img.onload = function (): void {
            loaded++;
            if (loaded === total) {
              piecesLoaded = true;
              draw();
            }
          };
          img.src = 'data:image/svg+xml;base64,' + btoa(svg);
          pieceImages[v.key] = img;
        })(variants[vi]);
      }
    })(types[ti]);
  }
}

// Board colors
const LIGHT_SQ = '#3d3d3d';
const DARK_SQ = '#262626';
const LIGHT_SQ_HL = '#3a4a3a';
const DARK_SQ_HL = '#2a3a2a';
const SELECT_SQ = '#3a3a2a';

function init(): void {
  canvas = document.getElementById('chess-board') as HTMLCanvasElement;
  if (!canvas) return;
  ctx = canvas.getContext('2d')!;
  statsEl = document.getElementById('mcts-stats')!;
  messageEl = document.getElementById('chess-message')!;
  newGameBtn = document.getElementById('chess-new')!;
  undoBtn = document.getElementById('chess-undo');
  iterationsInput = document.getElementById('chess-iterations') as HTMLInputElement | null;
  depthInput = document.getElementById('chess-depth') as HTMLInputElement | null;
  promotionOverlay = document.getElementById('promotion-overlay');
  historyEl = document.getElementById('move-history');

  canvas.addEventListener('click', onCanvasClick);
  newGameBtn.addEventListener('click', newGame);
  if (undoBtn) undoBtn.addEventListener('click', onUndo);

  const promoButtons: NodeListOf<Element> = document.querySelectorAll('.promo-piece');
  for (let i = 0; i < promoButtons.length; i++) {
    promoButtons[i].addEventListener('click', function (this: Element): void {
      const type: number = parseInt(this.getAttribute('data-piece')!);
      if (promotionCallback) promotionCallback(type);
    });
  }

  buildPieceImages();
  newGame();
  // Defer first resize to ensure layout is computed
  requestAnimationFrame(function (): void {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  });
}

function resizeCanvas(): void {
  const container: HTMLElement = canvas.parentElement!;
  let w: number = container.clientWidth;
  if (w < 100) w = 560; // fallback if layout not ready
  w = Math.min(w, 560);
  canvas.width = w;
  canvas.height = w;
  SQUARE_SIZE = w / 8;
  draw();
}

function newGame(): void {
  gameState = new ChessState();
  gameOver = false;
  aiThinking = false;
  selectedSquare = -1;
  legalMovesForSelected = [];
  lastMoveFrom = -1;
  lastMoveTo = -1;
  moveHistory = [];
  moveStack = [];
  messageEl.textContent = 'white to play';
  messageEl.className = '';
  statsEl.innerHTML = '';
  if (promotionOverlay) promotionOverlay.style.display = 'none';
  renderHistory();
  draw();
}

function onUndo(): void {
  if (aiThinking || moveStack.length < 2) return;
  const prevState: ChessState = moveStack[moveStack.length - 2];
  moveStack.splice(moveStack.length - 2, 2);
  gameState = prevState.clone();
  if (moveHistory.length > 0) {
    moveHistory.pop();
  }
  gameOver = false;
  selectedSquare = -1;
  legalMovesForSelected = [];
  lastMoveFrom = -1;
  lastMoveTo = -1;
  messageEl.textContent = 'white to play';
  messageEl.className = '';
  statsEl.innerHTML = '';
  renderHistory();
  draw();
}

function displaySquare(sq: number): number {
  if (flipped) return 63 - sq;
  return sq;
}

function squareToPixel(sq: number): { x: number; y: number } {
  const dsq: number = displaySquare(sq);
  return { x: (dsq & 7) * SQUARE_SIZE, y: (dsq >> 3) * SQUARE_SIZE };
}

function pixelToSquare(x: number, y: number): number {
  const c: number = Math.floor(x / SQUARE_SIZE);
  const r: number = Math.floor(y / SQUARE_SIZE);
  if (r < 0 || r > 7 || c < 0 || c > 7) return -1;
  let sq: number = r * 8 + c;
  if (flipped) sq = 63 - sq;
  return sq;
}

function sqColor(r: number, c: number, highlighted: boolean): string {
  const isLight: boolean = (r + c) % 2 === 0;
  if (highlighted) return isLight ? LIGHT_SQ_HL : DARK_SQ_HL;
  return isLight ? LIGHT_SQ : DARK_SQ;
}

function draw(): void {
  if (!ctx || !gameState) return;

  const w: number = canvas.width;
  // Clear entire canvas
  ctx.clearRect(0, 0, w, w);

  for (let sq = 0; sq < 64; sq++) {
    const pos: { x: number; y: number } = squareToPixel(sq);
    const r: number = sq >> 3, c: number = sq & 7;
    const hl: boolean = sq === lastMoveFrom || sq === lastMoveTo;

    // Square
    if (sq === selectedSquare) {
      ctx.fillStyle = SELECT_SQ;
    } else {
      ctx.fillStyle = sqColor(r, c, hl);
    }
    ctx.fillRect(pos.x, pos.y, SQUARE_SIZE, SQUARE_SIZE);

    // Legal move indicators
    if (selectedSquare >= 0) {
      for (let li = 0; li < legalMovesForSelected.length; li++) {
        if (legalMovesForSelected[li].to === sq) {
          const cx: number = pos.x + SQUARE_SIZE / 2;
          const cy: number = pos.y + SQUARE_SIZE / 2;
          if (gameState.board[sq] !== EMPTY) {
            // Capture: corner triangles
            ctx.fillStyle = 'rgba(0, 212, 170, 0.4)';
            const s: number = SQUARE_SIZE;
            const t: number = s * 0.2;
            // top-left triangle
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(pos.x + t, pos.y);
            ctx.lineTo(pos.x, pos.y + t);
            ctx.fill();
            // top-right
            ctx.beginPath();
            ctx.moveTo(pos.x + s, pos.y);
            ctx.lineTo(pos.x + s - t, pos.y);
            ctx.lineTo(pos.x + s, pos.y + t);
            ctx.fill();
            // bottom-left
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y + s);
            ctx.lineTo(pos.x + t, pos.y + s);
            ctx.lineTo(pos.x, pos.y + s - t);
            ctx.fill();
            // bottom-right
            ctx.beginPath();
            ctx.moveTo(pos.x + s, pos.y + s);
            ctx.lineTo(pos.x + s - t, pos.y + s);
            ctx.lineTo(pos.x + s, pos.y + s - t);
            ctx.fill();
          } else {
            // Move: small dot
            ctx.fillStyle = 'rgba(0, 212, 170, 0.35)';
            ctx.beginPath();
            ctx.arc(cx, cy, SQUARE_SIZE * 0.15, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
      }
    }

    // Piece
    const piece: number = gameState.board[sq];
    if (piece !== EMPTY && piecesLoaded) {
      const type: number = Math.abs(piece);
      const isWhite: boolean = piece > 0;
      const key: string = (isWhite ? 'w' : 'b') + type;
      const img: HTMLImageElement = pieceImages[key];
      if (img) {
        const ps: number = SQUARE_SIZE * 0.9;
        const px: number = pos.x + (SQUARE_SIZE - ps) / 2;
        const py: number = pos.y + (SQUARE_SIZE - ps) / 2;
        ctx.drawImage(img, px, py, ps, ps);
      }
    }
  }

  // Coordinate labels
  ctx.font = (SQUARE_SIZE * 0.17) + 'px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  for (let fi = 0; fi < 8; fi++) {
    const fSq: number = flipped ? 63 - (56 + fi) : 56 + fi;
    const fPos: { x: number; y: number } = squareToPixel(fSq);
    const fR: number = fSq >> 3, fC: number = fSq & 7;
    ctx.fillStyle = (fR + fC) % 2 === 0 ? '#666' : '#555';
    ctx.fillText(FILES[fC], fPos.x + 2, fPos.y + SQUARE_SIZE - 2);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  for (let ri = 0; ri < 8; ri++) {
    const rSq: number = flipped ? 63 - (ri * 8 + 7) : ri * 8 + 7;
    const rPos: { x: number; y: number } = squareToPixel(rSq);
    const rank: number = 8 - (rSq >> 3);
    const rR2: number = rSq >> 3, rC2: number = rSq & 7;
    ctx.fillStyle = (rR2 + rC2) % 2 === 0 ? '#666' : '#555';
    ctx.fillText(String(rank), rPos.x + SQUARE_SIZE - 2, rPos.y + 2);
  }
}

function recordMove(san: string, side: number): void {
  if (side === WHITE) {
    // fullmoveNumber is still current (increments after black's move)
    moveHistory.push({ num: gameState.fullmoveNumber, white: san, black: '' });
  } else {
    if (moveHistory.length > 0) {
      moveHistory[moveHistory.length - 1].black = san;
    }
  }
  renderHistory();
}

function renderHistory(): void {
  if (!historyEl) return;
  if (moveHistory.length === 0) {
    historyEl.innerHTML = '<span class="history-placeholder">moves will appear here</span>';
    return;
  }
  let html = '';
  for (let i = 0; i < moveHistory.length; i++) {
    const m: { num: number; white: string; black: string } = moveHistory[i];
    html += '<div class="move-row">' +
            '<span class="move-num">' + m.num + '.</span>' +
            '<span class="move-white">' + m.white + '</span>';
    if (m.black) {
      html += '<span class="move-black">' + m.black + '</span>';
    }
    html += '</div>';
  }
  historyEl.innerHTML = html;
  historyEl.scrollTop = historyEl.scrollHeight;
}

function onCanvasClick(e: MouseEvent): void {
  if (gameOver || aiThinking || gameState.current !== playerColor) return;

  const rect: DOMRect = canvas.getBoundingClientRect();
  const scale: number = canvas.width / rect.width;
  const x: number = (e.clientX - rect.left) * scale;
  const y: number = (e.clientY - rect.top) * scale;
  const sq: number = pixelToSquare(x, y);
  if (sq < 0) return;

  if (selectedSquare >= 0) {
    const targetMoves: ChessMove[] = [];
    for (let i = 0; i < legalMovesForSelected.length; i++) {
      if (legalMovesForSelected[i].to === sq) {
        targetMoves.push(legalMovesForSelected[i]);
      }
    }

    if (targetMoves.length > 1) {
      showPromotionOverlay(targetMoves);
      return;
    } else if (targetMoves.length === 1) {
      makePlayerMove(targetMoves[0]);
      return;
    }
  }

  if (gameState.board[sq] !== EMPTY && gameState.sign(gameState.board[sq]) === playerColor) {
    selectedSquare = sq;
    const allLegal: ChessMove[] = gameState.getLegalMoves();
    legalMovesForSelected = [];
    for (let j = 0; j < allLegal.length; j++) {
      if (allLegal[j].from === sq) legalMovesForSelected.push(allLegal[j]);
    }
  } else {
    selectedSquare = -1;
    legalMovesForSelected = [];
  }
  draw();
}

function showPromotionOverlay(moves: ChessMove[]): void {
  if (!promotionOverlay) return;
  promotionOverlay.style.display = 'flex';
  promotionCallback = function (type: number): void {
    promotionOverlay!.style.display = 'none';
    let move: ChessMove | null = null;
    for (let i = 0; i < moves.length; i++) {
      if (Math.abs(moves[i].promo!) === type) { move = moves[i]; break; }
    }
    if (move) makePlayerMove(move);
    promotionCallback = null;
  };
}

function makePlayerMove(move: ChessMove): void {
  moveStack.push(gameState.clone());
  const san: string = toSAN(gameState, move);
  const side: number = gameState.current;
  lastMoveFrom = move.from;
  lastMoveTo = move.to;
  gameState.applyMove(move);
  recordMove(san, side);
  selectedSquare = -1;
  legalMovesForSelected = [];
  draw();

  if (gameState.isTerminal()) {
    showResult();
    return;
  }

  aiTurn();
}

function aiTurn(): void {
  aiThinking = true;
  messageEl.textContent = 'thinking...';

  setTimeout(function (): void {
    moveStack.push(gameState.clone());

    const iters: number = iterationsInput ? parseInt(iterationsInput.value) || 3000 : 3000;
    const depth: number = depthInput ? parseInt(depthInput.value) || 25 : 25;
    const result = search(gameState, {
      iterations: iters,
      explorationC: 1.414,
      rolloutDepth: depth,
      useEval: true,
      rolloutFn: chessRollout
    });

    if (result.bestMove) {
      const bestMove: ChessMove = result.bestMove as unknown as ChessMove;
      const san: string = toSAN(gameState, bestMove);
      const side: number = gameState.current;
      lastMoveFrom = bestMove.from;
      lastMoveTo = bestMove.to;
      gameState.applyMove(bestMove);
      recordMove(san, side);
      messageEl.textContent = san;
    }

    updateStats(result.stats);
    aiThinking = false;
    draw();

    if (gameState.isTerminal()) {
      showResult();
    } else {
      messageEl.textContent += ' \u00b7 your turn';
    }
  }, 50);
}

function showResult(): void {
  gameOver = true;
  const result: string = gameState.getGameOverResult();
  if (result === 'w') {
    messageEl.textContent = 'checkmate \u2014 white wins';
    messageEl.className = playerColor === WHITE ? '' : 'loss';
  } else if (result === 'b') {
    messageEl.textContent = 'checkmate \u2014 black wins';
    messageEl.className = playerColor === BLACK_P ? '' : 'loss';
  } else {
    messageEl.textContent = 'draw';
    messageEl.className = '';
    if (gameState.halfmoveClock >= 100) messageEl.textContent += ' \u2014 50-move rule';
    else if (gameState.positionHistory[gameState.positionKey()] >= 3) messageEl.textContent += ' \u2014 threefold repetition';
    else if (gameState.insufficientMaterial()) messageEl.textContent += ' \u2014 insufficient material';
    else messageEl.textContent += ' \u2014 stalemate';
  }
}

interface TreeNode {
  move: ChessMove | null;
  visits: number;
  winRate: number;
  children: TreeNode[];
}

function moveLabel(move: ChessMove): string {
  if (move.castle === 'K' || move.castle === 'k') return 'O-O';
  if (move.castle === 'Q' || move.castle === 'q') return 'O-O-O';
  let label: string = FILES[move.from & 7] + (8 - (move.from >> 3)) +
              FILES[move.to & 7] + (8 - (move.to >> 3));
  if (move.promo) {
    const PROMO_LETTERS: Record<number, string> = {};
    PROMO_LETTERS[QUEEN] = 'Q'; PROMO_LETTERS[ROOK] = 'R';
    PROMO_LETTERS[BISHOP] = 'B'; PROMO_LETTERS[KNIGHT] = 'N';
    label += (PROMO_LETTERS[Math.abs(move.promo)] || '');
  }
  return label;
}

function updateStats(stats: { iterations: number; topMoves: { move: number; visits: number; winRate: number }[]; tree: TreeNode }): void {
  let html: string = '<div class="mcts-header">mcts search \u00b7 ' + stats.iterations.toLocaleString() + ' iterations</div>';
  const maxVisits: number = stats.topMoves.length > 0 ? stats.topMoves[0].visits : 1;
  for (let i = 0; i < Math.min(stats.topMoves.length, 6); i++) {
    const m = stats.topMoves[i];
    const label: string = moveLabel(m.move as unknown as ChessMove);
    const barWidth: number = Math.max(2, (m.visits / maxVisits) * 100);
    html += '<div class="mcts-move">' +
      '<span class="mcts-label">' + label + '</span>' +
      '<span class="mcts-visits">' + m.visits + '</span>' +
      '<span class="mcts-bar"><span style="width:' + barWidth + '%"></span></span>' +
      '<span class="mcts-wr">' + m.winRate.toFixed(1) + '%</span>' +
      '</div>';
  }
  statsEl.innerHTML = html;

  // Render tree visualization
  if (stats.tree) renderTree(stats.tree);
}

function renderTree(tree: TreeNode): void {
  const container: HTMLElement | null = document.getElementById('mcts-tree');
  if (!container) return;

  const children: TreeNode[] = tree.children.slice(0, 5);
  if (children.length === 0) {
    container.innerHTML = '';
    return;
  }

  // Ensure canvas exists
  let tc: HTMLCanvasElement | null = container.querySelector('canvas');
  if (!tc) {
    container.innerHTML = '<div class="tree-header">search tree</div><canvas id="tree-canvas"></canvas>';
    tc = container.querySelector('canvas');
  } else {
    container.querySelector('.tree-header')!.textContent = 'search tree';
  }

  const cw: number = container.clientWidth || 460;
  const dpr: number = window.devicePixelRatio || 1;

  // Layout constants
  const nodeR = 22;
  const levelGap = 80;
  const topPad = 30;
  const botPad = 20;

  // Compute grandchild count per child for height
  let maxGC = 0;
  for (let ci = 0; ci < children.length; ci++) {
    const gcLen: number = children[ci].children ? children[ci].children.length : 0;
    if (gcLen > maxGC) maxGC = gcLen;
  }

  const levels: number = maxGC > 0 ? 3 : 2;
  const ch: number = topPad + levels * levelGap + botPad;

  tc!.style.width = cw + 'px';
  tc!.style.height = ch + 'px';
  tc!.width = cw * dpr;
  tc!.height = ch * dpr;

  const tx: CanvasRenderingContext2D = tc!.getContext('2d')!;
  tx.setTransform(dpr, 0, 0, dpr, 0, 0);
  tx.clearRect(0, 0, cw, ch);

  // Root node
  const rootX: number = cw / 2;
  const rootY: number = topPad + nodeR;

  // Lay out level-1 children evenly
  const n1: number = children.length;
  const spacing1: number = cw / (n1 + 1);
  const l1Nodes: { x: number; y: number; data: TreeNode; isBest: boolean }[] = [];
  for (let i = 0; i < n1; i++) {
    l1Nodes.push({
      x: spacing1 * (i + 1),
      y: rootY + levelGap,
      data: children[i],
      isBest: i === 0
    });
  }

  // Draw edges root -> level-1
  tx.lineWidth = 1.5;
  for (let e1 = 0; e1 < l1Nodes.length; e1++) {
    const nd = l1Nodes[e1];
    tx.strokeStyle = nd.isBest ? '#00d4aa' : '#333';
    tx.beginPath();
    tx.moveTo(rootX, rootY + nodeR);
    tx.lineTo(nd.x, nd.y - nodeR);
    tx.stroke();
  }

  // Draw edges level-1 -> level-2, and collect level-2 nodes
  const l2Nodes: { x: number; y: number; data: TreeNode; isBest: boolean }[] = [];
  for (let c1 = 0; c1 < l1Nodes.length; c1++) {
    const parent = l1Nodes[c1];
    const gcs: TreeNode[] = parent.data.children || [];
    if (gcs.length === 0) continue;
    const gcSpan: number = Math.min(spacing1 * 0.8, gcs.length * 50);
    const gcStart: number = parent.x - gcSpan / 2;
    const gcStep: number = gcs.length > 1 ? gcSpan / (gcs.length - 1) : 0;
    for (let g = 0; g < gcs.length; g++) {
      const gx: number = gcs.length === 1 ? parent.x : gcStart + gcStep * g;
      const gy: number = parent.y + levelGap;
      tx.strokeStyle = '#2a2a2a';
      tx.lineWidth = 1;
      tx.beginPath();
      tx.moveTo(parent.x, parent.y + nodeR);
      tx.lineTo(gx, gy - nodeR);
      tx.stroke();
      l2Nodes.push({ x: gx, y: gy, data: gcs[g], isBest: false });
    }
  }

  // Draw root node
  drawNode(tx, rootX, rootY, nodeR, 'root', tree.visits, null, true, false);

  // Draw level-1 nodes
  for (let d1 = 0; d1 < l1Nodes.length; d1++) {
    const n = l1Nodes[d1];
    drawNode(tx, n.x, n.y, nodeR, moveLabel(n.data.move!),
             n.data.visits, n.data.winRate, false, n.isBest);
  }

  // Draw level-2 nodes (smaller)
  const smallR = 16;
  for (let d2 = 0; d2 < l2Nodes.length; d2++) {
    const n2 = l2Nodes[d2];
    drawNode(tx, n2.x, n2.y, smallR, moveLabel(n2.data.move!),
             n2.data.visits, n2.data.winRate, false, false);
  }
}

function drawNode(tx: CanvasRenderingContext2D, x: number, y: number, r: number, label: string, visits: number, winRate: number | null, isRoot: boolean, isBest: boolean): void {
  // Circle
  tx.beginPath();
  tx.arc(x, y, r, 0, Math.PI * 2);
  if (isRoot) {
    tx.fillStyle = '#1a1a1a';
    tx.strokeStyle = '#00d4aa';
    tx.lineWidth = 2;
  } else if (isBest) {
    tx.fillStyle = '#0a2a22';
    tx.strokeStyle = '#00d4aa';
    tx.lineWidth = 2;
  } else {
    tx.fillStyle = '#1a1a1a';
    tx.strokeStyle = '#333';
    tx.lineWidth = 1.5;
  }
  tx.fill();
  tx.stroke();

  // Move label above node
  tx.font = (r > 18 ? 10 : 8) + 'px JetBrains Mono, monospace';
  tx.textAlign = 'center';
  tx.fillStyle = isBest ? '#00d4aa' : '#888';
  tx.fillText(label, x, y - r - 4);

  // Visits inside node
  tx.fillStyle = '#c8c8c8';
  tx.font = 'bold ' + (r > 18 ? 10 : 8) + 'px JetBrains Mono, monospace';
  tx.textBaseline = 'middle';
  if (isRoot) {
    tx.fillText(shortNum(visits), x, y);
  } else {
    tx.fillText(shortNum(visits), x, y - 3);
    // Win rate below visits
    tx.font = (r > 18 ? 9 : 7) + 'px JetBrains Mono, monospace';
    tx.fillStyle = winRate! >= 50 ? '#00d4aa' : '#e84057';
    tx.fillText(winRate!.toFixed(0) + '%', x, y + (r > 18 ? 9 : 7));
  }
  tx.textBaseline = 'alphabetic';
}

function main(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

main();
