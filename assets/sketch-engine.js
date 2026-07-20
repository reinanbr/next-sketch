/**
 * Vanilla-JS port of next-sketch's useCanvasSketch, for these dependency-free
 * static demo pages. In a real React/Next.js app you'd write this same
 * setup/draw pair against <CanvasSketch /> or useCanvasSketch() instead —
 * see the "source" panel on each example page.
 */
function createCanvasSketch(canvas, options = {}) {
  const ctx = canvas.getContext('2d');
  let running = false;
  let rafId = 0;
  let lastTs = null;
  let time = 0;
  let frame = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    options.setup?.({ ctx, canvas, width, height });
  }

  function loop(ts) {
    if (lastTs === null) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;
    time += dt;
    frame += 1;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    options.draw?.({ ctx, canvas, width, height, dt, time, frame });
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    lastTs = null;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  function reset() {
    stop();
    time = 0;
    frame = 0;
    lastTs = null;
  }

  function isRunning() {
    return running;
  }

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  function toLocal(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, event: e };
  }
  canvas.addEventListener('pointerdown', (e) => options.onPointerDown?.(toLocal(e)));
  canvas.addEventListener('pointermove', (e) => options.onPointerMove?.(toLocal(e)));
  canvas.addEventListener('pointerup', (e) => options.onPointerUp?.(toLocal(e)));
  window.addEventListener('keydown', (e) => options.onKeyDown?.(e));
  window.addEventListener('keyup', (e) => options.onKeyUp?.(e));

  if (options.autoStart ?? true) start();

  return { start, stop, reset, isRunning };
}
