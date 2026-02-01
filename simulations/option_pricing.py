"""Monte Carlo Option Pricing vs Black-Scholes

Prices a European call option using Monte Carlo simulation of
geometric Brownian motion, and compares to the analytical
Black-Scholes solution.
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


def black_scholes_call(S: float, K: float, T: float, r: float, sigma: float) -> float:
    d1 = (math.log(S / K) + (r + sigma**2 / 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    return S * normal_cdf(d1) - K * math.exp(-r * T) * normal_cdf(d2)


def simulate_gbm(S0: float, r: float, sigma: float, T: float, steps: int) -> list[float]:
    dt = T / steps
    path = [S0]
    for _ in range(steps):
        dW = gauss() * math.sqrt(dt)
        S = path[-1] * math.exp((r - 0.5 * sigma**2) * dt + sigma * dW)
        path.append(S)
    return path


def monte_carlo_price(
    S0: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    num_paths: int,
    steps: int = 252,
) -> dict:
    payoffs = []
    sample_paths = []

    for i in range(num_paths):
        path = simulate_gbm(S0, r, sigma, T, steps)
        payoffs.append(max(path[-1] - K, 0))
        if i < 100:
            sample_paths.append(path[::10])

    mc = math.exp(-r * T) * sum(payoffs) / len(payoffs)
    bs = black_scholes_call(S0, K, T, r, sigma)
    terminals = [p[-1] for p in sample_paths]

    return {
        "mc_price": round(mc, 4),
        "bs_price": round(bs, 4),
        "error": round(abs(mc - bs), 4),
        "num_paths": num_paths,
        "params": {"S0": S0, "K": K, "T": T, "r": r, "sigma": sigma},
        "terminal_values": [round(t, 2) for t in terminals],
        "sample_paths": [[round(s, 2) for s in p] for p in sample_paths[:50]],
    }


if __name__ == "__main__":
    num = int(sys.argv[1]) if len(sys.argv) > 1 else 100_000
    random.seed(42)

    S0, K, T, r, sigma = 100, 100, 1.0, 0.05, 0.2
    print(f"pricing european call (S₀={S0}, K={K}, T={T}, r={r}, σ={sigma})")
    print(f"simulating {num:,} paths...")

    result = monte_carlo_price(S0, K, T, r, sigma, num)

    print(f"  MC price: ${result['mc_price']:.4f}")
    print(f"  BS price: ${result['bs_price']:.4f}")
    print(f"  error:    ${result['error']:.4f}")

    out = Path(__file__).resolve().parent.parent / "static" / "data"
    out.mkdir(parents=True, exist_ok=True)
    (out / "option_pricing.json").write_text(json.dumps(result))
    print(f"  saved to {out / 'option_pricing.json'}")
