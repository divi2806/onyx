import { NextResponse } from "next/server";

import { listAuditLogs } from "@/lib/cloak/audit-capability-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const wallet = url.searchParams.get("wallet") ?? undefined;
  return NextResponse.json({ logs: listAuditLogs(wallet).slice(0, 50) });
}
