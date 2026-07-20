// Three.js integration — `import { ... } from 'next-sketch/three'`.
// Requires `three` as a peer dependency (`npm install three`); kept out of
// the main `next-sketch` entry point so 2D-only consumers never pay for it.

export { useThreeSketch } from './useThreeSketch';
export type { UseThreeSketchResult } from './useThreeSketch';
export { ThreeSketch } from './ThreeSketch';
export type { ThreeSketchProps } from './ThreeSketch';
export type {
  ThreeSetupInfo,
  ThreeDrawInfo,
  ThreeSketchOptions,
  ThreeSketchHandle,
} from './types';
