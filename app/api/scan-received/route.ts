import { scanTransactions, toComplianceReport } from "@cloak.dev/sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { getCloakConfig } from "@/lib/cloak/config";
import { defaultRpcUrlFor, solanaConfig, type SolanaCluster } from "@/lib/solana/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LIMIT_DEFAULT = 100;
const LIMIT_MAX = 1000;
const BATCH_SIZE = 5;
const SCAN_TIMEOUT_MS = 45_000;

type ScanRequest = {
  wallet?: unknown;
  cluster?: unknown;
  untilSignature?: unknown;
  limit?: unknown;
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
  const rpcHost = safeHost(rpcUrl);
  const connection = new Connection(rpcUrl, "confirmed");
  const limit = scanLimit(body.limit);
  const startedAt = Date.now();

  try {
    const result = await withTimeout(
      scanTransactions({
        connection,
        programId: cloakConfig.programId,
        viewingKeyNk,
        walletPublicKey: walletPk.toBase58(),
        untilSignature,
        afterTimestamp,
        beforeTimestamp,
        limit,
        batchSize: BATCH_SIZE,
      }),
      SCAN_TIMEOUT_MS,
    );
    const report = toComplianceReport(result);
    console.log(
      `[scan-received] ok cluster=${cluster} host=${rpcHost} wallet=${walletPk.toBase58().slice(0, 6)}... limit=${limit} txs=${report.transactions.length} rpc=${report.rpcCallsMade} elapsed=${Date.now() - startedAt}ms`,
    );
    return NextResponse.json({ report });
  } catch (err) {
    const message = scanErrorMessage(err);
    const status = message === "scan-timeout" ? 504 : 500;
    console.error(
      `[scan-received] err cluster=${cluster} host=${rpcHost} wallet=${walletPk.toBase58().slice(0, 6)}... status=${status} elapsed=${Date.now() - startedAt}ms - ${message}`,
    );
    return NextResponse.json({ error: message }, { status });
  }
}

function parseCluster(value: unknown): SolanaCluster {
  if (value === "mainnet-beta" || value === "devnet") return value;
  return solanaConfig.cluster;
}

function scanRpcUrl(cluster: SolanaCluster): string {
  const clusterRpc =
    cluster === "mainnet-beta"
      ? process.env.CLOAK_SCAN_RPC_URL_MAINNET
      : cluster === "devnet"
        ? process.env.CLOAK_SCAN_RPC_URL_DEVNET
        : undefined;
  if (clusterRpc) return clusterRpc;
  if (cluster === solanaConfig.cluster) {
    return (
      process.env.CLOAK_SCAN_RPC_URL ??
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
      solanaConfig.rpcUrl
    );
  }
  return defaultRpcUrlFor(cluster);
}

function scanLimit(raw: unknown): number {
  const fromBody = typeof raw === "number" ? raw : Number.NaN;
  const fromEnv = Number.parseInt(process.env.CLOAK_SCAN_LIMIT ?? "", 10);
  const value = Number.isFinite(fromBody) ? fromBody : fromEnv;
  if (!Number.isFinite(value) || value <= 0) return LIMIT_DEFAULT;
  return Math.min(LIMIT_MAX, Math.floor(value));
}

function scanErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message === "scan-timeout") {
    return "scan-timeout";
  }
  if (/429|too many requests|rate.?limit/i.test(message)) {
    return "Solana RPC rate limit hit while scanning. Use a dedicated CLOAK_SCAN_RPC_URL_DEVNET/CLOAK_SCAN_RPC_URL_MAINNET RPC or try again with fewer recent transactions.";
  }
  return message || "Scan failed.";
}

function safeHost(rpcUrl: string): string {
  try {
    return new URL(rpcUrl).host;
  } catch {
    return "unknown";
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const handle = setTimeout(() => reject(new Error("scan-timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(handle);
        resolve(value);
      },
      (err) => {
        clearTimeout(handle);
        reject(err);
      },
    );
  });
}
