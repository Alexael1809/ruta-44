/**
 * @file use-debounce.ts
 * Generic debounce hook for throttling rapid user input (e.g. search bars).
 */

import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delayMs: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
