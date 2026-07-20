import { clamp, randRange, lerpColor, createNoise2D } from '../src/utils';

describe('clamp', () => {
  it('constrains a value to the given range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('randRange', () => {
  it('returns a value within [min, max)', () => {
    for (let i = 0; i < 50; i += 1) {
      const value = randRange(10, 20);
      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThan(20);
    }
  });
});

describe('lerpColor', () => {
  it('interpolates between two colors', () => {
    expect(lerpColor([0, 0, 0], [255, 255, 255], 0)).toBe('rgb(0,0,0)');
    expect(lerpColor([0, 0, 0], [255, 255, 255], 1)).toBe('rgb(255,255,255)');
    expect(lerpColor([0, 0, 0], [100, 100, 100], 0.5)).toBe('rgb(50,50,50)');
  });

  it('clamps t outside [0, 1]', () => {
    expect(lerpColor([0, 0, 0], [100, 100, 100], -1)).toBe('rgb(0,0,0)');
    expect(lerpColor([0, 0, 0], [100, 100, 100], 2)).toBe('rgb(100,100,100)');
  });
});

describe('createNoise2D', () => {
  it('is exactly 0 at integer lattice points', () => {
    const noise = createNoise2D(1);
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        expect(noise(x, y)).toBeCloseTo(0, 10);
      }
    }
  });

  it('is deterministic for a given seed', () => {
    const a = createNoise2D(42);
    const b = createNoise2D(42);
    for (let i = 0; i < 20; i += 1) {
      const x = i * 0.37;
      const y = i * 0.19;
      expect(a(x, y)).toBe(b(x, y));
    }
  });

  it('produces different fields for different seeds', () => {
    const a = createNoise2D(1);
    const b = createNoise2D(2);
    let differs = false;
    for (let i = 0; i < 20; i += 1) {
      if (a(i * 0.31 + 0.5, i * 0.17 + 0.5) !== b(i * 0.31 + 0.5, i * 0.17 + 0.5)) {
        differs = true;
        break;
      }
    }
    expect(differs).toBe(true);
  });

  it('stays continuous — small steps produce small changes', () => {
    const noise = createNoise2D(7);
    let prev = noise(0.001, 0.001);
    for (let i = 1; i <= 100; i += 1) {
      const value = noise(i * 0.01, i * 0.01);
      expect(Math.abs(value - prev)).toBeLessThan(0.2);
      prev = value;
    }
  });

  it('stays within a sane amplitude range', () => {
    const noise = createNoise2D(3);
    for (let x = 0; x < 50; x += 1) {
      for (let y = 0; y < 50; y += 1) {
        const value = noise(x * 0.13, y * 0.29);
        expect(value).toBeGreaterThanOrEqual(-1.5);
        expect(value).toBeLessThanOrEqual(1.5);
      }
    }
  });
});
