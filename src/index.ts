export { useCanvasSketch } from './useCanvasSketch';
export type { UseCanvasSketchResult } from './useCanvasSketch';
export { CanvasSketch } from './CanvasSketch';
export type { CanvasSketchProps } from './CanvasSketch';
export { useInViewport } from './useInViewport';
export type { UseInViewportOptions } from './useInViewport';
export { configureWebglBudget, getWebglBudget } from './webglBudget';
export { clamp, randRange, lerpColor } from './utils';
export type { RGB } from './utils';
export type {
  SetupInfo,
  DrawInfo,
  PointerInfo,
  CanvasSketchOptions,
  CanvasSketchHandle,
} from './types';

// Three.js (`next-sketch/three`), p5.js (`next-sketch/p5`), and
// react-three-fiber (`next-sketch/fiber`) integrations live behind their own
// subpath entry points instead of this barrel — each pulls in a heavy
// optional peer dependency (`three`, `@p5-wrapper/react`, `@react-three/fiber`),
// and a single shared barrel would `require()` all of them eagerly for every
// consumer, even ones that only ever use `useCanvasSketch`/`CanvasSketch`.
