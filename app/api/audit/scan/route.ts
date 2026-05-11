import { formatComplianceCsv, scanTransactions, toComplianceReport } from "@cloak.dev/sdk";
import { Connection } from "@solana/web3.js";
import { NextResponse } from "next/server";

import {
  appendAuditLog,
  mergeSentEntriesIntoReport,
  redactComplianceReport,
  resolveAuditTokenForScan,
} from "@/lib/cloak/audit-capability-server";
import { getCloakConfig } from "@/lib/cloak/config";
import { defaultRpcUrlFor, solanaConfig, type SolanaCluster } from "@/lib/solana/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LIMIT_DEFAULT = 100;
const LIMIT_MAX = 1000;
const BATCH_SIZE = 5;
const SCAN_TIMEOUT_MS = 45_000;

export async function POST(req: Request) {
  let token = "";
  try {
    const body = (await req.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  let payload: ReturnType<typeof resolveAuditTokenForScan>;
  try {
    payload = resolveAuditTokenForScan(token);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Audit token rejected.";
    return NextResponse.json(
      { error: auditTokenError(reason) },
      { status: 403 },
    );
  }

  const cluster = payload.cluster;
  const cloakConfig = getCloakConfig(cluster);
  const rpcUrl = scanRpcUrl(cluster);
  const rpcHost = safeHost(rpcUrl);
  const connection = new Connection(rpcUrl, "confirmed");
  const startedAt = Date.now();

  try {
    const result = await withTimeout(
      scanTransactions({
        connection,
        programId: cloakConfig.programId,
        viewingKeyNk: hexToBytes(payload.nkHex),
        walletPublicKey: payload.wallet,
        afterTimestamp: payload.scope.afterTimestamp,
        beforeTimestamp: payload.scope.beforeTimestamp,
        limit: scanLimit(),
        batchSize: BATCH_SIZE,
      }),
      SCAN_TIMEOUT_MS,
    );
    const reportWithSent = mergeSentEntriesIntoReport(
      toComplianceReport(result),
      payload.sent,
    );
    const report = redactComplianceReport(
      reportWithSent,
      payload.redaction,
    );
    appendAuditLog(payload, {
      action: "scan",
      result: "allowed",
      ip: requestIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    console.log(
      `[audit-scan] ok cluster=${cluster} host=${rpcHost} wallet=${payload.wallet.slice(0, 6)}... txs=${report.transactions.length} rpc=${report.rpcCallsMade} elapsed=${Date.now() - startedAt}ms`,
    );
    return NextResponse.json({
      capability: {
        tokenId: payload.tokenId,
        auditor: payload.auditor,
        wallet: payload.wallet,
        issuer: payload.issuer,
        cluster: payload.cluster,
        role: payload.role,
        redaction: payload.redaction,
        scope: payload.scope,
        issuedAt: payload.issuedAt,
        expiresAt: payload.expiresAt,
        revoked: false,
        expired: false,
      },
      report,
      csv: formatComplianceCsv(report),
    });
  } catch (err) {
    const message = scanErrorMessage(err);
    appendAuditLog(payload, {
      action: "scan",
      result: "denied",
      reason: message,
      ip: requestIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    console.error(
      `[audit-scan] err cluster=${cluster} host=${rpcHost} wallet=${payload.wallet.slice(0, 6)}... elapsed=${Date.now() - startedAt}ms - ${message}`,
    );
    return NextResponse.json(
      { error: message },
      { status: message === "scan-timeout" ? 504 : 500 },
    );
  }
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

function scanLimit(): number {
  const raw = Number.parseInt(process.env.CLOAK_SCAN_LIMIT ?? "", 10);
  if (!Number.isFinite(raw) || raw <= 0) return LIMIT_DEFAULT;
  return Math.min(LIMIT_MAX, Math.floor(raw));
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
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

function auditTokenError(reason: string): string {
  if (/revoked|expired/i.test(reason)) return reason;
  return "Audit token could not be opened. Create a fresh audit access token from the same deployment and make sure ONYX_AUDIT_TOKEN_SECRET did not change.";
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

function requestIp(req: Request): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined
  );
}
