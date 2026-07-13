# Changelog

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
