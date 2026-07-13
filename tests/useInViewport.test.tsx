import { createRef } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { useInViewport } from '../src/useInViewport';

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

function Probe({ once, onValue }: { once?: boolean; onValue: (v: boolean) => void }) {
  const ref = createRef<HTMLDivElement>();
  const inView = useInViewport(ref, { once });
  onValue(inView);
  return <div ref={ref} />;
}

describe('useInViewport', () => {
  beforeEach(() => {
    observers = [];
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = FakeIntersectionObserver;
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('starts out of view and flips to true when the element intersects', () => {
    const values: boolean[] = [];
    render(<Probe onValue={(v) => values.push(v)} />);

    expect(values.at(-1)).toBe(false);
    act(() => observers[0]!.fire(true));
    expect(values.at(-1)).toBe(true);
  });

  it('with once=false, flips back to false when the element leaves the viewport', () => {
    const values: boolean[] = [];
    render(<Probe once={false} onValue={(v) => values.push(v)} />);

    act(() => observers[0]!.fire(true));
    expect(values.at(-1)).toBe(true);

    act(() => observers[0]!.fire(false));
    expect(values.at(-1)).toBe(false);
  });

  it('with once=true, stays true after the element leaves the viewport', () => {
    const values: boolean[] = [];
    const disconnectSpy = jest.spyOn(FakeIntersectionObserver.prototype, 'disconnect');
    render(<Probe once onValue={(v) => values.push(v)} />);

    act(() => observers[0]!.fire(true));
    expect(values.at(-1)).toBe(true);
    expect(disconnectSpy).toHaveBeenCalled();

    act(() => observers[0]!.fire(false));
    expect(values.at(-1)).toBe(true);
  });
});
