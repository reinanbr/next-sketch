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
