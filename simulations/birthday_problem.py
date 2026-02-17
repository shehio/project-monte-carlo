"""Birthday Problem — Monte Carlo

Simulate rooms of n people, estimate probability of shared birthdays.
Compare to theoretical: P = 1 - 365!/(365^n · (365-n)!)
"""

import json
import math
import random
import sys
from pathlib import Path


def theoretical_probability(n: int) -> float:
    """Probability of at least one shared birthday in a room of n people."""
    if n > 365:
        return 1.0
    p_no_match = 1.0
    for i in range(1, n):
        p_no_match *= (365 - i) / 365
    return 1 - p_no_match


def simulate(room_sizes: list[int], num_trials: int) -> dict:
    results = []

    for n in room_sizes:
        shared = 0
        for _ in range(num_trials):
            birthdays = set()
            found = False
            for _ in range(n):
                b = random.randint(0, 364)
                if b in birthdays:
                    found = True
                    break
                birthdays.add(b)
            if found:
                shared += 1

        p_sim = shared / num_trials
        p_theory = theoretical_probability(n)
        results.append({
            "room_size": n,
            "p_simulated": round(p_sim, 6),
            "p_theoretical": round(p_theory, 6),
            "trials": num_trials,
        })
        print(f"  n={n:3d}  P(sim)={p_sim:.4f}  P(theory)={p_theory:.4f}")

    return {
        "room_sizes": room_sizes,
        "num_trials": num_trials,
        "results": results,
    }


if __name__ == "__main__":
    trials = int(sys.argv[1]) if len(sys.argv) > 1 else 100_000
    random.seed(42)

    sizes = list(range(2, 71))
    print(f"birthday problem simulation ({trials:,} trials per room size)...")
    result = simulate(sizes, trials)

    out = Path(__file__).resolve().parent.parent / "static" / "data"
    out.mkdir(parents=True, exist_ok=True)
    (out / "birthday_problem.json").write_text(json.dumps(result))
    print(f"  saved to {out / 'birthday_problem.json'}")
