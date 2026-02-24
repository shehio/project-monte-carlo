import { gaussRandom, normalCDF } from './math';

export function blackScholes(S: number, K: number, T: number, r: number, sigma: number): number {
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
}

export function simulatePath(S0: number, r: number, sigma: number, T: number, steps: number): number[] {
  const dt = T / steps;
  const path = [S0];
  for (let i = 0; i < steps; i++) {
    const dW = gaussRandom() * Math.sqrt(dt);
    const S = path[path.length - 1] * Math.exp((r - 0.5 * sigma * sigma) * dt + sigma * dW);
    path.push(S);
  }
  return path;
}
