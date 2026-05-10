"use client";

import {
  Download01Icon,
  FileSecurityIcon,
  Loading03Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import * as React from "react";

import { OnyxMark } from "@/components/logos";
import { Button } from "@/components/ui/button";
import { FancyButton } from "@/components/ui/fancy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EmptyWorkbench,
  FieldStack,
  InlineNotice,
  WorkbenchPanel,
} from "@/components/ui/workbench";
import type { AuditCapabilityPublic } from "@/lib/cloak/audit-capability-types";
import { cn } from "@/lib/utils";

type ScanState = "idle" | "scanning" | "done" | "error";

type TxRow = {
  txType: string;
  amount: number;
  fee: number;
  netAmount: number;
  runningBalance: number;
  timestamp: number;
  recipient: string;
  signature?: string;
  mint?: string;
  symbol?: string;
  decimals?: number;
};

type ReportSummary = {
  totalDeposits: number;
  totalWithdrawals: number;
  totalFees: number;
  netFlow: number;
  txCount: number;
};

export default function AuditPage() {
  const [token, setToken] = React.useState("");
  const [state, setState] = React.useState<ScanState>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<TxRow[]>([]);
  const [summary, setSummary] = React.useState<ReportSummary | null>(null);
  const [csvData, setCsvData] = React.useState<string | null>(null);
  const [dateRange, setDateRange] = React.useState<{ from: string; to: string } | null>(null);
  const [capability, setCapability] = React.useState<AuditCapabilityPublic | null>(null);

  const isLoading = state === "scanning";

  React.useEffect(() => {
    const trimmed = token.trim();
    const timer = window.setTimeout(() => {
      if (!trimmed.startsWith("onyx_audit_v2.")) {
        setCapability(null);
        return;
      }
      void inspectToken(trimmed).then(setCapability).catch(() => setCapability(null));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [token]);

  async function handleScan() {
    const trimmed = token.trim();
    if (!trimmed.startsWith("onyx_audit_v2.")) {
      setError("Paste a server-issued Onyx audit access token from the Audit Access page.");
      setState("error");
      return;
    }

    setState("scanning");
    setError(null);
    setRows([]);
    setSummary(null);
    setCsvData(null);
    setDateRange(null);

    try {
      const res = await fetch("/api/audit/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: trimmed }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `Scan failed (${res.status})`);
      }
      const body = (await res.json()) as {
        capability: AuditCapabilityPublic;
        csv: string;
        report: {
          transactions: TxRow[];
          summary: {
            totalDeposits: number;
            totalWithdrawals: number;
            totalFees: number;
          };
        };
      };
      const scannedCapability = body.capability;
      const report = body.report;

      const txs = report.transactions ?? [];
      const totalDeposits = txs
        .filter((tx) => tx.txType === "deposit")
        .reduce((sum, tx) => sum + tx.amount, 0);
      const totalWithdrawals = txs
        .filter((tx) => tx.txType === "withdraw")
        .reduce((sum, tx) => sum + tx.amount, 0);
      const totalFees = txs.reduce((sum, tx) => sum + tx.fee, 0);

      setSummary({
        totalDeposits,
        totalWithdrawals,
        totalFees,
        netFlow: totalDeposits - totalWithdrawals,
        txCount: txs.length,
      });
      setRows(txs);
      setCapability(scannedCapability);
      setDateRange({ from: scannedCapability.scope.from, to: scannedCapability.scope.to });
      setCsvData(typeof body.csv === "string" ? body.csv : null);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
      setState("error");
    }
  }

  function handleDownload() {
    if (!csvData || !dateRange) return;
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `onyx-audit-${dateRange.from}-to-${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex h-10 items-center gap-2 rounded-lg border border-border/70 bg-card/50 px-3">
            <OnyxMark className="size-5" />
            <span className="text-sm font-semibold">Onyx</span>
          </Link>
          <span className="text-sm text-muted-foreground">Audit console</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="grid gap-4">
          <div className="border-b border-border/70 pb-6">
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <HugeiconsIcon icon={FileSecurityIcon} size={14} strokeWidth={2} aria-hidden="true" />
              External audit
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Audit access scan</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Paste the audit access token shared by an Onyx wallet owner. The scan returns only the wallet, date range, and disclosure level authorized in that token.
            </p>
          </div>

          <WorkbenchPanel title="Audit token input" eyebrow="Scan">
            <div className="grid gap-5">
              <FieldStack>
                <Label htmlFor="vkToken" required>Audit access token</Label>
                <Input
                  id="vkToken"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste token"
                  className="font-mono"
                  disabled={isLoading}
                  spellCheck={false}
                  autoComplete="off"
                />
                {capability ? (
                  <p className="text-xs text-primary">
                    {capability.scope.from} to {capability.scope.to} · {capability.role} · {capability.redaction}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">The token is opaque. The raw Cloak viewing key and scope cannot be edited here.</p>
                )}
              </FieldStack>

              {error ? <InlineNotice tone="danger" title="Audit scan failed">{error}</InlineNotice> : null}

              <FancyButton
                type="button"
                variant="primary"
                size="xl"
                disabled={!token.trim() || isLoading}
                onClick={handleScan}
                className="justify-self-start"
              >
                {isLoading ? (
                  <HugeiconsIcon icon={Loading03Icon} size={16} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
                ) : (
                  <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2.2} aria-hidden="true" />
                )}
                {isLoading ? "Scanning blockchain" : "Run audit scan"}
              </FancyButton>
            </div>
          </WorkbenchPanel>

          {state === "done" && summary && dateRange ? (
            <Results
              rows={rows}
              summary={summary}
              dateRange={dateRange}
              onDownload={handleDownload}
            />
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <WorkbenchPanel title="How auditors use it" eyebrow="Read only">
            <div className="grid gap-3 text-sm text-muted-foreground">
              <p>No wallet connection is required.</p>
              <p>Paste the audit access token shared by the wallet owner.</p>
              <p>The server decrypts the token, enforces wallet, date, expiry, and redaction scope, then scans Cloak.</p>
              <p>CSV export uses only the scoped report returned by the scan endpoint.</p>
            </div>
          </WorkbenchPanel>
        </aside>
      </div>
    </main>
  );
}

async function inspectToken(token: string): Promise<AuditCapabilityPublic | null> {
  const res = await fetch("/api/audit/inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { capability?: AuditCapabilityPublic };
  return body.capability ?? null;
}

function Results({
  rows,
  summary,
  dateRange,
  onDownload,
}: {
  rows: TxRow[];
  summary: ReportSummary;
  dateRange: { from: string; to: string };
  onDownload: () => void;
}) {
  return (
    <WorkbenchPanel
      title="Scan results"
      eyebrow={`${dateRange.from} to ${dateRange.to}`}
      action={
        <Button type="button" variant="outline" onClick={onDownload}>
          <HugeiconsIcon icon={Download01Icon} size={14} strokeWidth={2} aria-hidden="true" />
          Download CSV
        </Button>
      }
    >
      <div className="grid gap-4">
        <InlineNotice tone="success" title="Scan complete">
          {summary.txCount} transactions found in the authorized range.
        </InlineNotice>

        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Transactions" value={String(summary.txCount)} />
          <Stat label="Deposits" value={fmtAmount(summary.totalDeposits, rows[0])} />
          <Stat label="Withdrawals" value={fmtAmount(summary.totalWithdrawals, rows[0])} />
          <Stat label="Fees" value={fmtAmount(summary.totalFees, rows[0])} />
        </div>

        {rows.length === 0 ? (
          <EmptyWorkbench title="No transactions found" description="The token is valid, but no matching rows exist in this date range." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/80">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-secondary/35 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Type</th>
                  <th className="px-3 py-3 text-right font-medium">Gross</th>
                  <th className="px-3 py-3 text-right font-medium">Fee</th>
                  <th className="px-3 py-3 text-right font-medium">Net</th>
                  <th className="px-3 py-3 font-medium">Recipient</th>
                  <th className="px-3 py-3 font-medium">Sig</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {rows.map((tx, index) => (
                  <tr key={`${tx.signature ?? tx.recipient}-${index}`} className="bg-background/20">
                    <td className="px-3 py-3 text-muted-foreground">{new Date(tx.timestamp).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <span className={cn("rounded-md border px-2 py-1 font-mono text-xs", tx.txType === "deposit" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-primary/25 bg-primary/10 text-primary")}>
                        {tx.txType}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{fmtAmount(tx.amount, tx)}</td>
                    <td className="px-3 py-3 text-right font-mono text-muted-foreground">{fmtAmount(tx.fee, tx)}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtAmount(tx.netAmount, tx)}</td>
                    <td className="px-3 py-3 font-mono text-muted-foreground">{shortAddr(tx.recipient)}</td>
                    <td className="px-3 py-3 font-mono text-muted-foreground">{tx.signature ? shortSig(tx.signature) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </WorkbenchPanel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/75 bg-secondary/25 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}

function fmtAmount(n: number, tx?: { symbol?: string; decimals?: number }): string {
  if (!n && n !== 0) return "-";
  if (n === 0) return "0";
  const symbol = tx?.symbol ?? "SOL";
  const decimals = tx?.decimals ?? 9;
  const human = n / 10 ** decimals;
  if (human < 0.000001) return `${n.toLocaleString()} base`;
  return `${human.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals === 9 ? 6 : 2,
  })} ${symbol}`;
}

function shortAddr(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function shortSig(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}
