export interface SetupInfo {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  /** CSS pixels — already DPR-normalized, matches what you'd draw with. */
  width: number;
  height: number;
}

export interface DrawInfo extends SetupInfo {
  /** Seconds elapsed since the previous frame. */
  dt: number;
  /** Seconds elapsed since start() was called (resets on reset()). */
  time: number;
  /** Frame counter, resets on reset(). */
  frame: number;
}

export interface PointerInfo {
  /** Pointer position in CSS pixels, local to the canvas. */
  x: number;
  y: number;
  event: PointerEvent;
}

export interface CanvasSketchOptions {
  /** Called once after the canvas is mounted/sized, and again after every resize. */
  setup?: (info: SetupInfo) => void;
  /** Called every animation frame while running. */
  draw?: (info: DrawInfo) => void;
  onPointerDown?: (info: PointerInfo) => void;
  onPointerMove?: (info: PointerInfo) => void;
  onPointerUp?: (info: PointerInfo) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
  /** Start the render loop automatically on mount. Default: true. */
  autoStart?: boolean;
}

export interface CanvasSketchHandle {
  start: () => void;
  stop: () => void;
  /** Stops the loop and resets time/frame back to zero (does not clear the canvas). */
  reset: () => void;
  isRunning: () => boolean;
}

// ─────────────────────────────────────────────────────────────
// Three.js sketches (optional — requires `three` as a peer dependency)
// ─────────────────────────────────────────────────────────────

export interface ThreeSetupInfo {
  scene: import('three').Scene;
  camera: import('three').PerspectiveCamera;
  renderer: import('three').WebGLRenderer;
  canvas: HTMLCanvasElement;
  /** CSS pixels. */
  width: number;
  height: number;
}

export interface ThreeDrawInfo extends ThreeSetupInfo {
  /** Seconds elapsed since the previous frame. */
  dt: number;
  /** Seconds elapsed since start() was called (resets on reset()). */
  time: number;
  /** Frame counter, resets on reset(). */
  frame: number;
}

export interface ThreeSketchOptions {
  /** Called once after scene/camera/renderer are created and sized, and again after every resize. */
  setup?: (info: ThreeSetupInfo) => void;
  /** Called every animation frame while running, right before renderer.render(scene, camera). */
  draw?: (info: ThreeDrawInfo) => void;
  onPointerDown?: (info: PointerInfo) => void;
  onPointerMove?: (info: PointerInfo) => void;
  onPointerUp?: (info: PointerInfo) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
  /** Start the render loop automatically on mount. Default: true. */
  autoStart?: boolean;
  /** Default PerspectiveCamera field of view, in degrees. Default: 50. */
  fov?: number;
  near?: number;
  far?: number;
  /** Forwarded to `new THREE.WebGLRenderer(...)`. `canvas` is always set for you. */
  rendererOptions?: Omit<import('three').WebGLRendererParameters, 'canvas'>;
  /**
   * Wait for a slot in the global WebGL context budget (see
   * `configureWebglBudget`) before creating the renderer. Default: true.
   * Browsers silently evict the oldest WebGL context once a per-process
   * limit is hit (Safari's ceiling is notably lower than Chrome's), so a
   * page rendering several live 3D previews at once needs this to avoid
   * contexts going blank with no error.
   */
  respectBudget?: boolean;
}

export interface ThreeSketchHandle {
  start: () => void;
  stop: () => void;
  reset: () => void;
  isRunning: () => boolean;
}

// ─────────────────────────────────────────────────────────────
// p5.js sketches (optional — requires `@p5-wrapper/react` + `p5`)
// ─────────────────────────────────────────────────────────────

export interface P5SketchHandle {
  /** Resumes the draw loop (`p5.loop()`). */
  start: () => void;
  /** Pauses the draw loop (`p5.noLoop()`) without discarding sketch state. */
  stop: () => void;
  /** Tears down and recreates the p5 instance, discarding all sketch state. */
  reset: () => void;
  isRunning: () => boolean;
}

// ─────────────────────────────────────────────────────────────
// react-three-fiber sketches (optional — requires `@react-three/fiber` + `three`)
// ─────────────────────────────────────────────────────────────

export interface FiberSketchHandle {
  /** Resumes the render loop (sets `frameloop` back to `"always"`/`"demand"`). */
  start: () => void;
  /** Pauses the render loop (sets `frameloop` to `"never"`) without unmounting the scene. */
  stop: () => void;
  /** Remounts the `<Canvas>`, discarding all scene state. */
  reset: () => void;
  isRunning: () => boolean;
}
