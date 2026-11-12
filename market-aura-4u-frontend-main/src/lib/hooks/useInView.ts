import { useEffect, useRef, useState, type RefObject } from "react";

export interface UseInViewOptions {
  /**
   * Margin around the root element. Defaults to "200px 0px" so content starts
   * loading slightly before it enters the physical viewport.
   */
  rootMargin?: string;
  /**
   * Percentage of target's visibility needed to trigger (0.0 to 1.0).
   */
  threshold?: number | number[];
  /**
   * Once the element becomes visible, freeze it as visible so it does not
   * unmount when scrolling past. Defaults to true for card optimization.
   */
  triggerOnce?: boolean;
  /**
   * Default fallback state when IntersectionObserver is unsupported (e.g. jsdom / SSR).
   * Defaults to true for content visibility; set to false for infinite scroll sentinels.
   */
  fallbackInView?: boolean;
}

export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {},
): [RefObject<T | null>, boolean] {
  const {
    rootMargin = "200px 0px",
    threshold = 0.01,
    triggerOnce = true,
    fallbackInView = true,
  } = options;
  const ref = useRef<T | null>(null);

  // If IntersectionObserver is not available, respect fallbackInView.
  const isSupported = typeof window !== "undefined" && "IntersectionObserver" in window;
  const [inView, setInView] = useState<boolean>(() => (!isSupported ? fallbackInView : false));

  useEffect(() => {
    if (!isSupported) return;

    const element = ref.current;
    if (!element) return;

    // If already in view and triggerOnce is true, no need to observe again
    if (inView && triggerOnce) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isSupported, rootMargin, threshold, triggerOnce, fallbackInView, inView]);

  return [ref, inView];
}
