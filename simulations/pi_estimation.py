"""Monte Carlo Pi Estimation

Estimates π by sampling random points in the unit square and checking
whether they fall inside the inscribed quarter circle.
"""

import json
import random
import sys
from pathlib import Path


def estimate_pi(n: int) -> dict:
    inside = 0
    convergence = []
    step = max(1, n // 200)

    for i in range(1, n + 1):
        x = random.random()
        y = random.random()
        if x * x + y * y <= 1:
            inside += 1
        if i % step == 0:
            convergence.append({"n": i, "pi": 4 * inside / i})

    pi_est = 4 * inside / n
    return {
        "total": n,
        "inside": inside,
        "pi_estimate": pi_est,
        "error": abs(pi_est - 3.141592653589793),
        "convergence": convergence,
    }


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1_000_000
    random.seed(42)

    print(f"estimating π with {n:,} points...")
    result = estimate_pi(n)

    print(f"  π ≈ {result['pi_estimate']:.6f}")
    print(f"  error: {result['error']:.6f}")

    out = Path(__file__).resolve().parent.parent / "static" / "data"
    out.mkdir(parents=True, exist_ok=True)
    (out / "pi_estimation.json").write_text(json.dumps(result))
    print(f"  saved to {out / 'pi_estimation.json'}")
