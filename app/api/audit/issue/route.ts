import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import {
  AUDIT_REDACTION_MODES,
  AUDIT_ROLES,
  type AuditRedactionMode,
  type AuditRole,
} from "@/lib/cloak/audit-capability-types";
import { issueAuditToken } from "@/lib/cloak/audit-capability-server";
import { solanaConfig, type SolanaCluster } from "@/lib/solana/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IssueBody = {
  auditor?: unknown;
  wallet?: unknown;
  issuer?: unknown;
  nkHex?: unknown;
  role?: unknown;
  redaction?: unknown;
  dateFrom?: unknown;
  dateTo?: unknown;
  expiresInDays?: unknown;
  cluster?: unknown;
};

export async function POST(req: Request) {
  let body: IssueBody;
  try {
    body = (await req.json()) as IssueBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const auditor = requireText(body.auditor, "auditor").slice(0, 80);
    const wallet = requirePubkey(body.wallet, "wallet");
    const issuer = requirePubkey(body.issuer ?? body.wallet, "issuer");
    const nkHex = requireNk(body.nkHex);
    const dateFrom = requireDate(body.dateFrom, "dateFrom");
    const dateTo = requireDate(body.dateTo, "dateTo");
    const role = parseRole(body.role);
    const redaction = parseRedaction(body.redaction);
    const expiresInDays =
      typeof body.expiresInDays === "number"
        ? Math.max(1, Math.min(365, Math.floor(body.expiresInDays)))
        : 30;
    const cluster =
      typeof body.cluster === "string" ? (body.cluster as SolanaCluster) : solanaConfig.cluster;
    if (cluster !== solanaConfig.cluster) {
      return NextResponse.json(
        { error: `Token cluster ${cluster} does not match server cluster ${solanaConfig.cluster}.` },
        { status: 400 },
      );
    }

    const { token, capability } = issueAuditToken({
      auditor,
      wallet,
      issuer,
      cluster,
      nkHex,
      role,
      redaction,
      dateFrom,
      dateTo,
      expiresAt: Date.now() + expiresInDays * 86_400_000,
    });

    return NextResponse.json({ token, capability });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to issue audit token." },
      { status: 400 },
    );
  }
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing ${field}.`);
  }
  return value.trim();
}

function requireDate(value: unknown, field: string): string {
  const text = requireText(value, field);
  const ms = Date.parse(text);
  if (!Number.isFinite(ms)) throw new Error(`Invalid ${field}.`);
  return text;
}

function requirePubkey(value: unknown, field: string): string {
  const text = requireText(value, field);
  try {
    return new PublicKey(text).toBase58();
  } catch {
    throw new Error(`Invalid ${field} public key.`);
  }
}

function requireNk(value: unknown): string {
  const text = requireText(value, "nkHex").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(text)) throw new Error("Invalid viewing key.");
  return text;
}

function parseRole(value: unknown): AuditRole {
  return AUDIT_ROLES.some((role) => role.id === value)
    ? (value as AuditRole)
    : "external-auditor";
}

function parseRedaction(value: unknown): AuditRedactionMode {
  return AUDIT_REDACTION_MODES.some((mode) => mode.id === value)
    ? (value as AuditRedactionMode)
    : "full";
}
