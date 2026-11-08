import { useEffect, useState } from "react";

/**
 * A value that lags its input until the input has been still for a moment.
 *
 * Dragging a handle changes the generating density on every pointer move, and
 * starting a fit on each of those throws away the one before it after a few
 * steps. Waiting for the drag to settle means the shapes follow the pointer
 * while only the last of them is fitted.
 */
export function useSettled<T>(value: T, ms = 120): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(timer);
  }, [ms, value]);
  return settled;
}
