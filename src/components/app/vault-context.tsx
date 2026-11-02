"use client";

import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import type { OwnedFileDTO, UsageDTO } from "@/lib/types";

type Listener = (file: OwnedFileDTO) => void;

type VaultContextValue = {
  usage: UsageDTO;
  setUsage: (usage: UsageDTO) => void;
  adjustUsage: (deltaBytes: number, deltaCount: number) => void;
  /** Uploads announce finished files; the vault list subscribes. */
  announceUploaded: (file: OwnedFileDTO) => void;
  onUploaded: (listener: Listener) => () => void;
};

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ initialUsage, children }: { initialUsage: UsageDTO; children: ReactNode }) {
  const [usage, setUsage] = useState(initialUsage);
  const listeners = useRef(new Set<Listener>());

  const adjustUsage = useCallback((deltaBytes: number, deltaCount: number) => {
    setUsage((u) => ({ ...u, used: Math.max(0, u.used + deltaBytes), count: Math.max(0, u.count + deltaCount) }));
  }, []);

  const announceUploaded = useCallback((file: OwnedFileDTO) => {
    listeners.current.forEach((l) => l(file));
  }, []);

  const onUploaded = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => void listeners.current.delete(listener);
  }, []);

  const value = useMemo(
    () => ({ usage, setUsage, adjustUsage, announceUploaded, onUploaded }),
    [usage, adjustUsage, announceUploaded, onUploaded],
  );
  return <VaultContext value={value}>{children}</VaultContext>;
}

export function useVault() {
  const ctx = use(VaultContext);
  if (!ctx) throw new Error("useVault must be used inside VaultProvider");
  return ctx;
}
