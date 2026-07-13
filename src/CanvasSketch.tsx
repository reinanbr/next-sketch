'use client';

import { forwardRef, useImperativeHandle } from 'react';
import { useCanvasSketch } from './useCanvasSketch';
import type { CanvasSketchHandle, CanvasSketchOptions } from './types';

export interface CanvasSketchProps extends CanvasSketchOptions {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Drop-in `<canvas>` wired to useCanvasSketch. Pass `ref` to get imperative
 * start()/stop()/reset()/isRunning() controls for building play/pause UI.
 */
export const CanvasSketch = forwardRef<CanvasSketchHandle, CanvasSketchProps>(
  function CanvasSketch({ className, style, ...options }, ref) {
    const { canvasRef, start, stop, reset, isRunning } = useCanvasSketch(options);

    useImperativeHandle(ref, () => ({ start, stop, reset, isRunning }), [start, stop, reset, isRunning]);

    return <canvas ref={canvasRef} className={className} style={style} />;
  },
);
