// react-three-fiber integration — `import { ... } from 'next-sketch/fiber'`.
// Requires `@react-three/fiber` (and `three`) as peer dependencies (`npm
// install @react-three/fiber three`); kept out of the main `next-sketch`
// entry point so consumers who don't use it never pay for it.

export { FiberSketch } from './FiberSketch';
export type { FiberSketchProps } from './FiberSketch';
export type { FiberSketchHandle } from './types';
