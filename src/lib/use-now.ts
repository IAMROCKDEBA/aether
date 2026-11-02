"use client";

import { useSyncExternalStore } from "react";

// One shared 1-second clock for every countdown on screen, instead of one timer each.
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export const useNow = () =>
  useSyncExternalStore(
    subscribe,
    () => now,
    () => now,
  );
