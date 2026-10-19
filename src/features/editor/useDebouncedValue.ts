import { useEffect, useState } from 'react';

/** Mengikuti `value` dengan jeda: nilai baru baru dipakai bila tidak berubah lagi selama `ms`. */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [tunda, setTunda] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setTunda(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return tunda;
}
