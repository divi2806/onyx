import { formatComplianceCsv, scanTransactions, toComplianceReport } from "@cloak.dev/sdk";
import { Connection } from "@solana/web3.js";
import { NextResponse } from "next/server";

import {
  appendAuditLog,
  redactComplianceReport,
  resolveAuditTokenForScan,
} from "@/lib/cloak/audit-capability-server";
import { cloakConfig } from "@/lib/cloak/config";
import { solanaConfig } from "@/lib/solana/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    if (payload.cluster !== solanaConfig.cluster) {
      throw new Error(`Token is for ${payload.cluster}, but this server is ${solanaConfig.cluster}.`);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Audit token rejected." },
      { status: 403 },
    );
  }

  const rpcUrl =
    process.env.CLOAK_SCAN_RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    solanaConfig.rpcUrl;
  const connection = new Connection(rpcUrl, "confirmed");

  try {
    const result = await scanTransactions({
      connection,
      programId: cloakConfig.programId,
      viewingKeyNk: hexToBytes(payload.nkHex),
      walletPublicKey: payload.wallet,
      afterTimestamp: payload.scope.afterTimestamp,
      beforeTimestamp: payload.scope.beforeTimestamp,
      batchSize: 5,
    });
    const report = redactComplianceReport(
      toComplianceReport(result),
      payload.redaction,
    );
    appendAuditLog(payload, {
      action: "scan",
      result: "allowed",
      ip: requestIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
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
    appendAuditLog(payload, {
      action: "scan",
      result: "denied",
      reason: err instanceof Error ? err.message : "scan failed",
      ip: requestIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed." },
      { status: 500 },
    );
  }
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function requestIp(req: Request): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined
  );
}
