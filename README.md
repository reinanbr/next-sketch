<div align='center'>

<h1>next-sketch</h1>

[![npm version](https://img.shields.io/npm/v/next-sketch.svg)](https://www.npmjs.com/package/next-sketch)
[![npm downloads](https://img.shields.io/npm/dm/next-sketch.svg)](https://www.npmjs.com/package/next-sketch)
[![CI](https://github.com/reinanbr/next-sketch/actions/workflows/ci.yml/badge.svg)](https://github.com/reinanbr/next-sketch/actions/workflows/ci.yml)
[![node](https://img.shields.io/node/v/next-sketch.svg)](https://www.npmjs.com/package/next-sketch)
[![types](https://img.shields.io/npm/types/next-sketch.svg)](https://www.npmjs.com/package/next-sketch)
[![license](https://img.shields.io/npm/l/next-sketch.svg)](LICENSE)

<p>p5.js-style canvas sketches for React and Next.js — a headless hook plus a drop-in <code>&lt;CanvasSketch /&gt;</code> component. DPR-aware resizing, a requestAnimationFrame loop with <code>dt</code>/<code>time</code>/<code>frame</code>, normalized pointer/keyboard input, and full SSR safety, all in one dependency-free package.</p>

</div>

<hr>

## Table of contents

- [Why](#why)
- [Installation](#installation)
- [Quickstart](#quickstart)
- [API](#api)
  - [`useCanvasSketch(options)`](#usecanvassketchoptions)
  - [`<CanvasSketch />`](#canvassketch-)
  - [`useThreeSketch(options)`](#usethreesketchoptions)
  - [`<ThreeSketch />`](#threesketch-)
  - [WebGL context budget](#webgl-context-budget)
  - [`useInViewport(ref, options)`](#useinviewportref-options)
  - [Utilities](#utilities)
- [Next.js / SSR](#nextjs--ssr)
- [License](#license)

<hr>

## Why

Every hand-rolled canvas animation in React ends up rewriting the same plumbing: a
`canvasRef`, a `devicePixelRatio`-aware resize handler, a `requestAnimationFrame` loop with
manual `dt` bookkeeping, pointer coordinates translated through `getBoundingClientRect()`, and
cleanup on unmount. `next-sketch` extracts that plumbing once so you can focus on `setup`/`draw`,
the way you would in [p5.js](https://p5js.org) — but as an idiomatic React hook/component instead
of a global-mode sketch.

## Installation

```sh
npm install next-sketch
```

Requires React 18+. Works in any React app; the SSR-safety and `next/dynamic` friendliness make
it a natural fit for Next.js specifically.

## Quickstart

```tsx
import { CanvasSketch, randRange } from 'next-sketch';

export default function Sketch() {
  return (
    <CanvasSketch
      style={{ width: '100%', height: 400 }}
      setup={({ ctx, width, height }) => {
        // called once on mount, and again on every resize
      }}
      draw={({ ctx, width, height, dt, time, frame }) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(width / 2 + Math.sin(time) * 100, height / 2, 20, 0, Math.PI * 2);
        ctx.fill();
      }}
    />
  );
}
```

See [`examples/bouncing-particles.tsx`](examples/bouncing-particles.tsx) for a fuller example
with particles, input, and a play/pause control.

## API

### `useCanvasSketch(options)`

The headless engine. Returns a `canvasRef` to attach to your own `<canvas>`, plus imperative
controls:

```ts
const { canvasRef, start, stop, reset, isRunning, running } = useCanvasSketch({
  setup?: (info: SetupInfo) => void,
  draw?: (info: DrawInfo) => void,
  onPointerDown?: (info: PointerInfo) => void,
  onPointerMove?: (info: PointerInfo) => void,
  onPointerUp?: (info: PointerInfo) => void,
  onKeyDown?: (event: KeyboardEvent) => void,
  onKeyUp?: (event: KeyboardEvent) => void,
  autoStart?: boolean, // default true
});
```

- `SetupInfo` — `{ ctx, canvas, width, height }` (`width`/`height` in CSS pixels, already
  DPR-normalized — draw as if `devicePixelRatio` were 1).
- `DrawInfo` — `SetupInfo` plus `{ dt, time, frame }`: seconds since the last frame, seconds
  since `start()`, and a frame counter. Both reset to zero on `reset()`.
- `PointerInfo` — `{ x, y, event }`, `x`/`y` already localized to the canvas in CSS pixels.

### `<CanvasSketch />`

A thin `<canvas>` wrapper around the hook. Accepts the same options as props, plus `className`/
`style`. Pass a `ref` to get a `CanvasSketchHandle` (`start`/`stop`/`reset`/`isRunning`) for
building play/pause/reset UI without touching the hook directly.

### `useThreeSketch(options)`

The same engine as `useCanvasSketch`, but backed by [Three.js](https://threejs.org) instead of a
2D context. `setup`/`draw` get `{ scene, camera, renderer, canvas, width, height }` (plus
`dt`/`time`/`frame` in `draw`) instead of `ctx`; `renderer.render(scene, camera)` happens for you
right after `draw` runs. Requires `three` as a peer dependency (`npm install three`) — it's not
bundled, so sketches that only use the 2D engine pay nothing for it.

```tsx
import { ThreeSketch } from 'next-sketch';
import * as THREE from 'three';

<ThreeSketch
  style={{ width: '100%', height: 400 }}
  setup={({ scene }) => {
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 1),
      new THREE.MeshStandardMaterial({ color: '#6366f1' }),
    );
    scene.add(mesh);
  }}
  draw={({ scene, dt }) => {
    scene.children[1].rotation.y += dt;
  }}
/>
```

Unlike 2D canvas contexts, WebGL contexts are a scarce per-process browser resource — see
[WebGL context budget](#webgl-context-budget) below, which `useThreeSketch` respects by default.

On unmount, `useThreeSketch` disposes every geometry/material in the scene graph and calls
`renderer.dispose()` + `renderer.forceContextLoss()`, so the context is actually freed rather than
left for the garbage collector to get to eventually.

### `<ThreeSketch />`

A thin `<canvas>` wrapper around `useThreeSketch`, mirroring `<CanvasSketch />`: same
`ref`-based `start`/`stop`/`reset`/`isRunning` handle, plus `className`/`style`.

### WebGL context budget

A page rendering several live 3D sketches at once (e.g. a gallery of animated previews) can hit
the browser's per-process WebGL context limit — Chrome allows around 16, Safari's ceiling is
often much lower. Past that limit, browsers silently evict the *oldest* context with no error;
the canvas just goes blank. `useThreeSketch` guards against this automatically: each instance
waits for a slot in a shared, module-level budget (default: 4 concurrent) before creating its
renderer, and releases its slot on unmount.

```ts
import { configureWebglBudget, getWebglBudget } from 'next-sketch';

configureWebglBudget(6); // raise/lower the app-wide cap
getWebglBudget();        // -> { active: 2, max: 6 }
```

Opt a specific sketch out with `respectBudget: false` (e.g. for the one full, interactive
simulation on a detail page, as opposed to a grid of decorative previews).

### `useInViewport(ref, options)`

```ts
const wrapperRef = useRef<HTMLDivElement>(null);
const inView = useInViewport(wrapperRef, { rootMargin: '200px', once: false });
```

Tracks whether an element is inside the viewport via `IntersectionObserver`, so you can mount an
expensive sketch only while it's actually visible. With `once: true` (the default-ish choice for
cheap 2D sketches) it stays `true` forever after the first intersection — no restart cost on
scroll. With `once: false` it flips back to `false` when the element scrolls back out, which is
what lets a `<ThreeSketch />` actually unmount and free its WebGL context budget slot in a long
gallery page instead of accumulating contexts forever.

### Utilities

Small helpers factored out of the same duplicated math every canvas sketch ends up writing:

```ts
import { clamp, randRange, lerpColor } from 'next-sketch';

clamp(value, min, max);              // -> number
randRange(min, max);                 // -> number
lerpColor([59,130,246], [239,68,68], t); // -> "rgb(r,g,b)"
```

## Next.js / SSR

`useCanvasSketch`/`CanvasSketch` never touch `window`/`document` outside of effects, so they're
safe to import in a Server Component tree. If you still prefer to opt a sketch fully out of SSR
(e.g. it depends on `window` inside your own `draw` callback), wrap it the usual way:

```tsx
import dynamic from 'next/dynamic';
const Sketch = dynamic(() => import('./Sketch'), { ssr: false });
```

## License

MIT © [Reinan Br.](LICENSE)
