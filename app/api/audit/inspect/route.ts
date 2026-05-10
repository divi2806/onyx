import { NextResponse } from "next/server";

import {
  appendAuditLog,
  inspectAuditToken,
} from "@/lib/cloak/audit-capability-server";

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

  try {
    const capability = inspectAuditToken(token);
    appendAuditLog(capability, {
      action: "inspect",
      result: capability.revoked || capability.expired ? "denied" : "allowed",
      reason: capability.revoked ? "revoked" : capability.expired ? "expired" : undefined,
      ip: requestIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json({ capability });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to inspect token." },
      { status: 400 },
    );
  }
}

function requestIp(req: Request): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined
  );
}
