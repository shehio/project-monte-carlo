// Go (9x9) with MCTS AI
(function () {
  'use strict';

  var SIZE = 9;
  var EMPTY = 0, BLACK = 1, WHITE = 2;
  var KOMI = 5.5;

  // ── Game State ──

  function GoState() {
    this.board = new Int8Array(SIZE * SIZE);
    this.current = BLACK;
    this.koPoint = -1; // forbidden point for ko
    this.passes = 0;
    this.moveHistory = [];
    this.capturedByBlack = 0; // stones black captured
    this.capturedByWhite = 0;
  }

  GoState.prototype.idx = function (r, c) { return r * SIZE + c; };
  GoState.prototype.rc = function (i) { return [Math.floor(i / SIZE), i % SIZE]; };

  GoState.prototype.clone = function () {
    var s = new GoState();
    s.board = new Int8Array(this.board);
    s.current = this.current;
    s.koPoint = this.koPoint;
    s.passes = this.passes;
    s.capturedByBlack = this.capturedByBlack;
    s.capturedByWhite = this.capturedByWhite;
    s.moveHistory = this.moveHistory.slice();
    return s;
  };

  GoState.prototype.opponent = function (c) { return c === BLACK ? WHITE : BLACK; };

  GoState.prototype.neighbors = function (i) {
    var rc = this.rc(i), r = rc[0], c = rc[1], n = [];
    if (r > 0) n.push(this.idx(r - 1, c));
    if (r < SIZE - 1) n.push(this.idx(r + 1, c));
    if (c > 0) n.push(this.idx(r, c - 1));
    if (c < SIZE - 1) n.push(this.idx(r, c + 1));
    return n;
  };

  GoState.prototype.getGroup = function (i) {
    var color = this.board[i];
    if (color === EMPTY) return { stones: [], liberties: 0 };
    var visited = {};
    var stack = [i];
    var stones = [];
    var liberties = {};
    while (stack.length > 0) {
      var cur = stack.pop();
      if (visited[cur]) continue;
      visited[cur] = true;
      stones.push(cur);
      var nb = this.neighbors(cur);
      for (var j = 0; j < nb.length; j++) {
        var n = nb[j];
        if (this.board[n] === EMPTY) {
          liberties[n] = true;
        } else if (this.board[n] === color && !visited[n]) {
          stack.push(n);
        }
      }
    }
    return { stones: stones, liberties: Object.keys(liberties).length };
  };

  GoState.prototype.removeGroup = function (stones) {
    for (var i = 0; i < stones.length; i++) {
      this.board[stones[i]] = EMPTY;
    }
    return stones.length;
  };

  GoState.prototype.isLegalMove = function (pos) {
    if (pos === -1) return true; // pass
    if (this.board[pos] !== EMPTY) return false;
    if (pos === this.koPoint) return false;

    // Try placing
    this.board[pos] = this.current;
    var opp = this.opponent(this.current);

    // Check captures
    var captured = 0;
    var nb = this.neighbors(pos);
    for (var i = 0; i < nb.length; i++) {
      if (this.board[nb[i]] === opp) {
        var g = this.getGroup(nb[i]);
        if (g.liberties === 0) captured += g.stones.length;
      }
    }

    // Check self-capture (suicide)
    if (captured === 0) {
      var self = this.getGroup(pos);
      if (self.liberties === 0) {
        this.board[pos] = EMPTY;
        return false;
      }
    }

    this.board[pos] = EMPTY;
    return true;
  };

  GoState.prototype.applyMove = function (pos) {
    if (pos === -1) {
      // Pass
      this.passes++;
      this.current = this.opponent(this.current);
      this.koPoint = -1;
      this.moveHistory.push(-1);
      return;
    }

    this.passes = 0;
    this.board[pos] = this.current;
    var opp = this.opponent(this.current);

    // Capture opponent groups with no liberties
    var totalCaptured = 0;
    var capturedStones = [];
    var nb = this.neighbors(pos);
    for (var i = 0; i < nb.length; i++) {
      if (this.board[nb[i]] === opp) {
        var g = this.getGroup(nb[i]);
        if (g.liberties === 0) {
          totalCaptured += this.removeGroup(g.stones);
          capturedStones = capturedStones.concat(g.stones);
        }
      }
    }

    if (this.current === BLACK) this.capturedByBlack += totalCaptured;
    else this.capturedByWhite += totalCaptured;

    // Ko detection: if exactly 1 stone captured and placed stone has 1 liberty
    if (totalCaptured === 1) {
      var selfGroup = this.getGroup(pos);
      if (selfGroup.stones.length === 1 && selfGroup.liberties === 1) {
        this.koPoint = capturedStones[0];
      } else {
        this.koPoint = -1;
      }
    } else {
      this.koPoint = -1;
    }

    this.moveHistory.push(pos);
    this.current = opp;
  };

  GoState.prototype.getLegalMoves = function () {
    var moves = [];
    for (var i = 0; i < SIZE * SIZE; i++) {
      if (this.isLegalMove(i)) moves.push(i);
    }
    moves.push(-1); // pass is always legal
    return moves;
  };

  GoState.prototype.isTerminal = function () {
    return this.passes >= 2;
  };

  // Chinese area scoring
  GoState.prototype.score = function () {
    var blackTerritory = 0, whiteTerritory = 0;
    var blackStones = 0, whiteStones = 0;
    var visited = {};

    for (var i = 0; i < SIZE * SIZE; i++) {
      if (this.board[i] === BLACK) blackStones++;
      else if (this.board[i] === WHITE) whiteStones++;
    }

    // Flood fill empty areas to determine territory
    for (var j = 0; j < SIZE * SIZE; j++) {
      if (this.board[j] !== EMPTY || visited[j]) continue;
      var stack = [j];
      var area = [];
      var touchesBlack = false, touchesWhite = false;
      while (stack.length > 0) {
        var cur = stack.pop();
        if (visited[cur]) continue;
        visited[cur] = true;
        area.push(cur);
        var nb = this.neighbors(cur);
        for (var k = 0; k < nb.length; k++) {
          if (this.board[nb[k]] === EMPTY && !visited[nb[k]]) {
            stack.push(nb[k]);
          } else if (this.board[nb[k]] === BLACK) {
            touchesBlack = true;
          } else if (this.board[nb[k]] === WHITE) {
            touchesWhite = true;
          }
        }
      }
      if (touchesBlack && !touchesWhite) blackTerritory += area.length;
      else if (touchesWhite && !touchesBlack) whiteTerritory += area.length;
    }

    return {
      black: blackStones + blackTerritory,
      white: whiteStones + whiteTerritory + KOMI
    };
  };

  GoState.prototype.getResult = function (player) {
    var s = this.score();
    if (player === BLACK) return s.black > s.white ? 1 : 0;
    return s.white > s.black ? 1 : 0;
  };

  GoState.prototype.getCurrentPlayer = function () { return this.current; };

  GoState.prototype.evaluate = function (player) {
    return this.getResult(player);
  };

  // ── Rollout with "don't fill own eyes" heuristic ──

  function goRollout(state, maxDepth) {
    var s = state.clone();
    var depth = 0;
    while (!s.isTerminal() && depth < maxDepth) {
      var moves = [];
      for (var i = 0; i < SIZE * SIZE; i++) {
        if (s.isLegalMove(i) && !isOwnEye(s, i, s.current)) {
          moves.push(i);
        }
      }
      if (moves.length === 0) {
        s.applyMove(-1); // pass
      } else {
        s.applyMove(moves[Math.floor(Math.random() * moves.length)]);
      }
      depth++;
    }
    return s;
  }

  function isOwnEye(state, pos, color) {
    var nb = state.neighbors(pos);
    // All neighbors must be same color
    for (var i = 0; i < nb.length; i++) {
      if (state.board[nb[i]] !== color) return false;
    }
    // At least 3 of 4 diagonals must be same color (or edge)
    var rc = state.rc(pos);
    var r = rc[0], c = rc[1];
    var diags = [];
    if (r > 0 && c > 0) diags.push(state.idx(r - 1, c - 1));
    if (r > 0 && c < SIZE - 1) diags.push(state.idx(r - 1, c + 1));
    if (r < SIZE - 1 && c > 0) diags.push(state.idx(r + 1, c - 1));
    if (r < SIZE - 1 && c < SIZE - 1) diags.push(state.idx(r + 1, c + 1));
    var bad = 0;
    for (var j = 0; j < diags.length; j++) {
      if (state.board[diags[j]] !== color) bad++;
    }
    var isEdge = r === 0 || r === SIZE - 1 || c === 0 || c === SIZE - 1;
    return isEdge ? bad === 0 : bad <= 1;
  }

  // ── Board Rendering ──

  var canvas, ctx;
  var PADDING = 30;
  var cellSize;
  var gameState;
  var gameOver = false;
  var aiThinking = false;
  var hoverPos = -1;
  var lastMove = -1;
  var playerColor = BLACK;
  var statsEl, messageEl, scoreEl, passBtn, newGameBtn, resignBtn;
  var iterationsInput, depthInput;

  function init() {
    canvas = document.getElementById('go-board');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    statsEl = document.getElementById('mcts-stats');
    messageEl = document.getElementById('go-message');
    scoreEl = document.getElementById('go-score');
    passBtn = document.getElementById('go-pass');
    newGameBtn = document.getElementById('go-new');
    resignBtn = document.getElementById('go-resign');
    iterationsInput = document.getElementById('go-iterations');
    depthInput = document.getElementById('go-depth');

    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousemove', onCanvasMove);
    canvas.addEventListener('mouseleave', function () { hoverPos = -1; draw(); });
    passBtn.addEventListener('click', onPass);
    newGameBtn.addEventListener('click', newGame);
    resignBtn.addEventListener('click', onResign);

    newGame();
    // Defer resize to ensure layout is computed
    requestAnimationFrame(function () {
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
    });
  }

  function resizeCanvas() {
    var container = canvas.parentElement;
    var w = container.clientWidth;
    if (w < 100) w = 560;
    w = Math.min(w, 560);
    canvas.width = w;
    canvas.height = w;
    cellSize = (w - 2 * PADDING) / (SIZE - 1);
    draw();
  }

  function newGame() {
    gameState = new GoState();
    gameOver = false;
    aiThinking = false;
    lastMove = -1;
    hoverPos = -1;
    messageEl.textContent = 'black to play';
    messageEl.className = '';
    scoreEl.textContent = '';
    statsEl.innerHTML = '';
    draw();
  }

  function boardToPixel(r, c) {
    return {
      x: PADDING + c * cellSize,
      y: PADDING + r * cellSize
    };
  }

  function pixelToBoard(x, y) {
    var c = Math.round((x - PADDING) / cellSize);
    var r = Math.round((y - PADDING) / cellSize);
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return -1;
    return gameState.idx(r, c);
  }

  function draw() {
    if (!ctx || !gameState) return;
    var w = canvas.width;

    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, w);

    // Grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (var i = 0; i < SIZE; i++) {
      var p0 = boardToPixel(i, 0);
      var p1 = boardToPixel(i, SIZE - 1);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      var q0 = boardToPixel(0, i);
      var q1 = boardToPixel(SIZE - 1, i);
      ctx.beginPath();
      ctx.moveTo(q0.x, q0.y);
      ctx.lineTo(q1.x, q1.y);
      ctx.stroke();
    }

    // Star points (hoshi)
    var starPoints = SIZE === 9 ? [[2,2],[2,6],[6,2],[6,6],[4,4]] : [];
    ctx.fillStyle = '#444';
    for (var s = 0; s < starPoints.length; s++) {
      var sp = boardToPixel(starPoints[s][0], starPoints[s][1]);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Coordinate labels
    ctx.fillStyle = '#444';
    ctx.font = (cellSize * 0.32) + 'px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var colLabels = 'ABCDEFGHJ'; // I is skipped in Go
    for (var ci = 0; ci < SIZE; ci++) {
      var px = boardToPixel(0, ci);
      ctx.fillText(colLabels[ci], px.x, PADDING * 0.45);
      ctx.fillText(colLabels[ci], px.x, canvas.height - PADDING * 0.45);
    }
    for (var ri = 0; ri < SIZE; ri++) {
      var py = boardToPixel(ri, 0);
      ctx.fillText(String(SIZE - ri), PADDING * 0.4, py.y);
      ctx.fillText(String(SIZE - ri), canvas.width - PADDING * 0.4, py.y);
    }

    var stoneRadius = cellSize * 0.43;

    // Hover preview
    if (hoverPos >= 0 && !gameOver && !aiThinking && gameState.current === playerColor) {
      var hr = gameState.rc(hoverPos);
      var hp = boardToPixel(hr[0], hr[1]);
      if (gameState.board[hoverPos] === EMPTY && gameState.isLegalMove(hoverPos)) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = playerColor === BLACK ? '#fff' : '#ddd';
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, stoneRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Stones
    for (var b = 0; b < SIZE * SIZE; b++) {
      if (gameState.board[b] === EMPTY) continue;
      var brc = gameState.rc(b);
      var bp = boardToPixel(brc[0], brc[1]);

      if (gameState.board[b] === BLACK) {
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.arc(bp.x, bp.y, stoneRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#222';
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bp.x, bp.y, stoneRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Last move marker
    if (lastMove >= 0 && gameState.board[lastMove] !== EMPTY) {
      var lr = gameState.rc(lastMove);
      var lp = boardToPixel(lr[0], lr[1]);
      ctx.fillStyle = gameState.board[lastMove] === BLACK ? '#111' : '#aaa';
      ctx.beginPath();
      ctx.arc(lp.x, lp.y, stoneRadius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function onCanvasMove(e) {
    if (gameOver || aiThinking || gameState.current !== playerColor) return;
    var rect = canvas.getBoundingClientRect();
    var scale = canvas.width / rect.width;
    var x = (e.clientX - rect.left) * scale;
    var y = (e.clientY - rect.top) * scale;
    var newHover = pixelToBoard(x, y);
    if (newHover !== hoverPos) {
      hoverPos = newHover;
      draw();
    }
  }

  function onCanvasClick(e) {
    if (gameOver || aiThinking || gameState.current !== playerColor) return;
    var rect = canvas.getBoundingClientRect();
    var scale = canvas.width / rect.width;
    var x = (e.clientX - rect.left) * scale;
    var y = (e.clientY - rect.top) * scale;
    var pos = pixelToBoard(x, y);
    if (pos < 0) return;
    if (!gameState.isLegalMove(pos)) return;

    gameState.applyMove(pos);
    lastMove = pos;
    hoverPos = -1;
    draw();

    if (gameState.isTerminal()) {
      endGame();
      return;
    }

    aiTurn();
  }

  function onPass() {
    if (gameOver || aiThinking || gameState.current !== playerColor) return;
    gameState.applyMove(-1);
    lastMove = -1;
    messageEl.textContent = 'you passed';
    draw();

    if (gameState.isTerminal()) {
      endGame();
      return;
    }

    aiTurn();
  }

  function onResign() {
    if (gameOver || aiThinking) return;
    gameOver = true;
    messageEl.textContent = 'you resigned — white wins';
    messageEl.className = 'loss';
  }

  function aiTurn() {
    aiThinking = true;
    messageEl.textContent = 'thinking...';
    passBtn.disabled = true;
    resignBtn.disabled = true;

    setTimeout(function () {
      var iters = iterationsInput ? parseInt(iterationsInput.value) || 5000 : 5000;
      var depth = depthInput ? parseInt(depthInput.value) || 200 : 200;
      var result = MCTS.search(gameState, {
        iterations: iters,
        explorationC: 1.414,
        rolloutDepth: depth,
        rolloutFn: goRollout
      });

      if (result.bestMove === null || result.bestMove === -1) {
        gameState.applyMove(-1);
        lastMove = -1;
        messageEl.textContent = 'ai passed';
      } else {
        gameState.applyMove(result.bestMove);
        lastMove = result.bestMove;
        var rc = gameState.rc(result.bestMove);
        var colLabels = 'ABCDEFGHJ';
        messageEl.textContent = 'ai played ' + colLabels[rc[1]] + (SIZE - rc[0]);
      }

      updateStats(result.stats);
      aiThinking = false;
      passBtn.disabled = false;
      resignBtn.disabled = false;
      draw();

      if (gameState.isTerminal()) {
        endGame();
      }
    }, 50);
  }

  function endGame() {
    gameOver = true;
    var s = gameState.score();
    scoreEl.textContent = 'black ' + s.black.toFixed(1) + ' — white ' + s.white.toFixed(1);
    if (s.black > s.white) {
      messageEl.textContent = 'black wins by ' + (s.black - s.white).toFixed(1);
      messageEl.className = playerColor === BLACK ? '' : 'loss';
    } else {
      messageEl.textContent = 'white wins by ' + (s.white - s.black).toFixed(1);
      messageEl.className = playerColor === WHITE ? '' : 'loss';
    }
  }

  function updateStats(stats) {
    var colLabels = 'ABCDEFGHJ';
    var html = '<div class="mcts-header">mcts search · ' + stats.iterations.toLocaleString() + ' iterations</div>';
    var maxVisits = stats.topMoves.length > 0 ? stats.topMoves[0].visits : 1;
    for (var i = 0; i < Math.min(stats.topMoves.length, 6); i++) {
      var m = stats.topMoves[i];
      var label;
      if (m.move === -1) {
        label = 'pass';
      } else {
        var rc = gameState.rc(m.move);
        label = colLabels[rc[1]] + (SIZE - rc[0]);
      }
      var barWidth = Math.max(2, (m.visits / maxVisits) * 100);
      html += '<div class="mcts-move">' +
        '<span class="mcts-label">' + label.padEnd(4) + '</span>' +
        '<span class="mcts-visits">' + m.visits + '</span>' +
        '<span class="mcts-bar"><span style="width:' + barWidth + '%"></span></span>' +
        '<span class="mcts-wr">' + m.winRate.toFixed(1) + '%</span>' +
        '</div>';
    }
    statsEl.innerHTML = html;

    // Render tree visualization
    if (stats.tree) renderTree(stats.tree, colLabels);
  }

  function goMoveLabel(move, colLabels) {
    if (move === -1) return 'pass';
    var rc = gameState.rc(move);
    return colLabels[rc[1]] + (SIZE - rc[0]);
  }

  function renderTree(tree, colLabels) {
    var container = document.getElementById('mcts-tree');
    if (!container) return;

    var children = tree.children.slice(0, 5);
    if (children.length === 0) {
      container.innerHTML = '';
      return;
    }

    var tc = container.querySelector('canvas');
    if (!tc) {
      container.innerHTML = '<div class="tree-header">search tree</div><canvas></canvas>';
      tc = container.querySelector('canvas');
    } else {
      container.querySelector('.tree-header').textContent = 'search tree';
    }

    var cw = container.clientWidth || 460;
    var dpr = window.devicePixelRatio || 1;
    var nodeR = 22;
    var levelGap = 80;
    var topPad = 30;
    var botPad = 20;

    var maxGC = 0;
    for (var ci = 0; ci < children.length; ci++) {
      var gcLen = children[ci].children ? children[ci].children.length : 0;
      if (gcLen > maxGC) maxGC = gcLen;
    }
    var levels = maxGC > 0 ? 3 : 2;
    var ch = topPad + levels * levelGap + botPad;

    tc.style.width = cw + 'px';
    tc.style.height = ch + 'px';
    tc.width = cw * dpr;
    tc.height = ch * dpr;

    var tx = tc.getContext('2d');
    tx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tx.clearRect(0, 0, cw, ch);

    var rootX = cw / 2;
    var rootY = topPad + nodeR;
    var n1 = children.length;
    var spacing1 = cw / (n1 + 1);
    var l1Nodes = [];
    for (var i = 0; i < n1; i++) {
      l1Nodes.push({ x: spacing1 * (i + 1), y: rootY + levelGap, data: children[i], isBest: i === 0 });
    }

    tx.lineWidth = 1.5;
    for (var e1 = 0; e1 < l1Nodes.length; e1++) {
      var nd = l1Nodes[e1];
      tx.strokeStyle = nd.isBest ? '#00d4aa' : '#333';
      tx.beginPath();
      tx.moveTo(rootX, rootY + nodeR);
      tx.lineTo(nd.x, nd.y - nodeR);
      tx.stroke();
    }

    var l2Nodes = [];
    for (var c1 = 0; c1 < l1Nodes.length; c1++) {
      var parent = l1Nodes[c1];
      var gcs = parent.data.children || [];
      if (gcs.length === 0) continue;
      var gcSpan = Math.min(spacing1 * 0.8, gcs.length * 50);
      var gcStart = parent.x - gcSpan / 2;
      var gcStep = gcs.length > 1 ? gcSpan / (gcs.length - 1) : 0;
      for (var g = 0; g < gcs.length; g++) {
        var gx = gcs.length === 1 ? parent.x : gcStart + gcStep * g;
        var gy = parent.y + levelGap;
        tx.strokeStyle = '#2a2a2a';
        tx.lineWidth = 1;
        tx.beginPath();
        tx.moveTo(parent.x, parent.y + nodeR);
        tx.lineTo(gx, gy - nodeR);
        tx.stroke();
        l2Nodes.push({ x: gx, y: gy, data: gcs[g], isBest: false });
      }
    }

    drawGoNode(tx, rootX, rootY, nodeR, 'root', tree.visits, null, true, false);
    for (var d1 = 0; d1 < l1Nodes.length; d1++) {
      var n = l1Nodes[d1];
      drawGoNode(tx, n.x, n.y, nodeR, goMoveLabel(n.data.move, colLabels),
                 n.data.visits, n.data.winRate, false, n.isBest);
    }
    var smallR = 16;
    for (var d2 = 0; d2 < l2Nodes.length; d2++) {
      var n2 = l2Nodes[d2];
      drawGoNode(tx, n2.x, n2.y, smallR, goMoveLabel(n2.data.move, colLabels),
                 n2.data.visits, n2.data.winRate, false, false);
    }
  }

  function drawGoNode(tx, x, y, r, label, visits, winRate, isRoot, isBest) {
    tx.beginPath();
    tx.arc(x, y, r, 0, Math.PI * 2);
    if (isRoot) { tx.fillStyle = '#1a1a1a'; tx.strokeStyle = '#00d4aa'; tx.lineWidth = 2; }
    else if (isBest) { tx.fillStyle = '#0a2a22'; tx.strokeStyle = '#00d4aa'; tx.lineWidth = 2; }
    else { tx.fillStyle = '#1a1a1a'; tx.strokeStyle = '#333'; tx.lineWidth = 1.5; }
    tx.fill(); tx.stroke();

    var fs = r > 18 ? 10 : 8;
    tx.font = fs + 'px JetBrains Mono, monospace';
    tx.textAlign = 'center';
    tx.fillStyle = isBest ? '#00d4aa' : '#888';
    tx.fillText(label, x, y - r - 4);

    tx.fillStyle = '#c8c8c8';
    tx.font = 'bold ' + fs + 'px JetBrains Mono, monospace';
    tx.textBaseline = 'middle';
    if (isRoot) {
      tx.fillText(shortGoNum(visits), x, y);
    } else {
      tx.fillText(shortGoNum(visits), x, y - 3);
      tx.font = (r > 18 ? 9 : 7) + 'px JetBrains Mono, monospace';
      tx.fillStyle = winRate >= 50 ? '#00d4aa' : '#e84057';
      tx.fillText(winRate.toFixed(0) + '%', x, y + (r > 18 ? 9 : 7));
    }
    tx.textBaseline = 'alphabetic';
  }

  function shortGoNum(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  // String.prototype.padEnd polyfill
  if (!String.prototype.padEnd) {
    String.prototype.padEnd = function (len, ch) {
      ch = ch || ' ';
      var s = String(this);
      while (s.length < len) s += ch;
      return s;
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
