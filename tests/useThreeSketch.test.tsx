import { createRef } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import * as THREE from 'three';
import { ThreeSketch } from '../src/ThreeSketch';
import type { ThreeSketchHandle, ThreeSetupInfo } from '../src/types';
import { configureWebglBudget, getWebglBudget } from '../src/webglBudget';

// jsdom has no real WebGL, so `three` is replaced with a minimal fake that
// only implements what useThreeSketch actually calls. This keeps the test
// focused on our orchestration logic (budget, resize/setup/draw wiring,
// dispose-on-unmount) rather than re-testing Three.js's own internals.
jest.mock('three', () => {
  class FakeScene {
    children: unknown[] = [];
    add(obj: unknown) { this.children.push(obj); }
    traverse(cb: (obj: unknown) => void) { this.children.forEach(cb); }
  }

  class FakeCamera {
    position = { z: 0 };
    aspect = 1;
    updateProjectionMatrix = jest.fn();
    constructor(_fov?: number, _aspect?: number, _near?: number, _far?: number) {}
  }

  class FakeRenderer {
    static instances: FakeRenderer[] = [];
    opts: unknown;
    setPixelRatio = jest.fn();
    setSize = jest.fn();
    render = jest.fn();
    dispose = jest.fn();
    forceContextLoss = jest.fn();
    constructor(opts: unknown) {
      this.opts = opts;
      FakeRenderer.instances.push(this);
    }
  }

  return { Scene: FakeScene, PerspectiveCamera: FakeCamera, WebGLRenderer: FakeRenderer };
});

type FakeRendererCtor = { instances: InstanceType<typeof THREE.WebGLRenderer>[] };

function lastRenderer() {
  const instances = (THREE.WebGLRenderer as unknown as FakeRendererCtor).instances;
  return instances[instances.length - 1] as unknown as {
    render: jest.Mock; dispose: jest.Mock; forceContextLoss: jest.Mock; setSize: jest.Mock;
  };
}

function installDomMocks() {
  (global as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
    width: 300, height: 150, top: 0, left: 0, right: 300, bottom: 150, x: 0, y: 0, toJSON() {},
  })) as unknown as HTMLCanvasElement['getBoundingClientRect'];

  Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', { configurable: true, value: 300 });
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', { configurable: true, value: 150 });

  let rafId = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    rafId += 1;
    callbacks.set(rafId, cb);
    return rafId;
  }) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = ((id: number) => {
    callbacks.delete(id);
  }) as typeof window.cancelAnimationFrame;

  return {
    flushFrame(ts: number) {
      const entries = Array.from(callbacks.entries());
      callbacks.clear();
      entries.forEach(([, cb]) => cb(ts));
    },
  };
}

describe('useThreeSketch / ThreeSketch', () => {
  beforeEach(() => {
    (THREE.WebGLRenderer as unknown as FakeRendererCtor).instances = [];
    configureWebglBudget(4);
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('calls setup on mount and draw + renderer.render on each frame', () => {
    const { flushFrame } = installDomMocks();
    const setup = jest.fn();
    const draw = jest.fn();

    render(<ThreeSketch setup={setup} draw={draw} />);

    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup.mock.calls[0][0]).toMatchObject({ width: 300, height: 150 });

    act(() => flushFrame(16));
    act(() => flushFrame(32));

    expect(draw).toHaveBeenCalledTimes(2);
    expect(draw.mock.calls[0][0].frame).toBe(1);
    expect(draw.mock.calls[1][0].frame).toBe(2);
    expect(lastRenderer().render).toHaveBeenCalledTimes(2);
  });

  it('disposes scene objects and forces context loss on unmount', () => {
    const { flushFrame } = installDomMocks();
    const mesh = { geometry: { dispose: jest.fn() }, material: { dispose: jest.fn() } };
    const setup = jest.fn(({ scene }: ThreeSetupInfo) => (scene as unknown as { add: (o: unknown) => void }).add(mesh));

    const { unmount } = render(<ThreeSketch setup={setup} />);
    act(() => flushFrame(16));
    const renderer = lastRenderer();

    unmount();

    expect(mesh.geometry.dispose).toHaveBeenCalledTimes(1);
    expect(mesh.material.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1);
  });

  it('releases its WebGL budget slot on unmount so a new sketch can acquire it', () => {
    installDomMocks();
    configureWebglBudget(1);

    const { unmount } = render(<ThreeSketch />);
    expect(getWebglBudget()).toEqual({ active: 1, max: 1 });

    unmount();
    expect(getWebglBudget()).toEqual({ active: 0, max: 1 });
  });

  it('does not create a renderer when respectBudget is true and no slot is available', () => {
    installDomMocks();
    configureWebglBudget(1);
    render(<ThreeSketch />); // holds the only slot

    const setup = jest.fn();
    render(<ThreeSketch setup={setup} />);

    expect(setup).not.toHaveBeenCalled();
  });

  it('ignores the budget when respectBudget is false', () => {
    installDomMocks();
    configureWebglBudget(1);
    render(<ThreeSketch />); // holds the only slot

    const setup = jest.fn();
    render(<ThreeSketch setup={setup} respectBudget={false} />);

    expect(setup).toHaveBeenCalledTimes(1);
  });

  it('stops the loop via the imperative handle', () => {
    const { flushFrame } = installDomMocks();
    const draw = jest.fn();
    const ref = createRef<ThreeSketchHandle>();

    render(<ThreeSketch ref={ref} draw={draw} />);
    act(() => flushFrame(16));
    expect(draw).toHaveBeenCalledTimes(1);

    act(() => ref.current!.stop());
    act(() => flushFrame(32));

    expect(draw).toHaveBeenCalledTimes(1);
    expect(ref.current!.isRunning()).toBe(false);
  });
});
