'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CanvasSketchOptions, PointerInfo } from './types';

export interface UseCanvasSketchResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  start: () => void;
  stop: () => void;
  reset: () => void;
  isRunning: () => boolean;
  /** Re-renders when start()/stop() are called — handy for a play/pause button label. */
  running: boolean;
}

/**
 * Headless canvas render-loop engine: DPR-aware resize, requestAnimationFrame loop with
 * dt/time/frame, and pointer/keyboard input normalized to canvas-local CSS-pixel coordinates.
 * All DOM/window access happens inside effects, so it's safe to use during SSR.
 */
export function useCanvasSketch(options: CanvasSketchOptions = {}): UseCanvasSketchResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const lastTsRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const frameRef = useRef(0);

  const [running, setRunning] = useState(false);

  const loop = useCallback((ts: number) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    if (lastTsRef.current === null) lastTsRef.current = ts;
    const dt = (ts - lastTsRef.current) / 1000;
    lastTsRef.current = ts;
    timeRef.current += dt;
    frameRef.current += 1;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    optionsRef.current.draw?.({
      ctx, canvas, width, height,
      dt, time: timeRef.current, frame: frameRef.current,
    });

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    lastTsRef.current = null;
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  const stop = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const reset = useCallback(() => {
    stop();
    timeRef.current = 0;
    frameRef.current = 0;
    lastTsRef.current = null;
  }, [stop]);

  const isRunning = useCallback(() => runningRef.current, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      optionsRef.current.setup?.({ ctx, canvas, width, height });
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const toLocal = (e: PointerEvent): PointerInfo => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top, event: e };
    };
    const onPointerDown = (e: PointerEvent) => optionsRef.current.onPointerDown?.(toLocal(e));
    const onPointerMove = (e: PointerEvent) => optionsRef.current.onPointerMove?.(toLocal(e));
    const onPointerUp = (e: PointerEvent) => optionsRef.current.onPointerUp?.(toLocal(e));
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);

    const onKeyDown = (e: KeyboardEvent) => optionsRef.current.onKeyDown?.(e);
    const onKeyUp = (e: KeyboardEvent) => optionsRef.current.onKeyUp?.(e);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    if (optionsRef.current.autoStart ?? true) start();

    return () => {
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { canvasRef, start, stop, reset, isRunning, running };
}
