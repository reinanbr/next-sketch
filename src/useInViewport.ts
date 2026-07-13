'use client';

import { useEffect, useState } from 'react';

export interface UseInViewportOptions {
  /** Forwarded to IntersectionObserver. Default: '200px'. */
  rootMargin?: string;
  /**
   * Once true, stays true forever after the first intersection (old
   * "mount once" behavior — cheap sketches that shouldn't restart on
   * every scroll in/out). Once false, tracks intersection continuously,
   * which is what lets a WebGL sketch actually unmount and free its
   * context budget slot when scrolled away. Default: false.
   */
  once?: boolean;
}

/**
 * Tracks whether `ref`'s element is inside the viewport (+ rootMargin).
 * Used to lazily mount expensive sketches (canvas/WebGL) only while
 * they're actually visible.
 */
export function useInViewport(
  ref: React.RefObject<Element | null>,
  { rootMargin = '200px', once = false }: UseInViewportOptions = {},
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const obs = new IntersectionObserver(
      (entries) => {
        const isIntersecting = !!entries[0]?.isIntersecting;
        if (isIntersecting) {
          setInView(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current, rootMargin, once]);

  return inView;
}
