import { createRef } from 'react';
import * as React from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { FiberSketch } from '../src/FiberSketch';
import type { FiberSketchHandle } from '../src/types';
import { configureWebglBudget, getWebglBudget } from '../src/webglBudget';

// react-three-fiber's real <Canvas> needs an actual WebGL context, which
// jsdom doesn't provide. Same approach as the `three` mock in
// useThreeSketch.test.tsx: replace @react-three/fiber with a minimal fake
// that only implements what FiberSketch actually renders, keeping the test
// focused on our own orchestration (budget gating, mount gating, ref
// handle, remount-on-reset) rather than re-testing R3F's internals.
jest.mock('@react-three/fiber', () => {
  const ReactLib = jest.requireActual('react');
  return {
    Canvas: ({ frameloop, children }: { frameloop?: string; children?: React.ReactNode }) =>
      ReactLib.createElement('div', { 'data-testid': 'r3f-canvas', 'data-frameloop': frameloop }, children),
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

describe('FiberSketch', () => {
  beforeEach(() => {
    observers = [];
    configureWebglBudget(4);
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('mounts the Canvas immediately when a budget slot is available', () => {
    const { getByTestId } = render(<FiberSketch />);
    expect(getByTestId('r3f-canvas').getAttribute('data-frameloop')).toBe('always');
  });

  it('applies className/style to the owned container', () => {
    const { container } = render(<FiberSketch className="my-scene" style={{ height: 300 }} />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toBe('my-scene');
    expect(div.style.height).toBe('300px');
  });

  it('releases its WebGL budget slot on unmount so a new sketch can acquire it', () => {
    const { unmount } = render(<FiberSketch />);
    expect(getWebglBudget()).toEqual({ active: 1, max: 4 });

    unmount();
    expect(getWebglBudget()).toEqual({ active: 0, max: 4 });
  });

  it('does not mount the Canvas when respectBudget is true and no slot is available', () => {
    configureWebglBudget(1);
    render(<FiberSketch />); // holds the only slot

    const { container } = render(<FiberSketch />);
    expect(container.querySelector('[data-testid="r3f-canvas"]')).toBeNull();
  });

  it('ignores the budget when respectBudget is false', () => {
    configureWebglBudget(1);
    render(<FiberSketch />); // holds the only slot

    const { container } = render(<FiberSketch respectBudget={false} />);
    expect(container.querySelector('[data-testid="r3f-canvas"]')).not.toBeNull();
  });

  it('stop/start toggle frameloop via the ref handle', () => {
    const ref = createRef<FiberSketchHandle>();
    const { getByTestId } = render(<FiberSketch ref={ref} />);

    expect(getByTestId('r3f-canvas').getAttribute('data-frameloop')).toBe('always');

    act(() => ref.current!.stop());
    expect(getByTestId('r3f-canvas').getAttribute('data-frameloop')).toBe('never');
    expect(ref.current!.isRunning()).toBe(false);

    act(() => ref.current!.start());
    expect(getByTestId('r3f-canvas').getAttribute('data-frameloop')).toBe('always');
    expect(ref.current!.isRunning()).toBe(true);
  });

  it('reset() remounts the Canvas and re-acquires a budget slot', () => {
    configureWebglBudget(1);
    const ref = createRef<FiberSketchHandle>();
    render(<FiberSketch ref={ref} />);
    expect(getWebglBudget()).toEqual({ active: 1, max: 1 });

    act(() => ref.current!.reset());

    expect(getWebglBudget()).toEqual({ active: 1, max: 1 });
    expect(ref.current!.isRunning()).toBe(true);
  });

  it('with lazy=true, only mounts the Canvas (and reserves a slot) once in view', () => {
    const { queryByTestId } = render(<FiberSketch lazy />);
    expect(queryByTestId('r3f-canvas')).toBeNull();
    expect(getWebglBudget()).toEqual({ active: 0, max: 4 });

    act(() => observers[0]!.fire(true));
    expect(queryByTestId('r3f-canvas')).not.toBeNull();
    expect(getWebglBudget()).toEqual({ active: 1, max: 4 });
  });

  it('respects a `demand` frameloop while running, but still forces `never` when stopped', () => {
    const ref = createRef<FiberSketchHandle>();
    const { getByTestId } = render(<FiberSketch ref={ref} frameloop="demand" />);
    expect(getByTestId('r3f-canvas').getAttribute('data-frameloop')).toBe('demand');

    act(() => ref.current!.stop());
    expect(getByTestId('r3f-canvas').getAttribute('data-frameloop')).toBe('never');
  });
});
