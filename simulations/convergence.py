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


distributions = {
    "exponential": lambda: -math.log(1 - random.random()),
    "uniform": lambda: random.random(),
    "bimodal": lambda: gauss() - 2 if random.random() < 0.5 else gauss() + 2,
}


def sample_means(dist_fn, sample_size: int, num_means: int) -> list[float]:
    return [
        sum(dist_fn() for _ in range(sample_size)) / sample_size
        for _ in range(num_means)
    ]


def run(num_means: int = 10_000) -> dict:
    sample_sizes = [1, 2, 5, 10, 30, 50, 100]
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
