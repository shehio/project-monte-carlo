"""Monte Carlo Integration

Estimate definite integrals by random sampling under the curve.
"""

import json
import math
import random
import sys
from pathlib import Path


FUNCTIONS = {
    "sin": {
        "fn": math.sin,
        "range": [0, math.pi],
        "y_max": 1.0,
        "exact": 2.0,
        "label": "sin(x) on [0, π]",
    },
    "gaussian": {
        "fn": lambda x: math.exp(-(x**2)),
        "range": [0, 2],
        "y_max": 1.0,
        "exact": 0.8820813907624215,  # erf(2) * sqrt(pi) / 2
        "label": "e^(-x²) on [0, 2]",
    },
    "quadratic": {
        "fn": lambda x: x**2,
        "range": [0, 1],
        "y_max": 1.0,
        "exact": 1 / 3,
        "label": "x² on [0, 1]",
    },
}


def integrate(name: str, num_samples: int) -> dict:
    spec = FUNCTIONS[name]
    fn = spec["fn"]
    a, b = spec["range"]
    y_max = spec["y_max"]

    under = 0
    convergence = []
    sample_points = []
    step = max(1, num_samples // 200)

    for i in range(1, num_samples + 1):
        x = a + random.random() * (b - a)
        y = random.random() * y_max
        fx = fn(x)
        below = y <= fx

        if below:
            under += 1

        if i <= 2000:
            sample_points.append({
                "x": round(x, 4),
                "y": round(y, 4),
                "below": below,
            })

        if i % step == 0:
            area_est = (under / i) * (b - a) * y_max
            convergence.append({"n": i, "estimate": round(area_est, 6)})

    area = (under / num_samples) * (b - a) * y_max
    return {
        "function": name,
        "label": spec["label"],
        "range": spec["range"],
        "y_max": y_max,
        "total": num_samples,
        "under": under,
        "estimate": round(area, 6),
        "exact": round(spec["exact"], 6),
        "error": round(abs(area - spec["exact"]), 6),
        "convergence": convergence,
        "sample_points": sample_points,
    }


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1_000_000
    random.seed(42)

    results = {}
    for name in FUNCTIONS:
        print(f"integrating {FUNCTIONS[name]['label']} ({n:,} samples)...")
        result = integrate(name, n)
        results[name] = result
        print(f"  estimate: {result['estimate']:.6f}")
        print(f"  exact:    {result['exact']:.6f}")
        print(f"  error:    {result['error']:.6f}")

    out = Path(__file__).resolve().parent.parent / "static" / "data"
    out.mkdir(parents=True, exist_ok=True)
    (out / "integration.json").write_text(json.dumps(results))
    print(f"  saved to {out / 'integration.json'}")
