// Generic Monte Carlo Tree Search engine
// Games implement: getLegalMoves(), applyMove(move), isTerminal(), getResult(player),
//                  getCurrentPlayer(), clone(), evaluate(player) [optional]
window.MCTS = (function () {
  'use strict';

  function Node(state, parent, move) {
    this.state = state;
    this.parent = parent;
    this.move = move;
    this.children = [];
    this.visits = 0;
    this.wins = 0;
    this.untriedMoves = state.getLegalMoves();
  }

  Node.prototype.ucb1 = function (c) {
    if (this.visits === 0) return Infinity;
    return this.wins / this.visits + c * Math.sqrt(Math.log(this.parent.visits) / this.visits);
  };

  Node.prototype.bestChild = function (c) {
    var best = null;
    var bestVal = -Infinity;
    for (var i = 0; i < this.children.length; i++) {
      var val = this.children[i].ucb1(c);
      if (val > bestVal) {
        bestVal = val;
        best = this.children[i];
      }
    }
    return best;
  };

  Node.prototype.expand = function () {
    var idx = Math.floor(Math.random() * this.untriedMoves.length);
    var move = this.untriedMoves.splice(idx, 1)[0];
    var childState = this.state.clone();
    childState.applyMove(move);
    var child = new Node(childState, this, move);
    this.children.push(child);
    return child;
  };

  function defaultRollout(state, maxDepth) {
    var s = state.clone();
    var depth = 0;
    while (!s.isTerminal() && depth < maxDepth) {
      var moves = s.getLegalMoves();
      if (moves.length === 0) break;
      s.applyMove(moves[Math.floor(Math.random() * moves.length)]);
      depth++;
    }
    return s;
  }

  function search(state, opts) {
    opts = opts || {};
    var iterations = opts.iterations || 1000;
    var explorationC = opts.explorationC != null ? opts.explorationC : 1.414;
    var rolloutDepth = opts.rolloutDepth || 500;
    var useEval = opts.useEval || false;
    var rolloutFn = opts.rolloutFn || null;
    var rootPlayer = state.getCurrentPlayer();

    var root = new Node(state, null, null);

    for (var i = 0; i < iterations; i++) {
      // Selection
      var node = root;
      while (node.untriedMoves.length === 0 && node.children.length > 0) {
        node = node.bestChild(explorationC);
      }

      // Expansion
      if (node.untriedMoves.length > 0 && !node.state.isTerminal()) {
        node = node.expand();
      }

      // Simulation / Evaluation
      var result;
      if (useEval && node.state.evaluate) {
        // Hybrid: short rollout then evaluate
        var rolloutState;
        if (rolloutFn) {
          rolloutState = rolloutFn(node.state, rolloutDepth);
        } else {
          rolloutState = defaultRollout(node.state, rolloutDepth);
        }
        if (rolloutState.isTerminal()) {
          result = rolloutState.getResult(rootPlayer);
        } else {
          result = rolloutState.evaluate(rootPlayer);
        }
      } else {
        var rolloutState2;
        if (rolloutFn) {
          rolloutState2 = rolloutFn(node.state, rolloutDepth);
        } else {
          rolloutState2 = defaultRollout(node.state, rolloutDepth);
        }
        result = rolloutState2.getResult(rootPlayer);
      }

      // Backpropagation — each node stores wins from the perspective of the
      // player who MADE the move leading to it (parent's current player).
      // This way UCB1 always selects the child best for the selecting player.
      var n = node;
      while (n !== null) {
        n.visits++;
        if (n.parent) {
          var mover = n.parent.state.getCurrentPlayer();
          n.wins += (mover === rootPlayer) ? result : (1 - result);
        } else {
          n.wins += result;
        }
        n = n.parent;
      }
    }

    // Gather stats
    var topMoves = [];
    for (var j = 0; j < root.children.length; j++) {
      var c = root.children[j];
      topMoves.push({
        move: c.move,
        visits: c.visits,
        winRate: c.visits > 0 ? (c.wins / c.visits * 100) : 0
      });
    }
    topMoves.sort(function (a, b) { return b.visits - a.visits; });

    var bestChild = root.bestChild(0); // Most visited = best move (exploitation only)
    return {
      bestMove: bestChild ? bestChild.move : null,
      stats: {
        iterations: iterations,
        topMoves: topMoves.slice(0, 8)
      }
    };
  }

  return { search: search };
})();
