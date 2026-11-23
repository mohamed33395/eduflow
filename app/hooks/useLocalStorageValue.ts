"use client";

import { useSyncExternalStore } from "react";

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Read a localStorage key reactively.
 *
 * SSR-safe: returns `""` on the server and on first client render, then the
 * real value after hydration — identical semantics to reading it in an
 * effect, without a synchronous setState inside one.
 */
export function useLocalStorageValue(key: string): string {
  return useSyncExternalStore(
    subscribeToStorage,
    () => localStorage.getItem(key) ?? "",
    () => ""
  );
}
