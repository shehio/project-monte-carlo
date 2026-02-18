"""Exotic Option Pricing — Monte Carlo

Prices exotic options that have no closed-form solution:
- Asian (arithmetic average price)
- Barrier (up-and-out knock-out)
- Lookback (floating strike)

All priced via GBM path simulation.
"""

import json
import math
import random
import sys
from pathlib import Path


def gauss():
    u, v, s = 0.0, 0.0, 0.0
    while s >= 1 or s == 0:
        u = random.random() * 2 - 1
        v = random.random() * 2 - 1
        s = u * u + v * v
    return u * math.sqrt(-2 * math.log(s) / s)


def normal_cdf(x: float) -> float:
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def black_scholes_call(S, K, T, r, sigma):
    d1 = (math.log(S / K) + (r + sigma**2 / 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    return S * normal_cdf(d1) - K * math.exp(-r * T) * normal_cdf(d2)


def simulate_gbm(S0, r, sigma, T, steps):
    dt = T / steps
    path = [S0]
    for _ in range(steps):
        dW = gauss() * math.sqrt(dt)
        S = path[-1] * math.exp((r - 0.5 * sigma**2) * dt + sigma * dW)
        path.append(S)
    return path


def price_all(S0, K, T, r, sigma, barrier, num_paths, steps=252):
    asian_payoffs = []
    barrier_payoffs = []
    lookback_payoffs = []
    sample_paths = []

    for i in range(num_paths):
        path = simulate_gbm(S0, r, sigma, T, steps)

        # Asian call: payoff = max(avg(S) - K, 0)
        avg_price = sum(path) / len(path)
        asian_payoffs.append(max(avg_price - K, 0))

        # Barrier (up-and-out call): payoff = max(S_T - K, 0) if max(S) < barrier, else 0
        max_price = max(path)
        if max_price >= barrier:
            barrier_payoffs.append(0.0)
        else:
            barrier_payoffs.append(max(path[-1] - K, 0))

        # Lookback (floating strike call): payoff = S_T - min(S)
        min_price = min(path)
        lookback_payoffs.append(path[-1] - min_price)

        if i < 100:
            sample_paths.append(path[::10])

    discount = math.exp(-r * T)
    asian_price = discount * sum(asian_payoffs) / len(asian_payoffs)
    barrier_price = discount * sum(barrier_payoffs) / len(barrier_payoffs)
    lookback_price = discount * sum(lookback_payoffs) / len(lookback_payoffs)
    vanilla_price = black_scholes_call(S0, K, T, r, sigma)

    # convergence data: price vs num_paths
    convergence = {"asian": [], "barrier": [], "lookback": []}
    step_size = max(1, num_paths // 200)
    a_sum, b_sum, l_sum = 0.0, 0.0, 0.0
    for i in range(num_paths):
        a_sum += asian_payoffs[i]
        b_sum += barrier_payoffs[i]
        l_sum += lookback_payoffs[i]
        if (i + 1) % step_size == 0:
            n = i + 1
            convergence["asian"].append({"n": n, "price": round(discount * a_sum / n, 4)})
            convergence["barrier"].append({"n": n, "price": round(discount * b_sum / n, 4)})
            convergence["lookback"].append({"n": n, "price": round(discount * l_sum / n, 4)})

    return {
        "params": {"S0": S0, "K": K, "T": T, "r": r, "sigma": sigma, "barrier": barrier},
        "num_paths": num_paths,
        "vanilla_bs": round(vanilla_price, 4),
        "asian": round(asian_price, 4),
        "barrier_uo": round(barrier_price, 4),
        "lookback": round(lookback_price, 4),
        "convergence": convergence,
        "sample_paths": [[round(s, 2) for s in p] for p in sample_paths[:50]],
    }


if __name__ == "__main__":
    num = int(sys.argv[1]) if len(sys.argv) > 1 else 100_000
    random.seed(42)

    S0, K, T, r, sigma = 100, 100, 1.0, 0.05, 0.2
    barrier = 130

    print(f"pricing exotic options (S₀={S0}, K={K}, T={T}, r={r}, σ={sigma}, B={barrier})")
    print(f"simulating {num:,} paths...")

    result = price_all(S0, K, T, r, sigma, barrier, num)

    print(f"  vanilla BS:   ${result['vanilla_bs']:.4f}")
    print(f"  asian call:   ${result['asian']:.4f}")
    print(f"  barrier U&O:  ${result['barrier_uo']:.4f}")
    print(f"  lookback:     ${result['lookback']:.4f}")

    out = Path(__file__).resolve().parent.parent / "static" / "data"
    out.mkdir(parents=True, exist_ok=True)
    (out / "exotic_options.json").write_text(json.dumps(result))
    print(f"  saved to {out / 'exotic_options.json'}")
