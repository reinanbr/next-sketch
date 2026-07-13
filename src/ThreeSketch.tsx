'use client';

import { forwardRef, useImperativeHandle } from 'react';
import { useThreeSketch } from './useThreeSketch';
import type { ThreeSketchHandle, ThreeSketchOptions } from './types';

export interface ThreeSketchProps extends ThreeSketchOptions {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Drop-in `<canvas>` wired to useThreeSketch. Pass `ref` to get imperative
 * start()/stop()/reset()/isRunning() controls for building play/pause UI.
 */
export const ThreeSketch = forwardRef<ThreeSketchHandle, ThreeSketchProps>(
  function ThreeSketch({ className, style, ...options }, ref) {
    const { canvasRef, start, stop, reset, isRunning } = useThreeSketch(options);

    useImperativeHandle(ref, () => ({ start, stop, reset, isRunning }), [start, stop, reset, isRunning]);

    return <canvas ref={canvasRef} className={className} style={style} />;
  },
);
