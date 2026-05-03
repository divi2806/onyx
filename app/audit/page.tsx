"use client";

import {
  CheckmarkCircle01Icon,
  Download01Icon,
  FileSecurityIcon,
  Loading03Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import * as React from "react";

import { OnyxMark } from "@/components/logos";
import { FancyButton } from "@/components/ui/fancy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { decodeViewingKeyToken } from "@/lib/cloak/viewing-keys";
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

  const tokenDecoded = React.useMemo(() => decodeViewingKeyToken(token.trim()), [token]);

  async function handleScan() {
    const parsed = decodeViewingKeyToken(token.trim());
    if (!parsed) {
      setError("Invalid token. Paste the base64 token issued from the Compliance page.");
      return;
    }

    setState("scanning");
    setError(null);
    setRows([]);
    setSummary(null);
    setCsvData(null);
    setDateRange({ from: parsed.from, to: parsed.to });

    try {
      // Convert ISO date strings → millisecond timestamps.
      // The SDK's afterTimestamp/beforeTimestamp are inclusive ms boundaries.
      const afterTimestamp = new Date(parsed.from).getTime();
      const beforeTimestamp = new Date(parsed.to).getTime() + 86_400_000 - 1;

      const res = await fetch("/api/scan-received", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: parsed.wallet,
          viewingKeyNk: parsed.nk,
          afterTimestamp,
          beforeTimestamp,
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `Scan failed (${res.status})`);
      }

      const { report } = (await res.json()) as {
        report: {
          transactions: TxRow[];
          summary: {
            totalDeposits: number;
            totalWithdrawals: number;
            totalFees: number;
            netFlow?: number;
          };
        };
      };

      const txs = report.transactions ?? [];

      // Build local summary from the already-filtered rows.
      const totalDeposits = txs
        .filter((t) => t.txType === "deposit")
        .reduce((s, t) => s + t.amount, 0);
      const totalWithdrawals = txs
        .filter((t) => t.txType === "withdraw")
        .reduce((s, t) => s + t.amount, 0);
      const totalFees = txs.reduce((s, t) => s + t.fee, 0);

      setSummary({
        totalDeposits,
        totalWithdrawals,
        totalFees,
        netFlow: totalDeposits - totalWithdrawals,
        txCount: txs.length,
      });
      setRows(txs);

      // The report from the API is already a ComplianceReport — pass directly.
      const { formatComplianceCsv } = await import("@cloak.dev/sdk");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCsvData(formatComplianceCsv(report as any));
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

  const isLoading = state === "scanning";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Minimal nav */}
      <header className="flex h-14 items-center gap-3 border-b border-border px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <OnyxMark className="size-6" />
          <span className="text-[15px] font-semibold tracking-tight">Onyx</span>
        </Link>
        <div className="h-5 w-px bg-border" />
        <span className="text-[13px] text-muted-foreground">Audit Portal</span>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
        {/* Page header */}
        <div className="mb-10 flex items-start gap-4">
          <div className="grid size-12 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <HugeiconsIcon icon={FileSecurityIcon} size={22} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
              Viewing Key Audit
            </h1>
            <p className="mt-1 text-[13.5px] leading-5 text-muted-foreground">
              Paste the token issued by your counterparty. Onyx scans the Cloak shielded
              pool using the embedded NK and returns a verifiable ledger for the
              authorised date range — no wallet required.
            </p>
          </div>
        </div>

        {/* Input card */}
        <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
          <div className="flex flex-col gap-2">
            <Label htmlFor="vkToken">Viewing key token</Label>
            <Input
              id="vkToken"
              placeholder="Paste the base64 token here…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="font-mono text-[12.5px]"
              disabled={isLoading}
            />
            {tokenDecoded && (
              <p className="text-[11.5px] text-primary">
                Range: {tokenDecoded.from} → {tokenDecoded.to} · wallet{" "}
                {tokenDecoded.wallet.slice(0, 6)}…{tokenDecoded.wallet.slice(-4)}
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
              {error}
            </p>
          )}

          <FancyButton
            variant="primary"
            size="lg"
            className="self-start"
            onClick={handleScan}
            disabled={!token.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={14}
                  strokeWidth={2.2}
                  className="animate-spin"
                />
                Scanning blockchain…
              </>
            ) : (
              <>
                Run audit scan
                <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={2.2} />
              </>
            )}
          </FancyButton>
        </div>

        {/* Results */}
        {state === "done" && summary && dateRange && (
          <div className="mt-8 flex flex-col gap-6">

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Transactions", value: String(summary.txCount) },
                { label: "Deposits", value: fmtAmount(summary.totalDeposits, rows[0]) },
                { label: "Withdrawals", value: fmtAmount(summary.totalWithdrawals, rows[0]) },
                { label: "Fees", value: fmtAmount(summary.totalFees, rows[0]) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-card/60 p-4"
                >
                  <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1 font-mono text-[16px] font-medium text-foreground">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Download bar */}
            <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-2 text-[13px] text-foreground">
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={15}
                  strokeWidth={2}
                  className="text-primary"
                />
                Scan complete · {dateRange.from} → {dateRange.to}
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-[12.5px] font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <HugeiconsIcon icon={Download01Icon} size={13} strokeWidth={2} />
                Download CSV
              </button>
            </div>

            {/* Transaction table */}
            {rows.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-left text-[12.5px]">
                  <thead>
                    <tr className="border-b border-border bg-card/60">
                      {["Date", "Type", "Gross", "Fee", "Net", "Recipient", "Sig"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 font-medium text-muted-foreground"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((tx, i) => (
                      <tr
                        key={i}
                        className={cn(
                          "border-b border-border/60",
                          i % 2 === 0 ? "bg-background/40" : "bg-card/40",
                        )}
                      >
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 font-mono text-[11px]",
                              tx.txType === "deposit"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : tx.txType === "withdraw"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-primary/10 text-primary",
                            )}
                          >
                            {tx.txType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-foreground">
                          {fmtAmount(tx.amount, tx)}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-muted-foreground">
                          {fmtAmount(tx.fee, tx)}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-foreground/80">
                          {fmtAmount(tx.netAmount, tx)}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-muted-foreground">
                          {tx.recipient.slice(0, 4)}…{tx.recipient.slice(-4)}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-muted-foreground/70">
                          {tx.signature ? `${tx.signature.slice(0, 6)}…` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-center text-[13px] text-muted-foreground">
                No transactions found in this date range.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Format an amount using the token context from the tx row.
 * SOL = 9 decimals, USDC/USDT = 6 decimals, unknown = show lamports.
 */
function fmtAmount(n: number, tx?: { symbol?: string; decimals?: number }): string {
  if (!n && n !== 0) return "—";
  if (n === 0) return "0";
  const sym = tx?.symbol ?? "SOL";
  const dec = tx?.decimals ?? 9;
  const human = n / 10 ** dec;
  if (human < 0.000001) return `${n.toLocaleString()} base`;
  return `${human.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: dec === 9 ? 6 : 2,
  })} ${sym}`;
}
