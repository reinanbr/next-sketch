// Vanilla-JS port of next-sketch's exported utilities (clamp/randRange/lerpColor).
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function lerpColor(a, b, t) {
  const tt = clamp(t, 0, 1);
  const r = Math.round(a[0] + (b[0] - a[0]) * tt);
  const g = Math.round(a[1] + (b[1] - a[1]) * tt);
  const bl = Math.round(a[2] + (b[2] - a[2]) * tt);
  return `rgb(${r},${g},${bl})`;
}

// Vanilla-JS port of next-sketch's createNoise2D — seeded 2D Perlin noise,
// zero dependencies, output roughly in [-1, 1].
function createNoise2D(seed = 1) {
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (t, a, b) => a + t * (b - a);
  const gradients = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2],
    [Math.SQRT1_2, -Math.SQRT1_2], [-Math.SQRT1_2, -Math.SQRT1_2],
  ];
  const grad = (hash, x, y) => {
    const [gx, gy] = gradients[hash & 7];
    return gx * x + gy * y;
  };

  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) base[i] = i;

  let s = (seed >>> 0) || 1;
  const rand = () => {
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

  return (x, y) => {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);

    const aa = perm[perm[xi] + yi];
    const ab = perm[perm[xi] + yi + 1];
    const ba = perm[perm[xi + 1] + yi];
    const bb = perm[perm[xi + 1] + yi + 1];

    const x1 = lerp(u, grad(aa, xf, yf), grad(ba, xf - 1, yf));
    const x2 = lerp(u, grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1));
    return lerp(v, x1, x2);
  };
}
