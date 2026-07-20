'use client';

import { forwardRef, Suspense, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { P5Canvas } from '@p5-wrapper/react';
import type { P5CanvasInstance, Sketch, SketchProps, Updater } from '@p5-wrapper/react';
import { useInViewport } from './useInViewport';
import type { P5SketchHandle } from './types';

export interface P5SketchProps {
  sketch: Sketch;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  /** Only create the p5 instance once this wrapper scrolls into view. Default: false. */
  lazy?: boolean;
  /** Forwarded to useInViewport when `lazy` is true. Default: '200px'. */
  rootMargin?: string;
  /** Rendered while `<P5Canvas />`'s internal code-split chunks are loading. */
  loading?: () => React.ReactNode;
  /** Rendered if the sketch throws, caught by @p5-wrapper/react's internal error boundary. */
  error?: (error: unknown) => React.ReactNode;
  /** Called whenever `sketchProps` changes, alongside @p5-wrapper/react's own `updateWithProps`. */
  updater?: Updater;
  /**
   * Extra values forwarded to the sketch on every change — read them off
   * `instance.updateWithProps` inside your `sketch` function, or via
   * `updater` above (see the @p5-wrapper/react docs).
   */
  sketchProps?: SketchProps;
}

/**
 * Drop-in wrapper around @p5-wrapper/react's <P5Canvas>, matching the rest
 * of next-sketch: className/style on an owned container (P5Canvas renders
 * its own unstyled div), a Suspense boundary already wired up (P5Canvas is
 * `React.lazy` internally), optional viewport-lazy mounting via
 * useInViewport, and a ref handle (start/stop/reset/isRunning) driven by the
 * underlying p5 instance's loop()/noLoop().
 *
 * Requires `@p5-wrapper/react` ^5 (which pulls in `p5` v2 itself) and React
 * 19 — optional peer dependency, not bundled. Import from `next-sketch/p5`.
 */
export const P5Sketch = forwardRef<P5SketchHandle, P5SketchProps>(function P5Sketch(
  { sketch, className, style, lazy = false, rootMargin, loading, error, updater, children, sketchProps },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<P5CanvasInstance | null>(null);
  const runningRef = useRef(true);
  const [instanceKey, setInstanceKey] = useState(0);

  const inView = useInViewport(containerRef, { rootMargin, once: !lazy });
  const shouldMount = !lazy || inView;

  const wrappedSketch = useMemo<Sketch>(() => (p5) => {
    instanceRef.current = p5;
    sketch(p5);
  }, [sketch]);

  useImperativeHandle(ref, (): P5SketchHandle => ({
    start: () => {
      instanceRef.current?.loop();
      runningRef.current = true;
    },
    stop: () => {
      instanceRef.current?.noLoop();
      runningRef.current = false;
    },
    reset: () => {
      runningRef.current = true;
      setInstanceKey((k) => k + 1);
    },
    isRunning: () => runningRef.current,
  }), []);

  return (
    <div ref={containerRef} className={className} style={style}>
      {shouldMount && (
        <Suspense fallback={loading?.() ?? null}>
          <P5Canvas
            key={instanceKey}
            sketch={wrappedSketch}
            loading={loading}
            error={error}
            updater={updater}
            {...(sketchProps ?? {})}
          >
            {children}
          </P5Canvas>
        </Suspense>
      )}
    </div>
  );
});
