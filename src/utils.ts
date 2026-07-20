export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export type RGB = [number, number, number];

/** Linearly interpolates between two RGB colors and returns an `rgb(...)` string. */
export function lerpColor(a: RGB, b: RGB, t: number): string {
  const tt = clamp(t, 0, 1);
  const r = Math.round(a[0] + (b[0] - a[0]) * tt);
  const g = Math.round(a[1] + (b[1] - a[1]) * tt);
  const bl = Math.round(a[2] + (b[2] - a[2]) * tt);
  return `rgb(${r},${g},${bl})`;
}

export type Noise2D = (x: number, y: number) => number;

const FADE = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
const LERP = (t: number, a: number, b: number): number => a + t * (b - a);

const GRADIENTS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2],
  [Math.SQRT1_2, -Math.SQRT1_2], [-Math.SQRT1_2, -Math.SQRT1_2],
];

function grad(hash: number, x: number, y: number): number {
  const [gx, gy] = GRADIENTS[hash & 7];
  return gx * x + gy * y;
}

/** Seeded Fisher-Yates shuffle of 0..255, doubled to 512 entries to avoid wrapping index math. */
function buildPermutation(seed: number): Uint8Array {
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) base[i] = i;

  // mulberry32 PRNG — tiny, deterministic, good enough to shuffle a permutation table.
  let s = (seed >>> 0) || 1;
  const rand = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = base[i];
    base[i] = base[j];
    base[j] = tmp;
  }

  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i += 1) perm[i] = base[i & 255];
  return perm;
}

/**
 * Creates a seeded 2D Perlin noise function — smooth, continuous pseudo-randomness
 * for flow fields, organic motion, terrain, etc., the same role as p5.js's `noise()`
 * but built from scratch (zero dependencies). Output is continuous and roughly in
 * `[-1, 1]`; it's exactly `0` at integer coordinates.
 *
 * The same seed always produces the same noise field, so sketches can be
 * deterministic/reproducible; omit it for a fresh field each call.
 */
export function createNoise2D(seed = 1): Noise2D {
  const perm = buildPermutation(seed);

  return (x: number, y: number): number => {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = FADE(xf);
    const v = FADE(yf);

    const aa = perm[perm[xi] + yi];
    const ab = perm[perm[xi] + yi + 1];
    const ba = perm[perm[xi + 1] + yi];
    const bb = perm[perm[xi + 1] + yi + 1];

    const x1 = LERP(u, grad(aa, xf, yf), grad(ba, xf - 1, yf));
    const x2 = LERP(u, grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1));
    return LERP(v, x1, x2);
  };
}
