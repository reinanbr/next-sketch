// p5.js integration — `import { ... } from 'next-sketch/p5'`.
// Requires `@p5-wrapper/react` as a peer dependency (`npm install
// @p5-wrapper/react p5`); kept out of the main `next-sketch` entry point so
// consumers who don't use p5 never pay for it.

export { P5Sketch } from './P5Sketch';
export type { P5SketchProps } from './P5Sketch';
export type { P5SketchHandle } from './types';
