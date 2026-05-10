"use client";

import * as React from "react";

import { getCloakConfig, type CloakConfig } from "@/lib/cloak/config";

import {
  defaultRpcUrlFor,
  defaultWsUrlFor,
  solanaConfig,
  type SolanaCluster,
} from "./config";

const STORAGE_KEY = "onyx:solana-network:v1";
const SWITCHABLE_CLUSTERS = ["mainnet-beta", "devnet"] as const;

export type SwitchableCluster = (typeof SWITCHABLE_CLUSTERS)[number];

export type ActiveSolanaConfig = {
  cluster: SwitchableCluster;
  rpcUrl: string;
  wsUrl: string;
};

type SolanaNetworkContextValue = {
  config: ActiveSolanaConfig;
  cloakConfig: CloakConfig;
  isDefaultCluster: boolean;
  switchCluster: (cluster: SwitchableCluster) => void;
  toggleCluster: () => void;
};

const SolanaNetworkContext =
  React.createContext<SolanaNetworkContextValue | null>(null);

export function SolanaNetworkProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cluster, setCluster] = React.useState<SwitchableCluster>(() =>
    initialCluster(),
  );

  const config = React.useMemo<ActiveSolanaConfig>(
    () => ({
      cluster,
      rpcUrl:
        cluster === solanaConfig.cluster
          ? solanaConfig.rpcUrl
          : defaultRpcUrlFor(cluster),
      wsUrl:
        cluster === solanaConfig.cluster
          ? solanaConfig.wsUrl
          : defaultWsUrlFor(cluster),
    }),
    [cluster],
  );

  const cloak = React.useMemo(() => getCloakConfig(cluster), [cluster]);

  const switchCluster = React.useCallback((next: SwitchableCluster) => {
    setCluster(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-critical. The active session still switches.
    }
  }, []);

  const toggleCluster = React.useCallback(() => {
    switchCluster(cluster === "devnet" ? "mainnet-beta" : "devnet");
  }, [cluster, switchCluster]);

  const value = React.useMemo<SolanaNetworkContextValue>(
    () => ({
      config,
      cloakConfig: cloak,
      isDefaultCluster: cluster === normalizeCluster(solanaConfig.cluster),
      switchCluster,
      toggleCluster,
    }),
    [cloak, cluster, config, switchCluster, toggleCluster],
  );

  return (
    <SolanaNetworkContext.Provider value={value}>
      {children}
    </SolanaNetworkContext.Provider>
  );
}

export function useSolanaNetwork(): SolanaNetworkContextValue {
  const context = React.useContext(SolanaNetworkContext);
  if (!context) {
    throw new Error("useSolanaNetwork must be used inside SolanaNetworkProvider.");
  }
  return context;
}

function initialCluster(): SwitchableCluster {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isSwitchableCluster(stored)) return stored;
    } catch {
      // Fall back to the build-time cluster.
    }
  }
  return normalizeCluster(solanaConfig.cluster);
}

function normalizeCluster(cluster: SolanaCluster): SwitchableCluster {
  return isSwitchableCluster(cluster) ? cluster : "devnet";
}

function isSwitchableCluster(value: unknown): value is SwitchableCluster {
  return (
    typeof value === "string" &&
    SWITCHABLE_CLUSTERS.includes(value as SwitchableCluster)
  );
}
