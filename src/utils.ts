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
