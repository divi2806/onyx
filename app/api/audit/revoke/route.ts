import { NextResponse } from "next/server";

import {
  appendAuditLog,
  revokeAuditToken,
} from "@/lib/cloak/audit-capability-server";
import type {
  AuditRedactionMode,
  AuditRole,
} from "@/lib/cloak/audit-capability-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: {
    tokenId?: unknown;
    wallet?: unknown;
    auditor?: unknown;
    role?: unknown;
    redaction?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tokenId = typeof body.tokenId === "string" ? body.tokenId.trim() : "";
  if (!tokenId) return NextResponse.json({ error: "Missing tokenId" }, { status: 400 });

  revokeAuditToken(tokenId);
  appendAuditLog(
    {
      tokenId,
      wallet: typeof body.wallet === "string" ? body.wallet : "unknown",
      auditor: typeof body.auditor === "string" ? body.auditor : "unknown",
      role: (typeof body.role === "string" ? body.role : "external-auditor") as AuditRole,
      redaction: (typeof body.redaction === "string" ? body.redaction : "full") as AuditRedactionMode,
    },
    {
      action: "revoke",
      result: "allowed",
      ip: requestIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    },
  );
  return NextResponse.json({ ok: true });
}

function requestIp(req: Request): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined
  );
}
