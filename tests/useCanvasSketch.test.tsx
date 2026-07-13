import { createRef } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { CanvasSketch } from '../src/CanvasSketch';
import type { CanvasSketchHandle } from '../src/types';

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function installCanvasMocks() {
  (global as unknown as { ResizeObserver: unknown }).ResizeObserver = FakeResizeObserver;

  const fakeCtx = { setTransform: jest.fn() };
  HTMLCanvasElement.prototype.getContext = jest.fn(
    () => fakeCtx,
  ) as unknown as HTMLCanvasElement['getContext'];

  HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
    width: 300, height: 150, top: 0, left: 0, right: 300, bottom: 150, x: 0, y: 0, toJSON() {},
  })) as unknown as HTMLCanvasElement['getBoundingClientRect'];

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

describe('useCanvasSketch / CanvasSketch', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('calls setup on mount and draw on each frame with increasing frame/time', () => {
    const { flushFrame } = installCanvasMocks();
    const setup = jest.fn();
    const draw = jest.fn();

    render(<CanvasSketch setup={setup} draw={draw} />);

    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup.mock.calls[0][0]).toMatchObject({ width: 300, height: 150 });

    act(() => flushFrame(16));
    act(() => flushFrame(32));

    expect(draw).toHaveBeenCalledTimes(2);
    expect(draw.mock.calls[0][0].frame).toBe(1);
    expect(draw.mock.calls[1][0].frame).toBe(2);
    expect(draw.mock.calls[1][0].time).toBeGreaterThan(draw.mock.calls[0][0].time);
  });

  it('stops the loop via the imperative handle and does not schedule further frames', () => {
    const { flushFrame } = installCanvasMocks();
    const draw = jest.fn();
    const ref = createRef<CanvasSketchHandle>();

    render(<CanvasSketch ref={ref} draw={draw} />);
    act(() => flushFrame(16));
    expect(draw).toHaveBeenCalledTimes(1);

    act(() => ref.current!.stop());
    act(() => flushFrame(32));

    expect(draw).toHaveBeenCalledTimes(1);
    expect(ref.current!.isRunning()).toBe(false);
  });

  it('cancels the pending frame and removes keyboard listeners on unmount', () => {
    const { flushFrame } = installCanvasMocks();
    const draw = jest.fn();
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = render(<CanvasSketch draw={draw} />);
    act(() => flushFrame(16));
    expect(draw).toHaveBeenCalledTimes(1);

    unmount();
    act(() => flushFrame(32));

    expect(draw).toHaveBeenCalledTimes(1);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
  });
});
