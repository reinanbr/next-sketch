import { createRef } from 'react';
import * as React from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { P5Sketch } from '../src/P5Sketch';
import type { P5SketchHandle } from '../src/types';

// p5 v2 ships ESM-only, and @p5-wrapper/react's CJS build require()s it
// directly — that interop only works through a real bundler (Next.js/
// webpack/Vite), not Jest's CJS transform. So, same approach as the `three`
// mock in useThreeSketch.test.tsx: replace @p5-wrapper/react with a minimal
// fake that only implements what P5Sketch actually calls, keeping the test
// focused on our own orchestration (mount gating, ref handle, remount-on-
// reset) rather than re-testing p5-wrapper's internals.
jest.mock('@p5-wrapper/react', () => {
  const ReactLib = jest.requireActual('react');
  const instances: { loop: jest.Mock; noLoop: jest.Mock }[] = [];
  return {
    __instances: instances,
    P5Canvas: ({ sketch, children }: { sketch: (p5: unknown) => void; children?: React.ReactNode }) => {
      const createdRef = ReactLib.useRef(false);
      if (!createdRef.current) {
        createdRef.current = true;
        const instance = { loop: jest.fn(), noLoop: jest.fn() };
        instances.push(instance);
        sketch(instance);
      }
      return ReactLib.createElement('div', { 'data-testid': 'p5-canvas' }, children);
    },
  };
});

let observers: FakeIntersectionObserver[] = [];

class FakeIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    observers.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  fire(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}
(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = FakeIntersectionObserver;

function lastInstance() {
  const { __instances } = jest.requireMock('@p5-wrapper/react') as {
    __instances: { loop: jest.Mock; noLoop: jest.Mock }[];
  };
  return __instances[__instances.length - 1]!;
}

describe('P5Sketch', () => {
  beforeEach(() => {
    observers = [];
    (jest.requireMock('@p5-wrapper/react') as { __instances: unknown[] }).__instances.length = 0;
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('calls the sketch function on mount', () => {
    const sketch = jest.fn();
    render(<P5Sketch sketch={sketch} />);
    expect(sketch).toHaveBeenCalledTimes(1);
  });

  it('applies className/style to the owned container', () => {
    const { container } = render(<P5Sketch sketch={() => {}} className="my-sketch" style={{ width: 200 }} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toBe('my-sketch');
    expect(div.style.width).toBe('200px');
  });

  it('start/stop drive loop()/noLoop() on the p5 instance via the ref handle', () => {
    const ref = createRef<P5SketchHandle>();
    render(<P5Sketch ref={ref} sketch={() => {}} />);

    act(() => ref.current!.stop());
    expect(lastInstance().noLoop).toHaveBeenCalledTimes(1);
    expect(ref.current!.isRunning()).toBe(false);

    act(() => ref.current!.start());
    expect(lastInstance().loop).toHaveBeenCalledTimes(1);
    expect(ref.current!.isRunning()).toBe(true);
  });

  it('reset() remounts the canvas, creating a fresh p5 instance', () => {
    const sketch = jest.fn();
    const ref = createRef<P5SketchHandle>();
    render(<P5Sketch ref={ref} sketch={sketch} />);
    expect(sketch).toHaveBeenCalledTimes(1);
    const firstInstance = lastInstance();

    act(() => ref.current!.reset());

    expect(sketch).toHaveBeenCalledTimes(2);
    expect(lastInstance()).not.toBe(firstInstance);
    expect(ref.current!.isRunning()).toBe(true);
  });

  it('with lazy=true, only creates the p5 instance once in view', () => {
    const sketch = jest.fn();
    render(<P5Sketch sketch={sketch} lazy />);

    expect(sketch).not.toHaveBeenCalled();

    act(() => observers[0]!.fire(true));
    expect(sketch).toHaveBeenCalledTimes(1);
  });
});
