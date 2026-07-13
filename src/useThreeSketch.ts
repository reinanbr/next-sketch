'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ThreeSketchOptions, PointerInfo } from './types';
import { acquireWebglSlot, cancelWebglSlotRequest, releaseWebglSlot } from './webglBudget';

export interface UseThreeSketchResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  start: () => void;
  stop: () => void;
  reset: () => void;
  isRunning: () => boolean;
  /** Re-renders when start()/stop() are called — handy for a play/pause button label. */
  running: boolean;
}

/**
 * Headless Three.js render-loop engine: same shape as useCanvasSketch
 * (DPR-aware resize, requestAnimationFrame loop with dt/time/frame,
 * normalized pointer/keyboard input), but hands your setup/draw callbacks
 * a `scene`/`camera`/`renderer` instead of a 2D `ctx`.
 *
 * Unlike useCanvasSketch, WebGL contexts are a scarce per-process browser
 * resource, so this hook (a) waits for a slot in the shared context budget
 * before creating the renderer (see `configureWebglBudget`), and (b) fully
 * disposes the scene graph and forces context loss on unmount, so a page
 * that mounts/unmounts many of these (e.g. a gallery of live previews)
 * doesn't leak contexts.
 */
export function useThreeSketch(options: ThreeSketchOptions = {}): UseThreeSketchResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const lastTsRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const frameRef = useRef(0);

  const [running, setRunning] = useState(false);
  const [hasSlot, setHasSlot] = useState(false);

  const loop = useCallback((ts: number) => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !scene || !camera || !renderer) return;

    if (lastTsRef.current === null) lastTsRef.current = ts;
    const dt = (ts - lastTsRef.current) / 1000;
    lastTsRef.current = ts;
    timeRef.current += dt;
    frameRef.current += 1;

    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;

    optionsRef.current.draw?.({
      scene, camera, renderer, canvas, width, height,
      dt, time: timeRef.current, frame: frameRef.current,
    });

    renderer.render(scene, camera);
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

  // Reserva um slot no orçamento global de contextos WebGL antes de criar
  // qualquer coisa. Se não conseguir na hora, fica em espera e tenta de
  // novo quando um slot se abrir (ver webglBudget.ts).
  useEffect(() => {
    if (!(optionsRef.current.respectBudget ?? true)) {
      setHasSlot(true);
      return undefined;
    }

    let granted = false;
    const onGrant = () => { granted = true; setHasSlot(true); };
    if (acquireWebglSlot(onGrant)) {
      granted = true;
      setHasSlot(true);
    }
    return () => {
      if (granted) releaseWebglSlot();
      else cancelWebglSlotRequest(onGrant);
    };
  }, []);

  useEffect(() => {
    if (!hasSlot) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      ...optionsRef.current.rendererOptions,
    });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      optionsRef.current.fov ?? 50,
      1,
      optionsRef.current.near ?? 0.1,
      optionsRef.current.far ?? 1000,
    );
    camera.position.z = 5;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      optionsRef.current.setup?.({ scene, camera, renderer, canvas, width, height });
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

      // Libera geometria/material/textura e força a perda do contexto —
      // sem isso o contexto WebGL fica pendurado até o garbage collector
      // decidir coletar o WebGLRenderer, o que pode nunca acontecer a
      // tempo em uma galeria que monta/desmonta várias prévias.
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose?.();
      });
      renderer.dispose();
      renderer.forceContextLoss();

      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSlot]);

  return { canvasRef, start, stop, reset, isRunning, running };
}
