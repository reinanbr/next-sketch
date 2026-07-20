'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { CanvasProps } from '@react-three/fiber';
import { useInViewport } from './useInViewport';
import { acquireWebglSlot, cancelWebglSlotRequest, releaseWebglSlot } from './webglBudget';
import type { FiberSketchHandle } from './types';

export interface FiberSketchProps extends Omit<CanvasProps, 'frameloop'> {
  /**
   * R3F render mode while running — `'always'` (a plain RAF loop, the
   * default) or `'demand'` (only re-renders when the scene invalidates
   * itself, see R3F's `invalidate()`/`useFrame` docs). Forced to `'never'`
   * while stopped via the ref handle, regardless of this value.
   */
  frameloop?: 'always' | 'demand';
  /** Only mount the Canvas (and reserve its WebGL budget slot) once this wrapper scrolls into view. Default: false. */
  lazy?: boolean;
  /** Forwarded to useInViewport when `lazy` is true. Default: '200px'. */
  rootMargin?: string;
  /**
   * Wait for a slot in next-sketch's shared WebGL context budget (see
   * `configureWebglBudget` from `next-sketch`) before mounting the Canvas.
   * Shares the same budget as `<ThreeSketch />`. Default: true.
   */
  respectBudget?: boolean;
  /** Start the render loop automatically on mount. Default: true. */
  autoStart?: boolean;
}

/**
 * Drop-in wrapper around react-three-fiber's <Canvas> that plugs it into the
 * rest of next-sketch: optional viewport-lazy mounting via useInViewport,
 * the same shared WebGL context budget `<ThreeSketch />` respects (so a page
 * mixing both never blows past the browser's per-process context limit),
 * and a ref handle (start/stop/reset/isRunning) built on `frameloop` and a
 * remount-on-reset, matching `<ThreeSketch />`'s handle shape.
 *
 * Requires `@react-three/fiber` (and `three`) — optional peer dependency,
 * not bundled. Import from `next-sketch/fiber`.
 */
export const FiberSketch = forwardRef<FiberSketchHandle, FiberSketchProps>(function FiberSketch(
  {
    className,
    style,
    lazy = false,
    rootMargin,
    respectBudget = true,
    autoStart = true,
    frameloop: frameloopProp = 'always',
    children,
    ...canvasProps
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInViewport(containerRef, { rootMargin, once: !lazy });
  const shouldMount = !lazy || inView;

  const [running, setRunning] = useState(autoStart);
  const [instanceKey, setInstanceKey] = useState(0);
  const [hasSlot, setHasSlot] = useState(!respectBudget);

  useEffect(() => {
    if (!shouldMount) return undefined;
    if (!respectBudget) {
      setHasSlot(true);
      return undefined;
    }

    let granted = false;
    const onGrant = () => {
      granted = true;
      setHasSlot(true);
    };
    if (acquireWebglSlot(onGrant)) {
      granted = true;
      setHasSlot(true);
    }
    return () => {
      if (granted) releaseWebglSlot();
      else cancelWebglSlotRequest(onGrant);
      setHasSlot(false);
    };
    // instanceKey forces re-acquiring a slot when the Canvas is remounted via reset().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldMount, respectBudget, instanceKey]);

  useImperativeHandle(ref, (): FiberSketchHandle => ({
    start: () => setRunning(true),
    stop: () => setRunning(false),
    reset: () => {
      setRunning(true);
      setInstanceKey((k) => k + 1);
    },
    isRunning: () => running,
  }), [running]);

  const mounted = shouldMount && hasSlot;

  return (
    <div ref={containerRef} className={className} style={style}>
      {mounted && (
        <Canvas key={instanceKey} frameloop={running ? frameloopProp : 'never'} {...canvasProps}>
          {children}
        </Canvas>
      )}
    </div>
  );
});
