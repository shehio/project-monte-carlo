import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { blackScholes, simulatePath } from '@lib/finance';

describe('blackScholes', () => {
  it('returns a positive price for in-the-money call', () => {
    const price = blackScholes(100, 90, 1, 0.05, 0.2);
    expect(price).toBeGreaterThan(10);
  });

  it('returns a small price for deep out-of-the-money call', () => {
    const price = blackScholes(100, 200, 0.1, 0.05, 0.2);
    expect(price).toBeLessThan(1);
  });

  it('price increases with volatility', () => {
    const lowVol = blackScholes(100, 100, 1, 0.05, 0.1);
    const highVol = blackScholes(100, 100, 1, 0.05, 0.5);
    expect(highVol).toBeGreaterThan(lowVol);
  });

  it('price increases with time to maturity', () => {
    const shortT = blackScholes(100, 100, 0.1, 0.05, 0.2);
    const longT = blackScholes(100, 100, 2, 0.05, 0.2);
    expect(longT).toBeGreaterThan(shortT);
  });

  it('at-the-money call is approximately S*N(d1) - K*e^(-rT)*N(d2)', () => {
    const price = blackScholes(100, 100, 1, 0.05, 0.2);
    expect(price).toBeGreaterThan(5);
    expect(price).toBeLessThan(20);
  });

  it('matches published reference prices', () => {
    // Textbook European call benchmarks. These pin the absolute value, so a
    // flipped d1 or a missing exp(-rT) discount factor cannot slip through.
    expect(blackScholes(100, 100, 1, 0.05, 0.2)).toBeCloseTo(10.4506, 4);
    expect(blackScholes(42, 40, 0.5, 0.1, 0.2)).toBeCloseTo(4.7594, 4);
  });
});

describe('simulatePath', () => {
  it('returns correct number of steps', () => {
    const path = simulatePath(100, 0.05, 0.2, 1, 100);
    expect(path).toHaveLength(101); // initial + 100 steps
  });

  it('starts at S0', () => {
    const path = simulatePath(100, 0.05, 0.2, 1, 50);
    expect(path[0]).toBe(100);
  });

  it('all values are positive (GBM property)', () => {
    const path = simulatePath(100, 0.05, 0.2, 1, 100);
    expect(path.every(v => v > 0)).toBe(true);
  });

  it('terminal values have correct mean (approximately)', () => {
    const terminals: number[] = [];
    for (let i = 0; i < 5000; i++) {
      const path = simulatePath(100, 0.05, 0.2, 1, 50);
      terminals.push(path[path.length - 1]);
    }
    const mean = terminals.reduce((a, b) => a + b) / terminals.length;
    // E[S_T] = S0 * exp(r*T) = 100 * exp(0.05) ≈ 105.13
    expect(mean).toBeCloseTo(105.13, -1);
  });
});

describe('committed option_pricing.json', () => {
  const data = JSON.parse(
    readFileSync(join(__dirname, '..', 'static', 'data', 'option_pricing.json'), 'utf8'),
  ) as {
    mc_price: number;
    bs_price: number;
    num_paths: number;
    params: { S0: number; K: number; T: number; r: number; sigma: number };
    terminal_values: number[];
    sample_paths: number[][];
  };

  it('reports the analytic price for its own parameters', () => {
    const { S0, K, T, r, sigma } = data.params;
    expect(data.bs_price).toBeCloseTo(blackScholes(S0, K, T, r, sigma), 4);
  });

  it('mc_price agrees with Black-Scholes to within a few standard errors', () => {
    // The discounted payoff has a standard deviation of ~14.7 for these
    // parameters, so one run's standard error is 14.7/sqrt(num_paths)
    // — about $0.046 at 100,000 paths.
    const se = 14.7 / Math.sqrt(data.num_paths);
    expect(Math.abs(data.mc_price - data.bs_price)).toBeLessThan(5 * se);
  });

  it('sample paths start at S0 and end at the reported terminal value', () => {
    expect(data.sample_paths.length).toBeGreaterThan(0);
    data.sample_paths.forEach((path, i) => {
      expect(path[0]).toBe(data.params.S0);
      expect(path[path.length - 1]).toBe(data.terminal_values[i]);
    });
  });
});
