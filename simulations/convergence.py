"""Central Limit Theorem — Distribution Convergence

Demonstrates the CLT by computing sample means from non-normal
distributions and showing convergence to a gaussian.
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


def gamma_random(shape):
    """Marsaglia and Tsang's method for gamma distribution."""
    if shape < 1:
        return gamma_random(shape + 1) * random.random() ** (1 / shape)
    d = shape - 1 / 3
    c = 1 / math.sqrt(9 * d)
    while True:
        x = gauss()
        v = 1 + c * x
        while v <= 0:
            x = gauss()
            v = 1 + c * x
        v = v ** 3
        u = random.random()
        if u < 1 - 0.0331 * x**4:
            return d * v
        if math.log(u) < 0.5 * x * x + d * (1 - v + math.log(v)):
            return d * v


def beta_random(a, b):
    x = gamma_random(a)
    y = gamma_random(b)
    return x / (x + y)


def poisson_random(lam):
    L = math.exp(-lam)
    k, p = 0, 1.0
    while True:
        k += 1
        p *= random.random()
        if p <= L:
            return k - 1


distributions = {
    "exponential": lambda: -math.log(1 - random.random()),
    "uniform": lambda: random.random(),
    "bimodal": lambda: gauss() - 2 if random.random() < 0.5 else gauss() + 2,
    "chi-squared": lambda: gamma_random(1) + gamma_random(1),
    "log-normal": lambda: math.exp(gauss()),
    "beta": lambda: beta_random(2, 5),
    "poisson": lambda: poisson_random(4),
}


def sample_means(dist_fn, sample_size: int, num_means: int) -> list[float]:
    return [
        sum(dist_fn() for _ in range(sample_size)) / sample_size
        for _ in range(num_means)
    ]


def run(num_means: int = 10_000) -> dict:
    sample_sizes = [1, 2, 5, 10, 30, 50, 100, 200, 500]
    results = {}

    for name, fn in distributions.items():
        print(f"  {name}:")
        results[name] = {}
        for n in sample_sizes:
            means = sample_means(fn, n, num_means)
            mu = sum(means) / len(means)
            std = math.sqrt(sum((m - mu) ** 2 for m in means) / len(means))
            results[name][str(n)] = {
                "mean": round(mu, 6),
                "std": round(std, 6),
                "histogram": [round(m, 4) for m in means[:1000]],
            }
            print(f"    n={n:3d}  μ={mu:.4f}  σ={std:.4f}")

    return results


if __name__ == "__main__":
    num = int(sys.argv[1]) if len(sys.argv) > 1 else 10_000
    random.seed(42)

    print(f"running clt simulation ({num:,} means per config)...")
    result = run(num)

    out = Path(__file__).resolve().parent.parent / "static" / "data"
    out.mkdir(parents=True, exist_ok=True)
    (out / "convergence.json").write_text(json.dumps(result))
    print(f"  saved to {out / 'convergence.json'}")
