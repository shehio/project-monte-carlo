# Project Monte Carlo

Interactive Monte Carlo simulations and stochastic experiments. Live at [projectmontecarlo.com](https://projectmontecarlo.com).

## Architecture

```
Python simulations (source of truth)
        │
        ▼
  static/data/*.json (pre-computed results)
        │
        ▼
  Hugo static site (content + layouts)
        │
        ▼
  JavaScript visualizations (interactive layer)
        │
        ▼
  GitHub Pages (deployment)
```

**Python** scripts in `simulations/` are the canonical implementations. They generate high-fidelity results saved as JSON to `static/data/`.

**JavaScript** files in `static/js/` are the visualization layer. On page load, they display pre-computed data from the JSON files. Users can also run live interactive simulations directly in the browser. A visual indicator shows whether displayed data is "pre-computed" or "live".

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

### Math
| Page | Description |
|------|-------------|
| **π estimation** | Random sampling in the unit square, quarter-circle hit test |
| **convergence** | CLT — sample means converge to normal across 7 distributions |
| **integration** | Monte Carlo area estimation under curves (sin, gaussian, x²) |
| **birthday problem** | Birthday paradox simulation vs theoretical probability |

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

## Deployment

Push to `main` — GitHub Actions runs `hugo --minify` and deploys to GitHub Pages.

## Adding a new example

1. Create `simulations/your_sim.py` — output JSON to `static/data/your_sim.json`
2. Create `content/your-page/index.md` with frontmatter `js: "your-page.js"`
3. Create `static/js/your-page.js` — load pre-computed data and implement live viz
4. Add a card to `layouts/index.html` and a link to `layouts/partials/nav.html`
5. Run the simulation, verify with `hugo server`, commit

## Project structure

```
content/                    # Markdown pages
├── _index.md
├── pi-estimation/
├── convergence/
├── option-pricing/
├── exotic-options/
├── blackjack/
├── integration/
└── birthday-problem/

simulations/                # Python (source of truth)
├── pi_estimation.py
├── convergence.py
├── option_pricing.py
├── exotic_options.py
├── integration.py
└── birthday_problem.py

static/
├── css/main.css
├── data/*.json             # Pre-computed simulation results
└── js/                     # Interactive visualizations
    ├── pi-estimation.js
    ├── convergence.js
    ├── option-pricing.js
    ├── exotic-options.js
    ├── blackjack.js
    ├── integration.js
    └── birthday-problem.js

layouts/
├── _default/
│   ├── baseof.html
│   └── single.html
├── index.html
└── partials/
    ├── head.html
    └── nav.html
```
