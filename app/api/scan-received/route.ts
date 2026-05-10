import { scanTransactions, toComplianceReport } from "@cloak.dev/sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { getCloakConfig } from "@/lib/cloak/config";
import { defaultRpcUrlFor, solanaConfig, type SolanaCluster } from "@/lib/solana/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScanRequest = {
  wallet?: unknown;
  cluster?: unknown;
  untilSignature?: unknown;
  // Hex-encoded 32-byte nsk from deriveNk(). Falls back to zeroed bytes
  // (ATA-matching only) when absent.
  viewingKeyNk?: unknown;
  // Optional millisecond timestamps for date-scoped audit exports.
  // Passed directly to scanTransactions so the SDK does the filtering.
  afterTimestamp?: unknown;
  beforeTimestamp?: unknown;
};

export async function POST(req: Request) {
  let body: ScanRequest;
  try {
    body = (await req.json()) as ScanRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const wallet = typeof body.wallet === "string" ? body.wallet.trim() : "";
  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet" }, { status: 400 });
  }
  let walletPk: PublicKey;
  try {
    walletPk = new PublicKey(wallet);
  } catch {
    return NextResponse.json({ error: "Invalid wallet pubkey" }, { status: 400 });
  }

  const untilSignature =
    typeof body.untilSignature === "string" && body.untilSignature.trim()
      ? body.untilSignature.trim()
      : undefined;
  const cluster = parseCluster(body.cluster);

  // Decode hex NK — fall back to zeroed bytes (ATA-only scan via walletPublicKey).
  let viewingKeyNk = new Uint8Array(32);
  if (typeof body.viewingKeyNk === "string" && body.viewingKeyNk.length === 64) {
    const hex = body.viewingKeyNk;
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    viewingKeyNk = bytes;
  }

  // Timestamp filters: let the SDK handle filtering so the response is already
  // scoped to the requested range and callers don't need to post-process.
  const afterTimestamp =
    typeof body.afterTimestamp === "number" ? body.afterTimestamp : undefined;
  const beforeTimestamp =
    typeof body.beforeTimestamp === "number" ? body.beforeTimestamp : undefined;

  const cloakConfig = getCloakConfig(cluster);
  const rpcUrl = scanRpcUrl(cluster);
  const connection = new Connection(rpcUrl, "confirmed");

  try {
    const result = await scanTransactions({
      connection,
      programId: cloakConfig.programId,
      viewingKeyNk,
      walletPublicKey: walletPk.toBase58(),
      untilSignature,
      afterTimestamp,
      beforeTimestamp,
      // Default 50 fires 50 parallel getTransaction calls, tripping Helius
      // free-tier (~10 RPS). 5 keeps us under without hammering retries.
      batchSize: 5,
    });
    const report = toComplianceReport(result);
    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[scan-received] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseCluster(value: unknown): SolanaCluster {
  if (value === "mainnet-beta" || value === "devnet") return value;
  return solanaConfig.cluster;
}

function scanRpcUrl(cluster: SolanaCluster): string {
  if (cluster === solanaConfig.cluster) {
    return (
      process.env.CLOAK_SCAN_RPC_URL ??
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
      solanaConfig.rpcUrl
    );
  }
  return defaultRpcUrlFor(cluster);
}
