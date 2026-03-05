// Chess with MCTS AI (hybrid: short rollout + piece-square evaluation)
(function () {
  'use strict';

  // Piece values: ±1 pawn, ±2 knight, ±3 bishop, ±4 rook, ±5 queen, ±6 king
  var EMPTY = 0, PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
  var WHITE = 1, BLACK_P = -1; // player signs: white positive, black negative

  // Piece-square tables (from white's perspective, index 0 = a8)
  var PST = {};
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

  var PIECE_VALUES = [0, 100, 320, 330, 500, 900, 20000];

  // ── Chess State ──

  function ChessState() {
    this.board = new Int8Array(64);
    var backRank = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];
    for (var i = 0; i < 8; i++) {
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

  ChessState.prototype.clone = function () {
    var s = new ChessState();
    s.board = new Int8Array(this.board);
    s.current = this.current;
    s.castling = this.castling.slice();
    s.epSquare = this.epSquare;
    s.halfmoveClock = this.halfmoveClock;
    s.fullmoveNumber = this.fullmoveNumber;
    s.positionHistory = {};
    for (var k in this.positionHistory) s.positionHistory[k] = this.positionHistory[k];
    s._legalMovesCache = null;
    s._gameOverResult = null;
    return s;
  };

  ChessState.prototype.rc = function (sq) { return [sq >> 3, sq & 7]; };
  ChessState.prototype.sq = function (r, c) { return (r << 3) | c; };
  ChessState.prototype.onBoard = function (r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; };
  ChessState.prototype.sign = function (piece) { return piece > 0 ? WHITE : BLACK_P; };

  ChessState.prototype.pseudoLegalMoves = function () {
    var moves = [];
    var side = this.current;

    for (var sq = 0; sq < 64; sq++) {
      var piece = this.board[sq];
      if (piece === EMPTY || this.sign(piece) !== side) continue;
      var type = Math.abs(piece);
      var rc = this.rc(sq);
      var r = rc[0], c = rc[1];

      if (type === PAWN) {
        var dir = side === WHITE ? -1 : 1;
        var startRow = side === WHITE ? 6 : 1;
        var promoRow = side === WHITE ? 0 : 7;
        var fr = r + dir;
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
        for (var dc = -1; dc <= 1; dc += 2) {
          var cc = c + dc;
          if (!this.onBoard(fr, cc)) continue;
          var target = this.sq(fr, cc);
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
        var knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (var ki = 0; ki < knightMoves.length; ki++) {
          var nr = r + knightMoves[ki][0], nc = c + knightMoves[ki][1];
          if (this.onBoard(nr, nc)) {
            var nt = this.board[this.sq(nr, nc)];
            if (nt === EMPTY || this.sign(nt) !== side) {
              moves.push({from: sq, to: this.sq(nr, nc)});
            }
          }
        }
      } else if (type === BISHOP || type === ROOK || type === QUEEN) {
        var dirs = [];
        if (type === BISHOP || type === QUEEN) dirs = dirs.concat([[-1,-1],[-1,1],[1,-1],[1,1]]);
        if (type === ROOK || type === QUEEN) dirs = dirs.concat([[-1,0],[1,0],[0,-1],[0,1]]);
        for (var di = 0; di < dirs.length; di++) {
          var dr = dirs[di][0], dcc = dirs[di][1];
          var cr = r + dr, ccc = c + dcc;
          while (this.onBoard(cr, ccc)) {
            var t = this.board[this.sq(cr, ccc)];
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
        for (var kdr = -1; kdr <= 1; kdr++) {
          for (var kdc = -1; kdc <= 1; kdc++) {
            if (kdr === 0 && kdc === 0) continue;
            var kr = r + kdr, kc = c + kdc;
            if (this.onBoard(kr, kc)) {
              var kt = this.board[this.sq(kr, kc)];
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
  };

  ChessState.prototype.isAttacked = function (sq, byColor) {
    var rc = this.rc(sq);
    var r = rc[0], c = rc[1];

    var pawnDir = byColor === WHITE ? 1 : -1;
    for (var pdc = -1; pdc <= 1; pdc += 2) {
      var pr = r + pawnDir, pc = c + pdc;
      if (this.onBoard(pr, pc) && this.board[this.sq(pr, pc)] === PAWN * byColor) return true;
    }

    var knightDeltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (var ki = 0; ki < knightDeltas.length; ki++) {
      var kr = r + knightDeltas[ki][0], kc = c + knightDeltas[ki][1];
      if (this.onBoard(kr, kc) && this.board[this.sq(kr, kc)] === KNIGHT * byColor) return true;
    }

    var diagDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
    for (var di = 0; di < diagDirs.length; di++) {
      var dr = r + diagDirs[di][0], drc = c + diagDirs[di][1];
      while (this.onBoard(dr, drc)) {
        var p = this.board[this.sq(dr, drc)];
        if (p !== EMPTY) {
          if (this.sign(p) === byColor && (Math.abs(p) === BISHOP || Math.abs(p) === QUEEN)) return true;
          break;
        }
        dr += diagDirs[di][0];
        drc += diagDirs[di][1];
      }
    }
    var straightDirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (var si = 0; si < straightDirs.length; si++) {
      var sr = r + straightDirs[si][0], sc = c + straightDirs[si][1];
      while (this.onBoard(sr, sc)) {
        var sp = this.board[this.sq(sr, sc)];
        if (sp !== EMPTY) {
          if (this.sign(sp) === byColor && (Math.abs(sp) === ROOK || Math.abs(sp) === QUEEN)) return true;
          break;
        }
        sr += straightDirs[si][0];
        sc += straightDirs[si][1];
      }
    }

    for (var kdr = -1; kdr <= 1; kdr++) {
      for (var kdc = -1; kdc <= 1; kdc++) {
        if (kdr === 0 && kdc === 0) continue;
        var kkr = r + kdr, kkc = c + kdc;
        if (this.onBoard(kkr, kkc) && this.board[this.sq(kkr, kkc)] === KING * byColor) return true;
      }
    }
    return false;
  };

  ChessState.prototype.findKing = function (side) {
    var king = KING * side;
    for (var i = 0; i < 64; i++) {
      if (this.board[i] === king) return i;
    }
    return -1;
  };

  ChessState.prototype.inCheck = function (side) {
    var kingPos = this.findKing(side);
    if (kingPos === -1) return true;
    return this.isAttacked(kingPos, side === WHITE ? BLACK_P : WHITE);
  };

  ChessState.prototype.applyMove = function (move) {
    this._legalMovesCache = null;
    this._gameOverResult = null;

    var piece = this.board[move.from];
    var captured = this.board[move.to];
    var type = Math.abs(piece);

    if (type === PAWN && move.to === this.epSquare) {
      var epCaptureSq = this.current === WHITE ? move.to + 8 : move.to - 8;
      this.board[epCaptureSq] = EMPTY;
    }

    this.board[move.to] = move.promo || piece;
    this.board[move.from] = EMPTY;

    if (move.castle) {
      if (move.castle === 'K') { this.board[61] = ROOK; this.board[63] = EMPTY; }
      if (move.castle === 'Q') { this.board[59] = ROOK; this.board[56] = EMPTY; }
      if (move.castle === 'k') { this.board[5] = -ROOK; this.board[7] = EMPTY; }
      if (move.castle === 'q') { this.board[3] = -ROOK; this.board[0] = EMPTY; }
    }

    if (type === PAWN && Math.abs(move.to - move.from) === 16) {
      this.epSquare = (move.from + move.to) / 2;
    } else {
      this.epSquare = -1;
    }

    if (type === KING) {
      if (this.current === WHITE) { this.castling[0] = false; this.castling[1] = false; }
      else { this.castling[2] = false; this.castling[3] = false; }
    }
    if (move.from === 63 || move.to === 63) this.castling[0] = false;
    if (move.from === 56 || move.to === 56) this.castling[1] = false;
    if (move.from === 7 || move.to === 7) this.castling[2] = false;
    if (move.from === 0 || move.to === 0) this.castling[3] = false;

    if (type === PAWN || captured !== EMPTY) {
      this.halfmoveClock = 0;
    } else {
      this.halfmoveClock++;
    }

    if (this.current === BLACK_P) this.fullmoveNumber++;
    this.current = -this.current;

    var key = this.positionKey();
    this.positionHistory[key] = (this.positionHistory[key] || 0) + 1;
  };

  ChessState.prototype.positionKey = function () {
    var key = '';
    for (var i = 0; i < 64; i++) key += String.fromCharCode(this.board[i] + 7);
    key += this.current + ',' + this.castling.join('') + ',' + this.epSquare;
    return key;
  };

  ChessState.prototype.getLegalMoves = function () {
    if (this._legalMovesCache !== null) return this._legalMovesCache;
    var pseudo = this.pseudoLegalMoves();
    var legal = [];
    var side = this.current;
    for (var i = 0; i < pseudo.length; i++) {
      var s = this.clone();
      s.current = side;
      s.applyMove(pseudo[i]);
      if (!s.inCheck(side)) {
        legal.push(pseudo[i]);
      }
    }
    this._legalMovesCache = legal;
    return legal;
  };

  ChessState.prototype.isTerminal = function () {
    if (this._gameOverResult !== null) return this._gameOverResult !== 'playing';
    var result = this.getGameOverResult();
    return result !== 'playing';
  };

  ChessState.prototype.getGameOverResult = function () {
    if (this._gameOverResult !== null) return this._gameOverResult;

    if (this.halfmoveClock >= 100) {
      this._gameOverResult = 'd';
      return 'd';
    }

    var key = this.positionKey();
    if (this.positionHistory[key] >= 3) {
      this._gameOverResult = 'd';
      return 'd';
    }

    var moves = this.getLegalMoves();
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
  };

  ChessState.prototype.insufficientMaterial = function () {
    var whitePieces = [], blackPieces = [];
    for (var i = 0; i < 64; i++) {
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
  };

  ChessState.prototype.getResult = function (player) {
    var result = this.getGameOverResult();
    if (result === 'd') return 0.5;
    if (result === 'w') return player === WHITE ? 1 : 0;
    if (result === 'b') return player === BLACK_P ? 1 : 0;
    return 0.5;
  };

  ChessState.prototype.getCurrentPlayer = function () { return this.current; };

  ChessState.prototype.evaluate = function (player) {
    var score = 0;
    for (var i = 0; i < 64; i++) {
      var p = this.board[i];
      if (p === EMPTY) continue;
      var type = Math.abs(p);
      var side = this.sign(p);
      var val = PIECE_VALUES[type];
      var pstIdx = side === WHITE ? i : (7 - (i >> 3)) * 8 + (i & 7);
      val += PST[type][pstIdx];
      score += val * side;
    }
    var normalized = (score + 3000) / 6000;
    if (normalized < 0) normalized = 0;
    if (normalized > 1) normalized = 1;
    return player === WHITE ? normalized : 1 - normalized;
  };

  // Capture-biased rollout for chess
  function chessRollout(state, maxDepth) {
    var s = state.clone();
    var depth = 0;
    while (!s.isTerminal() && depth < maxDepth) {
      var moves = s.getLegalMoves();
      if (moves.length === 0) break;
      var captures = [];
      for (var i = 0; i < moves.length; i++) {
        if (s.board[moves[i].to] !== EMPTY || moves[i].promo) {
          captures.push(moves[i]);
        }
      }
      var chosen;
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

  var FILES = 'abcdefgh';
  var PIECE_LETTERS = {1: '', 2: 'N', 3: 'B', 4: 'R', 5: 'Q', 6: 'K'};

  // Generate SAN for a move BEFORE it is applied to the state
  function toSAN(state, move) {
    if (move.castle === 'K' || move.castle === 'k') return 'O-O';
    if (move.castle === 'Q' || move.castle === 'q') return 'O-O-O';

    var piece = state.board[move.from];
    var type = Math.abs(piece);
    var side = state.current;
    var isCapture = state.board[move.to] !== EMPTY ||
                    (type === PAWN && move.to === state.epSquare);

    var san = '';

    if (type === PAWN) {
      if (isCapture) san += FILES[move.from & 7];
    } else {
      san += PIECE_LETTERS[type];
      // Disambiguation: check if another piece of same type can reach same square
      var legal = state.getLegalMoves();
      var ambiguous = [];
      for (var i = 0; i < legal.length; i++) {
        var m = legal[i];
        if (m.to === move.to && m.from !== move.from &&
            Math.abs(state.board[m.from]) === type && !m.castle) {
          ambiguous.push(m);
        }
      }
      if (ambiguous.length > 0) {
        var sameFile = false, sameRank = false;
        for (var j = 0; j < ambiguous.length; j++) {
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
    var test = state.clone();
    test.current = side;
    test.applyMove(move);
    if (test.inCheck(test.current)) {
      var testMoves = test.getLegalMoves();
      san += testMoves.length === 0 ? '#' : '+';
    }

    return san;
  }

  // ── UI ──

  var canvas, ctx;
  var BOARD_SIZE;
  var SQUARE_SIZE;
  var gameState;
  var gameOver = false;
  var aiThinking = false;
  var selectedSquare = -1;
  var legalMovesForSelected = [];
  var playerColor = WHITE;
  var lastMoveFrom = -1, lastMoveTo = -1;
  var statsEl, messageEl, newGameBtn, undoBtn;
  var iterationsInput, depthInput;
  var promotionOverlay, promotionCallback = null;
  var historyEl;
  var flipped = false;
  var moveHistory = [];
  var moveStack = [];

  // ── Piece images (SVG-based) ──
  var pieceImages = {};
  var piecesLoaded = false;

  function buildPieceImages() {
    var WF = '#f0e8dc', WS = '#1a1a1a';
    var BF = '#1a1a1a', BS = '#b0b0b0';

    function svgWrap(body, fill, stroke) {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">' +
        '<g fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5" ' +
        'stroke-linecap="round" stroke-linejoin="round">' + body + '</g></svg>';
    }

    var P = {};
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

    var types = [PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING];
    var loaded = 0;
    var total = types.length * 2;

    for (var ti = 0; ti < types.length; ti++) {
      (function (type) {
        var variants = [
          { key: 'w' + type, fill: WF, stroke: WS },
          { key: 'b' + type, fill: BF, stroke: BS }
        ];
        for (var vi = 0; vi < variants.length; vi++) {
          (function (v) {
            var svg = svgWrap(P[type], v.fill, v.stroke);
            var img = new Image();
            img.onload = function () {
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
  var LIGHT_SQ = '#3d3d3d';
  var DARK_SQ = '#262626';
  var LIGHT_SQ_HL = '#3a4a3a';
  var DARK_SQ_HL = '#2a3a2a';
  var SELECT_SQ = '#3a3a2a';

  function init() {
    canvas = document.getElementById('chess-board');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    statsEl = document.getElementById('mcts-stats');
    messageEl = document.getElementById('chess-message');
    newGameBtn = document.getElementById('chess-new');
    undoBtn = document.getElementById('chess-undo');
    iterationsInput = document.getElementById('chess-iterations');
    depthInput = document.getElementById('chess-depth');
    promotionOverlay = document.getElementById('promotion-overlay');
    historyEl = document.getElementById('move-history');

    canvas.addEventListener('click', onCanvasClick);
    newGameBtn.addEventListener('click', newGame);
    if (undoBtn) undoBtn.addEventListener('click', onUndo);

    var promoButtons = document.querySelectorAll('.promo-piece');
    for (var i = 0; i < promoButtons.length; i++) {
      promoButtons[i].addEventListener('click', function () {
        var type = parseInt(this.getAttribute('data-piece'));
        if (promotionCallback) promotionCallback(type);
      });
    }

    buildPieceImages();
    newGame();
    // Defer first resize to ensure layout is computed
    requestAnimationFrame(function () {
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
    });
  }

  function resizeCanvas() {
    var container = canvas.parentElement;
    var w = container.clientWidth;
    if (w < 100) w = 560; // fallback if layout not ready
    w = Math.min(w, 560);
    canvas.width = w;
    canvas.height = w;
    BOARD_SIZE = w;
    SQUARE_SIZE = w / 8;
    draw();
  }

  function newGame() {
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

  function onUndo() {
    if (aiThinking || moveStack.length < 2) return;
    var prevState = moveStack[moveStack.length - 2];
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

  function displaySquare(sq) {
    if (flipped) return 63 - sq;
    return sq;
  }

  function squareToPixel(sq) {
    var dsq = displaySquare(sq);
    return { x: (dsq & 7) * SQUARE_SIZE, y: (dsq >> 3) * SQUARE_SIZE };
  }

  function pixelToSquare(x, y) {
    var c = Math.floor(x / SQUARE_SIZE);
    var r = Math.floor(y / SQUARE_SIZE);
    if (r < 0 || r > 7 || c < 0 || c > 7) return -1;
    var sq = r * 8 + c;
    if (flipped) sq = 63 - sq;
    return sq;
  }

  function sqColor(r, c, highlighted) {
    var isLight = (r + c) % 2 === 0;
    if (highlighted) return isLight ? LIGHT_SQ_HL : DARK_SQ_HL;
    return isLight ? LIGHT_SQ : DARK_SQ;
  }

  function draw() {
    if (!ctx || !gameState) return;

    var w = canvas.width;
    // Clear entire canvas
    ctx.clearRect(0, 0, w, w);

    for (var sq = 0; sq < 64; sq++) {
      var pos = squareToPixel(sq);
      var r = sq >> 3, c = sq & 7;
      var hl = sq === lastMoveFrom || sq === lastMoveTo;

      // Square
      if (sq === selectedSquare) {
        ctx.fillStyle = SELECT_SQ;
      } else {
        ctx.fillStyle = sqColor(r, c, hl);
      }
      ctx.fillRect(pos.x, pos.y, SQUARE_SIZE, SQUARE_SIZE);

      // Legal move indicators
      if (selectedSquare >= 0) {
        for (var li = 0; li < legalMovesForSelected.length; li++) {
          if (legalMovesForSelected[li].to === sq) {
            var cx = pos.x + SQUARE_SIZE / 2;
            var cy = pos.y + SQUARE_SIZE / 2;
            if (gameState.board[sq] !== EMPTY) {
              // Capture: corner triangles
              ctx.fillStyle = 'rgba(0, 212, 170, 0.4)';
              var s = SQUARE_SIZE;
              var t = s * 0.2;
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
      var piece = gameState.board[sq];
      if (piece !== EMPTY && piecesLoaded) {
        var type = Math.abs(piece);
        var isWhite = piece > 0;
        var key = (isWhite ? 'w' : 'b') + type;
        var img = pieceImages[key];
        if (img) {
          var ps = SQUARE_SIZE * 0.9;
          var px = pos.x + (SQUARE_SIZE - ps) / 2;
          var py = pos.y + (SQUARE_SIZE - ps) / 2;
          ctx.drawImage(img, px, py, ps, ps);
        }
      }
    }

    // Coordinate labels
    ctx.font = (SQUARE_SIZE * 0.17) + 'px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    for (var fi = 0; fi < 8; fi++) {
      var fSq = flipped ? 63 - (56 + fi) : 56 + fi;
      var fPos = squareToPixel(fSq);
      var fR = fSq >> 3, fC = fSq & 7;
      ctx.fillStyle = (fR + fC) % 2 === 0 ? '#666' : '#555';
      ctx.fillText(FILES[fC], fPos.x + 2, fPos.y + SQUARE_SIZE - 2);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    for (var ri = 0; ri < 8; ri++) {
      var rSq = flipped ? 63 - (ri * 8 + 7) : ri * 8 + 7;
      var rPos = squareToPixel(rSq);
      var rank = 8 - (rSq >> 3);
      var rR2 = rSq >> 3, rC2 = rSq & 7;
      ctx.fillStyle = (rR2 + rC2) % 2 === 0 ? '#666' : '#555';
      ctx.fillText(String(rank), rPos.x + SQUARE_SIZE - 2, rPos.y + 2);
    }
  }

  function recordMove(san, side) {
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

  function renderHistory() {
    if (!historyEl) return;
    if (moveHistory.length === 0) {
      historyEl.innerHTML = '<span class="history-placeholder">moves will appear here</span>';
      return;
    }
    var html = '';
    for (var i = 0; i < moveHistory.length; i++) {
      var m = moveHistory[i];
      html += '<span class="move-num">' + m.num + '.</span>' +
              '<span class="move-white">' + m.white + '</span>';
      if (m.black) {
        html += '<span class="move-black">' + m.black + '</span>';
      }
    }
    historyEl.innerHTML = html;
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function onCanvasClick(e) {
    if (gameOver || aiThinking || gameState.current !== playerColor) return;

    var rect = canvas.getBoundingClientRect();
    var scale = canvas.width / rect.width;
    var x = (e.clientX - rect.left) * scale;
    var y = (e.clientY - rect.top) * scale;
    var sq = pixelToSquare(x, y);
    if (sq < 0) return;

    if (selectedSquare >= 0) {
      var targetMoves = [];
      for (var i = 0; i < legalMovesForSelected.length; i++) {
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
      var allLegal = gameState.getLegalMoves();
      legalMovesForSelected = [];
      for (var j = 0; j < allLegal.length; j++) {
        if (allLegal[j].from === sq) legalMovesForSelected.push(allLegal[j]);
      }
    } else {
      selectedSquare = -1;
      legalMovesForSelected = [];
    }
    draw();
  }

  function showPromotionOverlay(moves) {
    if (!promotionOverlay) return;
    promotionOverlay.style.display = 'flex';
    promotionCallback = function (type) {
      promotionOverlay.style.display = 'none';
      var move = null;
      for (var i = 0; i < moves.length; i++) {
        if (Math.abs(moves[i].promo) === type) { move = moves[i]; break; }
      }
      if (move) makePlayerMove(move);
      promotionCallback = null;
    };
  }

  function makePlayerMove(move) {
    moveStack.push(gameState.clone());
    var san = toSAN(gameState, move);
    var side = gameState.current;
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

  function aiTurn() {
    aiThinking = true;
    messageEl.textContent = 'thinking...';

    setTimeout(function () {
      moveStack.push(gameState.clone());

      var iters = iterationsInput ? parseInt(iterationsInput.value) || 3000 : 3000;
      var depth = depthInput ? parseInt(depthInput.value) || 25 : 25;
      var result = MCTS.search(gameState, {
        iterations: iters,
        explorationC: 1.414,
        rolloutDepth: depth,
        useEval: true,
        rolloutFn: chessRollout
      });

      if (result.bestMove) {
        var san = toSAN(gameState, result.bestMove);
        var side = gameState.current;
        lastMoveFrom = result.bestMove.from;
        lastMoveTo = result.bestMove.to;
        gameState.applyMove(result.bestMove);
        recordMove(san, side);
        messageEl.textContent = san;
      }

      updateStats(result.stats);
      aiThinking = false;
      draw();

      if (gameState.isTerminal()) {
        showResult();
      } else {
        messageEl.textContent += ' · your turn';
      }
    }, 50);
  }

  function showResult() {
    gameOver = true;
    var result = gameState.getGameOverResult();
    if (result === 'w') {
      messageEl.textContent = 'checkmate — white wins';
      messageEl.className = playerColor === WHITE ? '' : 'loss';
    } else if (result === 'b') {
      messageEl.textContent = 'checkmate — black wins';
      messageEl.className = playerColor === BLACK_P ? '' : 'loss';
    } else {
      messageEl.textContent = 'draw';
      messageEl.className = '';
      if (gameState.halfmoveClock >= 100) messageEl.textContent += ' — 50-move rule';
      else if (gameState.positionHistory[gameState.positionKey()] >= 3) messageEl.textContent += ' — threefold repetition';
      else if (gameState.insufficientMaterial()) messageEl.textContent += ' — insufficient material';
      else messageEl.textContent += ' — stalemate';
    }
  }

  function moveLabel(move) {
    if (move.castle === 'K' || move.castle === 'k') return 'O-O';
    if (move.castle === 'Q' || move.castle === 'q') return 'O-O-O';
    var label = FILES[move.from & 7] + (8 - (move.from >> 3)) +
                FILES[move.to & 7] + (8 - (move.to >> 3));
    if (move.promo) {
      var PROMO_LETTERS = {};
      PROMO_LETTERS[QUEEN] = 'Q'; PROMO_LETTERS[ROOK] = 'R';
      PROMO_LETTERS[BISHOP] = 'B'; PROMO_LETTERS[KNIGHT] = 'N';
      label += (PROMO_LETTERS[Math.abs(move.promo)] || '');
    }
    return label;
  }

  function updateStats(stats) {
    var html = '<div class="mcts-header">mcts search · ' + stats.iterations.toLocaleString() + ' iterations</div>';
    var maxVisits = stats.topMoves.length > 0 ? stats.topMoves[0].visits : 1;
    for (var i = 0; i < Math.min(stats.topMoves.length, 6); i++) {
      var m = stats.topMoves[i];
      var label = moveLabel(m.move);
      var barWidth = Math.max(2, (m.visits / maxVisits) * 100);
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

  function renderTree(tree) {
    var treeEl = document.getElementById('mcts-tree');
    if (!treeEl) return;

    var children = tree.children.slice(0, 5);
    if (children.length === 0) {
      treeEl.innerHTML = '';
      return;
    }

    var maxVisits = children[0].visits || 1;

    var html = '<div class="tree-header">search tree · ' + tree.visits.toLocaleString() + ' total visits</div>';
    html += '<div class="tree-root">root</div>';
    html += '<div class="tree-branches">';

    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      var label = moveLabel(c.move);
      var pct = (c.visits / maxVisits * 100).toFixed(0);
      var wr = c.winRate.toFixed(1);
      var isBest = i === 0;

      html += '<div class="tree-branch' + (isBest ? ' best' : '') + '">';
      html += '<div class="tree-connector"><span class="tree-line"></span></div>';
      html += '<div class="tree-node">';
      html += '<span class="tree-node-move">' + label + '</span>';
      html += '<span class="tree-node-bar"><span style="width:' + pct + '%"></span></span>';
      html += '<span class="tree-node-info">' + c.visits + ' · ' + wr + '%</span>';
      html += '</div>';

      // Grandchildren
      if (c.children && c.children.length > 0) {
        html += '<div class="tree-children">';
        for (var j = 0; j < c.children.length; j++) {
          var gc = c.children[j];
          var gcLabel = moveLabel(gc.move);
          var gcWr = gc.winRate.toFixed(1);
          html += '<div class="tree-leaf">';
          html += '<span class="tree-leaf-line"></span>';
          html += '<span class="tree-leaf-move">' + gcLabel + '</span>';
          html += '<span class="tree-leaf-info">' + gc.visits + ' · ' + gcWr + '%</span>';
          html += '</div>';
        }
        html += '</div>';
      }

      html += '</div>';
    }

    html += '</div>';
    treeEl.innerHTML = html;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
