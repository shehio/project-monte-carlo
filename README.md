# Project Monte Carlo

Interactive Monte Carlo simulations and stochastic experiments. Live at [projectmontecarlo.com](https://projectmontecarlo.com).

## Architecture

```
Python simulations (source of truth for pre-computed data)
        │
        ▼
  static/data/*.json (pre-computed results)
        │
        ▼
  Hugo static site (content + layouts)
        │
        ▼
  TypeScript visualizations (assets/js, bundled by Hugo)
        │
        ▼
  GitHub Pages (deployment)
```

**Python** scripts in `simulations/` are the canonical implementations for pages with pre-computed data. They generate high-fidelity results saved as JSON to `static/data/`.

**TypeScript** files in `assets/js/` are the visualization and interaction layer, compiled per-page by Hugo's `js.Build` (esbuild). Pages with pre-computed data display it on load; users can also run live simulations directly in the browser. A visual indicator shows whether displayed data is "pre-computed" or "live". Shared logic (cards, poker evaluation, MCTS, math, finance) lives in `assets/js/lib/` and is unit-tested with Jest.

**Hugo** generates the static site from markdown content and HTML templates.

## Pages

### Finance
| Page | Description |
|------|-------------|
| **option pricing** | Monte Carlo vs Black-Scholes European call pricing |
| **exotic options** | Asian, barrier (up-and-out), and lookback — path-dependent pricing |

### Games
| Page | Description |
|------|-------------|
| **blackjack** | 6-deck shoe with Hi-Lo card counting |
| **chess** | MCTS with piece-square evaluation (~1000–1200 Elo) |
| **go** | 9×9 MCTS with random rollouts, Chinese scoring (komi 5.5) |
| **poker** | Texas Hold'em vs 3 AI opponents + Monte Carlo hand equity |
| **craps** | Dice probabilities and house edge simulation |
| **roulette** | Gambler's fallacy — does the wheel have a memory? |
| **prisoner's dilemma** | Iterated strategies, cooperate or defect |
| **solitaire** | Klondike with Monte Carlo win probability |

### Math
| Page | Description |
|------|-------------|
| **π estimation** | Random sampling in the unit square, quarter-circle hit test |
| **convergence** | CLT — sample means converge to normal across 7 distributions |
| **integration** | Monte Carlo area estimation under curves (sin, gaussian, x²) |
| **birthday problem** | Birthday paradox simulation vs theoretical probability |
| **monty hall** | Should you switch doors? |
| **secretary problem** | Optimal stopping — when to stop looking (1/e rule) |

## Running simulations

Generate pre-computed data:

```bash
python3 simulations/pi_estimation.py
python3 simulations/convergence.py
python3 simulations/option_pricing.py
python3 simulations/exotic_options.py
python3 simulations/integration.py
python3 simulations/birthday_problem.py
```

All scripts output JSON to `static/data/`. Pass an optional integer argument to control sample size (e.g., `python3 simulations/pi_estimation.py 5000000`).

## Local development

```bash
hugo server -D
```

Open http://localhost:1313.

Tests, linting, and type checks (requires `npm install` once):

```bash
npm test           # Jest unit tests for assets/js/lib
npm run lint       # ESLint over assets/js
npm run typecheck  # tsc --noEmit
npm run build      # hugo --minify
```

## Deployment

Push to `main` — GitHub Actions runs `hugo --minify` and deploys to GitHub Pages.

## Adding a new example

1. (Optional) Create `simulations/your_sim.py` — output JSON to `static/data/your_sim.json`
2. Create `content/your-page/index.md` with frontmatter `js: "your-page.ts"`
3. Create `assets/js/your-page.ts` — load pre-computed data and/or implement live viz
4. Add a card to `layouts/index.html` and a link to `layouts/partials/nav.html`
5. Verify with `hugo server` and `npm test`, commit

## Project structure

```
content/                    # Markdown pages (one directory per page)
├── _index.md
├── option-pricing/  exotic-options/
├── blackjack/  chess/  go/  poker/  craps/
├── roulette/  prisoners-dilemma/  solitaire/
├── pi-estimation/  convergence/  integration/
└── birthday-problem/  monty-hall/  secretary-problem/

simulations/                # Python (pre-computed data generators)
├── pi_estimation.py  convergence.py
├── option_pricing.py  exotic_options.py
└── integration.py  birthday_problem.py

assets/js/                  # TypeScript, bundled per-page by Hugo js.Build
├── lib/                    # Shared, unit-tested logic
│   ├── cards.ts            # Deck, blackjack totals, poker hand evaluation
│   ├── mcts.ts             # Monte Carlo tree search engine
│   ├── math.ts             # Distributions, shuffle, formatting
│   ├── finance.ts          # Black-Scholes, GBM paths
│   └── pixel-art.ts
└── <page>.ts               # One entry point per page

tests/                      # Jest unit tests for assets/js/lib

static/
├── css/main.css
└── data/*.json             # Pre-computed simulation results

layouts/
├── _default/
│   ├── baseof.html
│   └── single.html
├── index.html
└── partials/
    ├── head.html
    └── nav.html
```
