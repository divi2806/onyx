import { PublicKey } from "@solana/web3.js";

import { solanaConfig, type SolanaCluster } from "@/lib/solana/config";

type CloakClusterConfig = {
  programId: PublicKey;
  relayUrl: string;
};

export type CloakConfig = CloakClusterConfig;

const CLUSTER_CONFIG: Partial<Record<SolanaCluster, CloakClusterConfig>> = {
  "mainnet-beta": {
    programId: new PublicKey("zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW"),
    relayUrl: "https://api.cloak.ag",
  },
  devnet: {
    programId: new PublicKey("Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h"),
    relayUrl: "https://api.devnet.cloak.ag",
  },
};

function requireCloakConfig(cluster: SolanaCluster): CloakClusterConfig {
  const fromCluster = CLUSTER_CONFIG[cluster];
  if (!fromCluster) {
    throw new Error(
      `Cloak is not configured for cluster "${cluster}". Set NEXT_PUBLIC_SOLANA_CLUSTER to "mainnet-beta" or "devnet".`,
    );
  }
  return fromCluster;
}

export function getCloakConfig(cluster: SolanaCluster): CloakConfig {
  const fromCluster = requireCloakConfig(cluster);
  const relayOverride =
    cluster === solanaConfig.cluster
      ? process.env.NEXT_PUBLIC_CLOAK_RELAY_URL
      : undefined;
  return {
    programId: fromCluster.programId,
    relayUrl: relayOverride ?? fromCluster.relayUrl,
  };
}

export const cloakConfig = getCloakConfig(solanaConfig.cluster);

export const SHIELD_DEPOSIT_MIN_LAMPORTS = 10_000_000n;
