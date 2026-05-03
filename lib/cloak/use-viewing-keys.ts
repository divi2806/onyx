"use client";

import * as React from "react";

import { useWallet } from "@solana/wallet-adapter-react";

import { solanaConfig } from "@/lib/solana/config";

import {
  loadViewingKeys,
  viewingKeysStorageEvent,
  type ViewingKey,
} from "./viewing-keys";

const EMPTY: ViewingKey[] = [];

export function useViewingKeys(): ViewingKey[] {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";

  // useSyncExternalStore requires getSnapshot to return the same reference
  // when data hasn't changed. loadViewingKeys parses JSON fresh each call,
  // so we cache by serialized value and only return a new reference on change.
  const cacheRef = React.useRef<{ value: ViewingKey[]; json: string }>({
    value: EMPTY,
    json: "",
  });

  const subscribe = React.useCallback(
    (notify: () => void) => {
      if (typeof window === "undefined") return () => {};
      const onCustom = (e: Event) => {
        const detail = (e as CustomEvent<{ cluster: string; wallet: string }>).detail;
        if (!detail) return;
        if (detail.cluster === solanaConfig.cluster && detail.wallet === wallet) notify();
      };
      const onStorage = (e: StorageEvent) => {
        if (e.key?.startsWith("onyx:viewing-keys:v1:")) notify();
      };
      const ev = viewingKeysStorageEvent();
      window.addEventListener(ev, onCustom);
      window.addEventListener("storage", onStorage);
      return () => {
        window.removeEventListener(ev, onCustom);
        window.removeEventListener("storage", onStorage);
      };
    },
    [wallet],
  );

  const getSnapshot = React.useCallback((): ViewingKey[] => {
    if (!wallet || typeof window === "undefined") return EMPTY;
    const fresh = loadViewingKeys(solanaConfig.cluster, wallet);
    const json = JSON.stringify(fresh);
    if (json === cacheRef.current.json) return cacheRef.current.value;
    cacheRef.current = { value: fresh, json };
    return fresh;
  }, [wallet]);

  return React.useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
