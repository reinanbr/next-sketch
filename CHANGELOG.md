# Changelog

## 0.4.0

- **Breaking:** removed `<P5Sketch />` (`next-sketch/p5`) and `<FiberSketch />` (`next-sketch/fiber`),
  along with the `@p5-wrapper/react`/`p5`/`@react-three/fiber` peer dependencies they pulled in.
  Those wrapped a real, separate library's own component instead of being a next-sketch engine in
  next-sketch's own style — out of step with `useCanvasSketch`/`CanvasSketch` (p5.js-style API,
  built from scratch) and `useThreeSketch`/`ThreeSketch` (react-three-fiber-style `setup`/`draw`
  API, built from scratch on top of `three` directly), which is how this package was designed from
  0.2.0. If you want the actual p5.js or react-three-fiber APIs, use those libraries directly —
  next-sketch's own `CanvasSketch`/`ThreeSketch` cover the same ground in the same *style*, on
  next-sketch's own terms.
- `P5SketchHandle`/`FiberSketchHandle` types removed accordingly.

## 0.3.1

- No library code changes — docs/CI-only patch release.
- Moved the GitHub Pages site (`index.html`, `assets/`, `examples/`) into `docs/` to match the
  repo's configured Pages source, and added `docs/.nojekyll` so it's served as static files
  instead of being run through Jekyll/Sass.
- Added three live examples to the docs gallery: a p5.js flow-field simulation, a p5.js dodge
  game, and a react-three-fiber orbiting-bodies simulation with OrbitControls — each pairing a
  real, browser-verified demo with the equivalent `<P5Sketch />`/`<FiberSketch />` React code.
- Wired `environment: npm_publish` into the CI publish job so it resolves `NPM_TOKEN` from that
  GitHub environment.
- Fixed the README's link to `examples/bouncing-particles.tsx` after the `docs/` move.

## 0.3.0

- **Breaking:** split the package into subpath exports. The main `next-sketch` entry point now
  only contains the dependency-free core (`useCanvasSketch`, `CanvasSketch`, `useInViewport`, the
  WebGL budget, utilities); `useThreeSketch`/`<ThreeSketch />` moved to `next-sketch/three`. This
  also fixes a real bug: the old single-barrel entry `require()`d `three` eagerly for *every*
  consumer, so `import { CanvasSketch } from 'next-sketch'` crashed with `Cannot find module
  'three'` if `three` wasn't installed, even for 2D-only usage. See
  [Subpath exports](README.md#subpath-exports) for the full rationale and a migration note.
- Added `<P5Sketch />` (`next-sketch/p5`): a drop-in wrapper around
  [@p5-wrapper/react](https://www.npmjs.com/package/@p5-wrapper/react)'s `<P5Canvas />` for using
  the real p5.js API and its ecosystem, with the same `className`/`style`, `lazy`/`rootMargin`
  viewport-lazy mounting, and ref handle (`start`/`stop`/`reset`/`isRunning`) conventions as the
  rest of next-sketch. Requires `@p5-wrapper/react` ^5 + `p5` ^2 (React 19+, Node 24+ — the only
  currently-published `@p5-wrapper/react` line compatible with React 19's renamed internals).
- Added `<FiberSketch />` (`next-sketch/fiber`): a drop-in wrapper around
  [react-three-fiber](https://r3f.docs.pmnd.rs)'s `<Canvas />` for building 3D scenes
  declaratively out of JSX/hooks instead of `useThreeSketch`'s imperative callbacks. Shares the
  same WebGL context budget as `<ThreeSketch />`, plus the same `lazy`/`rootMargin` mounting and
  ref-handle conventions (`start`/`stop` toggle `frameloop`, `reset` remounts the Canvas).
- `configureWebglBudget`/`getWebglBudget` stay on the main `next-sketch` entry point (no
  dependency of their own) and are now shared by both `<ThreeSketch />` and `<FiberSketch />`.

## 0.2.0

- Added `useThreeSketch`/`<ThreeSketch />`: same engine shape as the 2D sketch, backed by
  Three.js (`three` as an optional peer dependency). Disposes the scene graph and forces context
  loss on unmount.
- Added a shared WebGL context budget (`configureWebglBudget`/`getWebglBudget`), respected by
  `useThreeSketch` by default, to avoid silently losing contexts when several 3D sketches are
  mounted on the same page.
- Added `useInViewport` for lazily mounting sketches based on viewport intersection, with a
  `once` option to choose between "mount once and stay" (cheap 2D sketches) and "mount/unmount
  continuously" (WebGL sketches, so they release their context budget slot when scrolled away).
- Added a `'use client'` directive to every hook/component (`useCanvasSketch`, `CanvasSketch`,
  `useThreeSketch`, `ThreeSketch`, `useInViewport`), so the package declares its own client
  boundary instead of relying on the consumer to add one — fixes importing them directly into a
  Server Component tree, exactly as shown in this README's own Quickstart.

## 0.1.0

- Initial release: `useCanvasSketch` hook, `<CanvasSketch />` component, and `clamp`/`randRange`/`lerpColor` utilities.
