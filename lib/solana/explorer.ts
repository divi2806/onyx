import { solanaConfig, type SolanaCluster } from "./config";

function clusterSuffix(cluster = solanaConfig.cluster): string {
  return cluster === "mainnet-beta"
    ? ""
    : `?cluster=${cluster}`;
}

export function explorerTxUrl(
  signature: string,
  cluster = solanaConfig.cluster,
): string {
  return `https://explorer.solana.com/tx/${signature}${clusterSuffix(cluster)}`;
}

export function explorerAddressUrl(
  addressString: string,
  cluster = solanaConfig.cluster,
): string {
  return `https://explorer.solana.com/address/${addressString}${clusterSuffix(cluster)}`;
}

function solscanSuffix(
  cluster: SolanaCluster = solanaConfig.cluster,
  rpcUrl = solanaConfig.rpcUrl,
): string {
  switch (cluster) {
    case "mainnet-beta":
      return "";
    case "devnet":
      return "?cluster=devnet";
    case "testnet":
      return "?cluster=testnet";
    case "localnet":
      return `?cluster=custom&customUrl=${encodeURIComponent(rpcUrl)}`;
  }
}

export function solscanTxUrl(
  signature: string,
  cluster: SolanaCluster = solanaConfig.cluster,
  rpcUrl = solanaConfig.rpcUrl,
): string {
  return `https://solscan.io/tx/${signature}${solscanSuffix(cluster, rpcUrl)}`;
}

export function solscanAddressUrl(
  address: string,
  cluster: SolanaCluster = solanaConfig.cluster,
  rpcUrl = solanaConfig.rpcUrl,
): string {
  return `https://solscan.io/account/${address}${solscanSuffix(cluster, rpcUrl)}`;
}
