import { gaussRandom, normalCDF, gammaRandom, betaRandom, poissonRandom, shuffle, shortNum, niceStep } from '@lib/math';

describe('gaussRandom', () => {
  it('returns numbers within reasonable range', () => {
    const samples = Array.from({ length: 10000 }, () => gaussRandom());
    const mean = samples.reduce((a, b) => a + b) / samples.length;
    const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
    expect(mean).toBeCloseTo(0, 1);
    expect(variance).toBeCloseTo(1, 0);
  });
});

describe('normalCDF', () => {
  it('returns 0.5 at x=0', () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 4);
  });

  it('returns ~0.8413 at x=1', () => {
    expect(normalCDF(1)).toBeCloseTo(0.8413, 3);
  });

  it('returns ~0.1587 at x=-1', () => {
    expect(normalCDF(-1)).toBeCloseTo(0.1587, 3);
  });

  it('approaches 1 for large x', () => {
    expect(normalCDF(4)).toBeGreaterThan(0.999);
  });

  it('approaches 0 for large negative x', () => {
    expect(normalCDF(-4)).toBeLessThan(0.001);
  });
});

describe('gammaRandom', () => {
  it('produces positive values', () => {
    for (let i = 0; i < 100; i++) {
      expect(gammaRandom(2)).toBeGreaterThan(0);
    }
  });

  it('has correct mean for shape=3', () => {
    const samples = Array.from({ length: 10000 }, () => gammaRandom(3));
    const mean = samples.reduce((a, b) => a + b) / samples.length;
    expect(mean).toBeCloseTo(3, 0);
  });

  it('works with shape < 1', () => {
    const samples = Array.from({ length: 1000 }, () => gammaRandom(0.5));
    expect(samples.every(s => s > 0)).toBe(true);
  });
});

describe('betaRandom', () => {
  it('returns values in [0, 1]', () => {
    for (let i = 0; i < 100; i++) {
      const v = betaRandom(2, 5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('has correct mean for Beta(2,5)', () => {
    const samples = Array.from({ length: 10000 }, () => betaRandom(2, 5));
    const mean = samples.reduce((a, b) => a + b) / samples.length;
    expect(mean).toBeCloseTo(2 / 7, 1);
  });
});

describe('poissonRandom', () => {
  it('returns non-negative integers', () => {
    for (let i = 0; i < 100; i++) {
      const v = poissonRandom(4);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('has correct mean for lambda=4', () => {
    const samples = Array.from({ length: 10000 }, () => poissonRandom(4));
    const mean = samples.reduce((a, b) => a + b) / samples.length;
    expect(mean).toBeCloseTo(4, 0);
  });
});

describe('shuffle', () => {
  it('preserves array length', () => {
    const arr = [1, 2, 3, 4, 5];
    shuffle(arr);
    expect(arr).toHaveLength(5);
  });

  it('preserves elements', () => {
    const arr = [1, 2, 3, 4, 5];
    shuffle(arr);
    expect(arr.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('actually shuffles (statistical test)', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let sameCount = 0;
    for (let i = 0; i < 100; i++) {
      const arr = [...original];
      shuffle(arr);
      if (arr.every((v, j) => v === original[j])) sameCount++;
    }
    expect(sameCount).toBeLessThan(10);
  });
});

describe('shortNum', () => {
  it('formats millions', () => {
    expect(shortNum(1000000)).toBe('1M');
    expect(shortNum(5000000)).toBe('5M');
  });

  it('formats thousands', () => {
    expect(shortNum(1000)).toBe('1k');
    expect(shortNum(5000)).toBe('5k');
  });

  it('leaves small numbers as-is', () => {
    expect(shortNum(999)).toBe('999');
    expect(shortNum(42)).toBe('42');
    expect(shortNum(0)).toBe('0');
  });
});

describe('niceStep', () => {
  it('returns a nice step value', () => {
    const step = niceStep(100, 5);
    expect([10, 20, 25, 50]).toContain(step);
  });

  it('handles large ranges', () => {
    const step = niceStep(10000, 5);
    expect(step).toBeGreaterThanOrEqual(1000);
  });

  it('handles small ranges', () => {
    const step = niceStep(1, 5);
    expect(step).toBeLessThanOrEqual(1);
  });
});
