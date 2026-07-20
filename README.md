<div align='center'>

<h1>next-sketch</h1>

[![npm version](https://img.shields.io/npm/v/next-sketch.svg)](https://www.npmjs.com/package/next-sketch)
[![npm downloads](https://img.shields.io/npm/dm/next-sketch.svg)](https://www.npmjs.com/package/next-sketch)
[![CI](https://github.com/reinanbr/next-sketch/actions/workflows/ci.yml/badge.svg)](https://github.com/reinanbr/next-sketch/actions/workflows/ci.yml)
[![node](https://img.shields.io/node/v/next-sketch.svg)](https://www.npmjs.com/package/next-sketch)
[![types](https://img.shields.io/npm/types/next-sketch.svg)](https://www.npmjs.com/package/next-sketch)
[![license](https://img.shields.io/npm/l/next-sketch.svg)](LICENSE)

<p>p5.js-style canvas sketches for React and Next.js — a headless hook plus a drop-in <code>&lt;CanvasSketch /&gt;</code> component. DPR-aware resizing, a requestAnimationFrame loop with <code>dt</code>/<code>time</code>/<code>frame</code>, normalized pointer/keyboard input, and full SSR safety, all in one dependency-free core package — plus optional <code>&lt;ThreeSketch /&gt;</code>, <code>&lt;P5Sketch /&gt;</code>, and <code>&lt;FiberSketch /&gt;</code> engines for Three.js, real p5.js, and react-three-fiber, each behind its own subpath so you only pay for what you use.</p>

<p><strong><a href="https://reinanbr.github.io/next-sketch/">Live examples &amp; docs →</a></strong></p>

</div>

<hr>

## Table of contents

- [Why](#why)
- [Installation](#installation)
- [Quickstart](#quickstart)
- [Subpath exports](#subpath-exports)
- [API](#api)
  - [`useCanvasSketch(options)`](#usecanvassketchoptions)
  - [`<CanvasSketch />`](#canvassketch-)
  - [`useThreeSketch(options)`](#usethreesketchoptions)
  - [`<ThreeSketch />`](#threesketch-)
  - [`<P5Sketch />`](#p5sketch-)
  - [`<FiberSketch />`](#fibersketch-)
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

The core (`useCanvasSketch`/`CanvasSketch`) is a tiny 2D-canvas engine with zero dependencies. On
top of that, three optional engines cover the rest of what simulations and games actually need:
[Three.js](https://threejs.org) for imperative 3D (`useThreeSketch`/`ThreeSketch`), real
[p5.js](https://p5js.org) for the full creative-coding API and its ecosystem of add-on libraries
(`<P5Sketch />`), and [react-three-fiber](https://r3f.docs.pmnd.rs) for building 3D scenes
declaratively out of JSX components and hooks like `useFrame` (`<FiberSketch />`). All three share
the same lazy-viewport-mount and WebGL-context-budget plumbing as the core engine, so mixing them
on one page (e.g. a gallery of previews plus one full interactive scene) stays predictable.

## Installation

```sh
npm install next-sketch
```

Requires React 18+. Works in any React app; the SSR-safety and `next/dynamic` friendliness make
it a natural fit for Next.js specifically. That's all you need for `useCanvasSketch`/
`<CanvasSketch />` — the Three.js, p5.js, and react-three-fiber engines are opt-in (see
[Subpath exports](#subpath-exports)):

```sh
npm install three                        # for next-sketch/three
npm install @p5-wrapper/react p5          # for next-sketch/p5 (React 19+, Node 24+)
npm install @react-three/fiber three      # for next-sketch/fiber
```

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
with particles, input, and a play/pause control, or browse the
[live example gallery](https://reinanbr.github.io/next-sketch/) for this and other demos
(pointer input, Three.js, p5.js simulations and a small game, a react-three-fiber orbit scene)
running standalone in the browser.

## Subpath exports

`next-sketch`'s main entry point (`import ... from 'next-sketch'`) only ever pulls in
`useCanvasSketch`/`CanvasSketch`, `useInViewport`, the WebGL budget, and the small math utilities
— none of which have any dependency beyond React. The Three.js, p5.js, and react-three-fiber
engines each pull in a real (and, for p5/Three.js, fairly large) third-party library, so they live
behind their own subpath entry points instead of being re-exported from the main barrel:

```ts
import { CanvasSketch } from 'next-sketch';        // core, zero extra deps
import { ThreeSketch } from 'next-sketch/three';    // requires `three`
import { P5Sketch } from 'next-sketch/p5';          // requires `@p5-wrapper/react` (+ `p5`)
import { FiberSketch } from 'next-sketch/fiber';    // requires `@react-three/fiber` (+ `three`)
```

A single shared barrel re-exporting everything would `require()` all three engines' dependencies
eagerly for every consumer — including ones that only ever call `useCanvasSketch`. Splitting them
means a 2D-only project genuinely doesn't pay for `three`, `p5`, or `@react-three/fiber` being on
disk, in the bundle, or even installed.

> **Migrating from 0.2.x:** `useThreeSketch`/`ThreeSketch` moved from `'next-sketch'` to
> `'next-sketch/three'` (same exports, same behavior — just a different import path).
> `configureWebglBudget`/`getWebglBudget` stay on the main entry point since they have no
> dependency of their own and are now shared by both `<ThreeSketch />` and `<FiberSketch />`.

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

```ts
import { useThreeSketch } from 'next-sketch/three';
```

The same engine as `useCanvasSketch`, but backed by [Three.js](https://threejs.org) instead of a
2D context. `setup`/`draw` get `{ scene, camera, renderer, canvas, width, height }` (plus
`dt`/`time`/`frame` in `draw`) instead of `ctx`; `renderer.render(scene, camera)` happens for you
right after `draw` runs. Requires `three` as a peer dependency (`npm install three`).

```tsx
import { ThreeSketch } from 'next-sketch/three';
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

### `<P5Sketch />`

```ts
import { P5Sketch } from 'next-sketch/p5';
```

A drop-in wrapper around [@p5-wrapper/react](https://www.npmjs.com/package/@p5-wrapper/react)'s
`<P5Canvas />`, for when you want the *actual* p5.js API — every `p5.js`/`p5.sound` method,
`preload`, instance mode, and the whole ecosystem of p5 add-on libraries — instead of next-sketch's
minimal `ctx`/`draw` surface. Requires `@p5-wrapper/react` ^5 and `p5` ^2 as peer dependencies
(`npm install @p5-wrapper/react p5`), which in turn require **React 19+ and Node 24+**.

```tsx
import { P5Sketch } from 'next-sketch/p5';

export default function FlowField() {
  return (
    <P5Sketch
      style={{ width: '100%', height: 400 }}
      sketch={(p5) => {
        let angle = 0;
        p5.setup = () => p5.createCanvas(p5.windowWidth, 400);
        p5.draw = () => {
          p5.background(15, 23, 42, 40);
          angle += 0.01;
          p5.fill('#6366f1');
          p5.circle(p5.width / 2 + Math.cos(angle) * 100, p5.height / 2 + Math.sin(angle) * 100, 20);
        };
      }}
    />
  );
}
```

- `sketch` is p5-wrapper's usual instance-mode function — assign `p5.setup`/`p5.draw`/etc. on the
  `p5` instance you're handed, exactly as in the [@p5-wrapper/react docs](https://www.npmjs.com/package/@p5-wrapper/react).
- `className`/`style` land on an owned wrapper `<div>` (p5-wrapper's own container is unstyled).
- `lazy`/`rootMargin` mount the p5 instance only once the wrapper scrolls into view, same idea as
  [`useInViewport`](#useinviewportref-options) below.
- `sketchProps` forwards reactive values into the sketch via p5-wrapper's `updateWithProps`/
  `updater` (see its docs) — handy for driving a sketch from React state/props.
- `loading`/`error` render props cover `<P5Canvas />`'s internal `Suspense`/error-boundary
  fallbacks (next-sketch already wires up the `Suspense` boundary for you).
- A ref gives you a `P5SketchHandle`: `start`/`stop` call the p5 instance's `loop()`/`noLoop()`
  (pause without losing state); `reset` tears down and recreates the p5 instance from scratch.

### `<FiberSketch />`

```ts
import { FiberSketch } from 'next-sketch/fiber';
```

A drop-in wrapper around [react-three-fiber](https://r3f.docs.pmnd.rs)'s `<Canvas />`, for
building 3D scenes declaratively out of JSX and hooks (`useFrame`, `useThree`, drei helpers, etc.)
instead of `useThreeSketch`'s imperative `setup`/`draw` callbacks — the better fit once a scene
grows past a handful of objects, or when you want physics/post-processing/instancing libraries
from the R3F ecosystem. Requires `@react-three/fiber` and `three` as peer dependencies
(`npm install @react-three/fiber three`).

```tsx
import { FiberSketch } from 'next-sketch/fiber';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';

function SpinningBox() {
  const ref = useRef<Mesh>(null!);
  useFrame((_, dt) => { ref.current.rotation.y += dt; });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial color="#6366f1" />
    </mesh>
  );
}

export default function Scene() {
  return (
    <FiberSketch style={{ width: '100%', height: 400 }} camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} />
      <SpinningBox />
    </FiberSketch>
  );
}
```

`<FiberSketch />` accepts every prop R3F's `<Canvas />` does (`camera`, `gl`, `shadows`,
`onCreated`, ...) plus:

- `lazy`/`rootMargin` — mount the Canvas (and reserve its WebGL budget slot) only once the wrapper
  scrolls into view.
- `respectBudget` (default `true`) — wait for a slot in the shared
  [WebGL context budget](#webgl-context-budget) before mounting, the same budget
  `<ThreeSketch />` respects, so a page mixing both engines never exceeds the browser's
  per-process context limit.
- `frameloop` — `'always'` (default) or `'demand'` for R3F's on-invalidate render mode; forced to
  `'never'` while stopped via the ref handle regardless of this value.
- A ref gives you a `FiberSketchHandle`: `start`/`stop` toggle the render loop without unmounting
  the scene; `reset` remounts the `<Canvas />` from scratch.

### WebGL context budget

A page rendering several live 3D sketches at once (e.g. a gallery of animated previews) can hit
the browser's per-process WebGL context limit — Chrome allows around 16, Safari's ceiling is
often much lower. Past that limit, browsers silently evict the *oldest* context with no error;
the canvas just goes blank. `useThreeSketch` and `<FiberSketch />` both guard against this
automatically: each instance waits for a slot in a shared, module-level budget (default: 4
concurrent) before creating its renderer/Canvas, and releases its slot on unmount.

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
what lets a `<ThreeSketch />`/`<FiberSketch />`/`<P5Sketch />` actually unmount and free its WebGL
context budget slot in a long gallery page instead of accumulating contexts forever. `<P5Sketch />`
and `<FiberSketch />` both build this in via their own `lazy`/`rootMargin` props.

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

`<P5Sketch />` and `<FiberSketch />` carry the same `'use client'` directive as the rest of
next-sketch, so importing them into a Server Component tree works the same way — no manual
`next/dynamic` needed unless your own `sketch`/scene code needs `ssr: false` for other reasons.

## License

MIT © [Reinan Br.](LICENSE)
