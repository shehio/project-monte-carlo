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
