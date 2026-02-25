// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface MCTSState<M = any> {
  getLegalMoves(): M[];
  applyMove(move: M): void;
  isTerminal(): boolean;
  getResult(player: number): number;
  getCurrentPlayer(): number;
  clone(): MCTSState<M>;
  evaluate?(player: number): number;
}

interface MCTSNode {
  state: MCTSState;
  parent: MCTSNode | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  move: any;
  children: MCTSNode[];
  visits: number;
  wins: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  untriedMoves: any[];
}

function createNode(state: MCTSState, parent: MCTSNode | null, move: unknown): MCTSNode {
  return {
    state,
    parent,
    move,
    children: [],
    visits: 0,
    wins: 0,
    untriedMoves: state.getLegalMoves(),
  };
}

function ucb1(node: MCTSNode, c: number): number {
  if (node.visits === 0) return Infinity;
  return node.wins / node.visits + c * Math.sqrt(Math.log(node.parent!.visits) / node.visits);
}

function bestChild(node: MCTSNode, c: number): MCTSNode | null {
  let best: MCTSNode | null = null;
  let bestVal = -Infinity;
  for (const child of node.children) {
    const val = ucb1(child, c);
    if (val > bestVal) {
      bestVal = val;
      best = child;
    }
  }
  return best;
}

function expand(node: MCTSNode): MCTSNode {
  const idx = Math.floor(Math.random() * node.untriedMoves.length);
  const move = node.untriedMoves.splice(idx, 1)[0];
  const childState = node.state.clone();
  childState.applyMove(move);
  const child = createNode(childState, node, move);
  node.children.push(child);
  return child;
}

function defaultRollout(state: MCTSState, maxDepth: number): MCTSState {
  const s = state.clone();
  let depth = 0;
  while (!s.isTerminal() && depth < maxDepth) {
    const moves = s.getLegalMoves();
    if (moves.length === 0) break;
    s.applyMove(moves[Math.floor(Math.random() * moves.length)]);
    depth++;
  }
  return s;
}

export interface MCTSOptions {
  iterations?: number;
  explorationC?: number;
  rolloutDepth?: number;
  useEval?: boolean;
  rolloutFn?: ((state: MCTSState, maxDepth: number) => MCTSState) | null;
}

export interface MCTSMoveStats {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  move: any;
  visits: number;
  winRate: number;
}

export interface MCTSTreeNode {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  move: any;
  visits: number;
  winRate: number;
  children: MCTSTreeNode[];
}

export interface MCTSResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bestMove: any;
  stats: {
    iterations: number;
    topMoves: MCTSMoveStats[];
    tree: MCTSTreeNode;
  };
}

export function search(state: MCTSState, opts?: MCTSOptions): MCTSResult {
  const iterations = opts?.iterations ?? 1000;
  const explorationC = opts?.explorationC ?? 1.414;
  const rolloutDepth = opts?.rolloutDepth ?? 500;
  const useEval = opts?.useEval ?? false;
  const rolloutFn = opts?.rolloutFn ?? null;
  const rootPlayer = state.getCurrentPlayer();

  const root = createNode(state, null, null);

  for (let i = 0; i < iterations; i++) {
    // Selection
    let node = root;
    while (node.untriedMoves.length === 0 && node.children.length > 0) {
      node = bestChild(node, explorationC)!;
    }

    // Expansion
    if (node.untriedMoves.length > 0 && !node.state.isTerminal()) {
      node = expand(node);
    }

    // Simulation / Evaluation
    let result: number;
    if (useEval && node.state.evaluate) {
      const rolloutState = rolloutFn
        ? rolloutFn(node.state, rolloutDepth)
        : defaultRollout(node.state, rolloutDepth);
      result = rolloutState.isTerminal()
        ? rolloutState.getResult(rootPlayer)
        : rolloutState.evaluate!(rootPlayer);
    } else {
      const rolloutState = rolloutFn
        ? rolloutFn(node.state, rolloutDepth)
        : defaultRollout(node.state, rolloutDepth);
      result = rolloutState.getResult(rootPlayer);
    }

    // Backpropagation
    let n: MCTSNode | null = node;
    while (n !== null) {
      n.visits++;
      if (n.parent) {
        const mover = n.parent.state.getCurrentPlayer();
        n.wins += (mover === rootPlayer) ? result : (1 - result);
      } else {
        n.wins += result;
      }
      n = n.parent;
    }
  }

  // Gather stats
  const topMoves: MCTSMoveStats[] = root.children
    .map(c => ({
      move: c.move,
      visits: c.visits,
      winRate: c.visits > 0 ? (c.wins / c.visits * 100) : 0,
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 8);

  const bestC = bestChild(root, 0);

  // Build tree snapshot
  const tree: MCTSTreeNode = { move: null, visits: root.visits, winRate: 0, children: [] };
  for (const tc of root.children) {
    const tnode: MCTSTreeNode = {
      move: tc.move,
      visits: tc.visits,
      winRate: tc.visits > 0 ? (tc.wins / tc.visits * 100) : 0,
      children: [],
    };
    const grandkids = tc.children.slice().sort((a, b) => b.visits - a.visits);
    for (let gi = 0; gi < Math.min(grandkids.length, 3); gi++) {
      const gc = grandkids[gi];
      tnode.children.push({
        move: gc.move,
        visits: gc.visits,
        winRate: gc.visits > 0 ? (gc.wins / gc.visits * 100) : 0,
        children: [],
      });
    }
    tree.children.push(tnode);
  }
  tree.children.sort((a, b) => b.visits - a.visits);

  return {
    bestMove: bestC ? bestC.move : null,
    stats: { iterations, topMoves, tree },
  };
}
