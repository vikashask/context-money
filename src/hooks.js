import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Debounce a value by delay ms
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Debounce a callback
 */
export function useDebouncedCallback(callback, delay = 300) {
  const ref = useRef(null);

  useEffect(() => {
    return () => {
      if (ref.current) clearTimeout(ref.current);
    };
  }, []);

  return useCallback(
    (...args) => {
      if (ref.current) clearTimeout(ref.current);
      ref.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay],
  );
}

/**
 * Intersection observer hook for lazy loading
 */
export function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect(); // Only trigger once
      }
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}
