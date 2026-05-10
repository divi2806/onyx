"use client";

import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Calendar03Icon,
  EyeIcon,
  Loading03Icon,
  Refresh01Icon,
  Search01Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useWallet } from "@solana/wallet-adapter-react";
import * as React from "react";

import { SolanaLogo, UsdcLogo, UsdtLogo } from "@/components/logos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EmptyWorkbench,
  InlineNotice,
  WorkbenchPage,
  WorkbenchPanel,
} from "@/components/ui/workbench";
import {
  formatBaseUnits,
  inferPaymentSource,
  migratePaymentRecords,
  type PaymentRecord,
  type PaymentSource,
} from "@/lib/cloak/payment-history";
import type { ReceivedTransaction } from "@/lib/cloak/scanned-history";
import { usePaymentHistory } from "@/lib/cloak/use-payment-history";
import { useScannedHistory } from "@/lib/cloak/use-scanned-history";
import { solscanTxUrl } from "@/lib/solana/explorer";
import { useSolanaNetwork } from "@/lib/solana/network";
import { cn } from "@/lib/utils";

type Group =
  | { kind: "single"; record: PaymentRecord }
  | { kind: "batch"; batchId: string; records: PaymentRecord[] }
  | { kind: "received"; tx: ReceivedTransaction };

type FilterId = "all" | PaymentSource | "received";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pay", label: "Pay" },
  { id: "payroll", label: "Payroll" },
  { id: "recurring", label: "Recurring" },
  { id: "received", label: "Received" },
];

const PAGE_SIZE = 8;

export default function HistoryPage() {
  const wallet = useWallet();
  const { config } = useSolanaNetwork();
  const cluster = config.cluster;
  const sender = wallet.publicKey?.toBase58() ?? null;
  const { records, ready } = usePaymentHistory();
  const {
    scan,
    received,
    status: scanStatus,
    progress: scanProgress,
    error: scanError,
    sync: runScan,
    reset: resetScan,
  } = useScannedHistory();

  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<FilterId>("all");
  const [page, setPage] = React.useState(0);
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");

  React.useEffect(() => {
    if (sender) migratePaymentRecords(sender, cluster);
  }, [cluster, sender]);

  const fromMs = React.useMemo(() => {
    if (!fromDate) return Number.NEGATIVE_INFINITY;
    const t = Date.parse(fromDate);
    return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
  }, [fromDate]);
  const toMs = React.useMemo(() => {
    if (!toDate) return Number.POSITIVE_INFINITY;
    const t = Date.parse(toDate);
    return Number.isFinite(t) ? t + 86_400_000 : Number.POSITIVE_INFINITY;
  }, [toDate]);

  const groups = React.useMemo(
    () => buildGroups(records, received, filter),
    [records, received, filter],
  );
  const filteredGroups = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((group) => {
      const ts = groupTimestamp(group);
      if (ts < fromMs || ts >= toMs) return false;
      if (!q) return true;
      if (group.kind === "single") return matches(group.record, q);
      if (group.kind === "batch") {
        return (
          group.batchId.toLowerCase().includes(q) ||
          group.records.some((record) => matches(record, q))
        );
      }
      return matchesReceived(group.tx, q);
    });
  }, [groups, query, fromMs, toMs]);

  const summaries = React.useMemo(
    () => summarizeByToken(records, received),
    [records, received],
  );

  const pageCount = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pagedGroups = filteredGroups.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  function resetPaging() {
    setPage(0);
  }

  return (
    <WorkbenchPage
      kicker="Ledger module"
      title="Private payment ledger"
      description="Review outbound rows saved by this browser and inbound rows discovered through a Cloak scan."
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={() => runScan().catch(() => undefined)}
          disabled={scanStatus === "scanning" || !sender}
        >
          <HugeiconsIcon
            icon={scanStatus === "scanning" ? Loading03Icon : Refresh01Icon}
            size={15}
            strokeWidth={2}
            className={cn(scanStatus === "scanning" && "animate-spin")}
            aria-hidden="true"
          />
          {scanStatus === "scanning" ? "Syncing" : "Sync received"}
        </Button>
      }
      stats={[
        { label: "Outbound", value: records.length, hint: "local rows" },
        { label: "Inbound", value: received.length, hint: "scan rows", tone: received.length > 0 ? "success" : "default" },
        { label: "Visible", value: filteredGroups.length, hint: "after filters" },
        { label: "Scan", value: scanStatus, hint: scan ? `cached ${formatRelative(scan.scannedAt)}` : "not cached", tone: scanStatus === "error" ? "danger" : scanStatus === "scanning" ? "primary" : "default" },
      ]}
    >
      <div className="grid gap-4">
        <WorkbenchPanel title="Controls" eyebrow="Filter">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setFilter(item.id);
                    resetPaging();
                  }}
                  className={cn(
                    "h-10 rounded-lg border border-border/75 bg-secondary/25 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    filter === item.id && "border-primary/35 bg-primary/12 text-primary",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  resetPaging();
                }}
                type="search"
                placeholder="Search address or signature"
                leadingIcon={<HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={2} aria-hidden="true" />}
              />
              <DateInput label="From" value={fromDate} onChange={(value) => { setFromDate(value); resetPaging(); }} />
              <DateInput label="To" value={toDate} onChange={(value) => { setToDate(value); resetPaging(); }} />
            </div>
          </div>
        </WorkbenchPanel>

        {scanStatus === "scanning" ? (
          <InlineNotice tone="primary" title="Scanning shielded history">
            {scanProgress ?? "Checking for transactions..."}
          </InlineNotice>
        ) : null}
        {scanError ? (
          <InlineNotice
            tone="danger"
            title="Received sync failed"
            action={
              <Button type="button" variant="outline" onClick={() => resetScan().catch(() => undefined)}>
                Retry full scan
              </Button>
            }
          >
            {scanError.message}
          </InlineNotice>
        ) : null}

        <TokenSummary summaries={summaries} />

        <WorkbenchPanel title="Transactions" eyebrow="Rows">
          {!ready ? (
            <div className="grid gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary/35" />
              ))}
            </div>
          ) : pagedGroups.length === 0 ? (
            <EmptyWorkbench
              title="No ledger rows"
              description={
                records.length + received.length === 0
                  ? "Send a payment or sync received transactions to populate this view."
                  : "No rows match the current filters."
              }
            />
          ) : (
            <div className="grid gap-2">
              {pagedGroups.map((group) => (
                <LedgerRow key={groupKey(group)} group={group} />
              ))}
            </div>
          )}
        </WorkbenchPanel>

        {filteredGroups.length > PAGE_SIZE ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Page <span className="font-mono text-foreground">{safePage + 1}</span> of{" "}
              <span className="font-mono text-foreground">{pageCount}</span>
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <Button type="button" variant="outline" disabled={safePage >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>
                Next
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </WorkbenchPage>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = React.useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function LedgerRow({ group }: { group: Group }) {
  if (group.kind === "received") return <ReceivedRow tx={group.tx} />;
  if (group.kind === "batch") return <BatchRow batchId={group.batchId} records={group.records} />;
  return <SingleRow record={group.record} />;
}

function SingleRow({ record }: { record: PaymentRecord }) {
  const { config } = useSolanaNetwork();
  return (
    <RowFrame
      icon={ArrowUp01Icon}
      direction="out"
      title={shortAddr(record.recipient)}
      subtitle={`${formatDate(record.timestamp)} · ${inferPaymentSource(record)}`}
      amount={`-${formatBaseUnits(record.netRaw, record.decimals)} ${record.token}`}
      href={solscanTxUrl(record.withdrawSignature, config.cluster, config.rpcUrl)}
    />
  );
}

function ReceivedRow({ tx }: { tx: ReceivedTransaction }) {
  const { config } = useSolanaNetwork();
  const decimals = tx.decimals ?? 9;
  const symbol = tx.symbol ?? "";
  return (
    <RowFrame
      icon={ArrowDown01Icon}
      direction="in"
      title={shortAddr(tx.recipient)}
      subtitle={`${formatDate(tx.timestamp)} · ${txTypeLabel(tx.txType)}`}
      amount={`+${formatBaseUnits(String(tx.netAmount), decimals)} ${symbol}`}
      href={tx.signature ? solscanTxUrl(tx.signature, config.cluster, config.rpcUrl) : undefined}
    />
  );
}

function BatchRow({
  batchId,
  records,
}: {
  batchId: string;
  records: PaymentRecord[];
}) {
  const { config } = useSolanaNetwork();
  const [open, setOpen] = React.useState(false);
  const head = records[0];
  const isRecurring = inferPaymentSource(head) === "recurring";
  let totalNet = 0n;
  let totalGross = 0n;
  for (const record of records) {
    try {
      totalNet += BigInt(record.netRaw);
      totalGross += BigInt(record.amountRaw);
    } catch {
      // ignore malformed legacy rows
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/80 bg-card/45 p-3 text-left transition-colors hover:border-primary/35 hover:bg-card/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="grid size-10 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <HugeiconsIcon icon={isRecurring ? Calendar03Icon : UserMultipleIcon} size={17} strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">
            {isRecurring ? "Recurring" : "Payroll"} · {records.length} recipients
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {formatDate(Math.max(...records.map((record) => record.timestamp)))} · {shortSig(batchId)}
          </span>
        </span>
        <span className="text-right font-mono text-sm text-foreground">
          -{formatBaseUnits(totalNet.toString(), head.decimals)} {head.token}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{isRecurring ? "Recurring batch" : "Payroll batch"}</DialogTitle>
            <DialogDescription>
              Gross {formatBaseUnits(totalGross.toString(), head.decimals)} {head.token} · deposit{" "}
              <a href={solscanTxUrl(batchId, config.cluster, config.rpcUrl)} target="_blank" rel="noreferrer" className="font-mono text-primary underline underline-offset-4">
                {shortSig(batchId)}
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[360px] overflow-auto rounded-lg border border-border/80">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-border/70">
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{shortAddr(record.recipient)}</td>
                    <td className="px-3 py-2 text-right font-mono text-foreground">
                      -{formatBaseUnits(record.netRaw, record.decimals)} {record.token}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <a
                        href={solscanTxUrl(record.withdrawSignature, config.cluster, config.rpcUrl)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open payout on Solscan"
                        className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <HugeiconsIcon icon={EyeIcon} size={15} strokeWidth={2} aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RowFrame({
  icon,
  direction,
  title,
  subtitle,
  amount,
  href,
}: {
  icon: typeof ArrowUp01Icon;
  direction: "in" | "out";
  title: string;
  subtitle: string;
  amount: string;
  href?: string;
}) {
  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/80 bg-card/45 p-3">
      <span
        className={cn(
          "grid size-10 place-items-center rounded-lg border",
          direction === "in"
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
            : "border-primary/25 bg-primary/10 text-primary",
        )}
      >
        <HugeiconsIcon icon={icon} size={17} strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-mono text-sm text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            direction === "in" ? "text-emerald-300" : "text-foreground",
          )}
        >
          {amount}
        </span>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label="Open transaction on Solscan"
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <HugeiconsIcon icon={EyeIcon} size={15} strokeWidth={2} aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

type TokenSummary = {
  mint: string;
  symbol: string;
  decimals: number;
  inflow: bigint;
  outflow: bigint;
  count: number;
};

function TokenSummary({ summaries }: { summaries: TokenSummary[] }) {
  if (summaries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {summaries.map((summary) => {
        const net = summary.inflow - summary.outflow;
        const abs = net < 0n ? -net : net;
        const sign = net > 0n ? "+" : net < 0n ? "-" : "";
        return (
          <Badge key={summary.mint} className="gap-2 rounded-lg py-1.5 tracking-normal">
            <TokenLogo mint={summary.mint} symbol={summary.symbol} className="size-4" />
            <span className="font-mono">{summary.symbol || shortMint(summary.mint)}</span>
            <span className="font-mono tabular-nums">
              {sign}{formatBaseUnits(abs.toString(), summary.decimals)}
            </span>
          </Badge>
        );
      })}
    </div>
  );
}

function summarizeByToken(
  records: PaymentRecord[],
  received: ReceivedTransaction[],
): TokenSummary[] {
  const map = new Map<string, TokenSummary>();
  const upsert = (mint: string, symbol: string, decimals: number) => {
    const existing = map.get(mint);
    if (existing) {
      if (!existing.symbol && symbol) existing.symbol = symbol;
      return existing;
    }
    const entry = { mint, symbol, decimals, inflow: 0n, outflow: 0n, count: 0 };
    map.set(mint, entry);
    return entry;
  };

  for (const record of records) {
    const entry = upsert(record.mint, record.token, record.decimals);
    try {
      entry.outflow += BigInt(record.amountRaw);
    } catch {
      // ignore
    }
    entry.count += 1;
  }
  for (const tx of received) {
    const mint = (tx.outputMint ?? tx.mint ?? "").trim();
    if (!mint) continue;
    const entry = upsert(mint, (tx.outputSymbol ?? tx.symbol ?? "").trim(), tx.decimals ?? 9);
    try {
      entry.inflow += BigInt(String(tx.netAmount));
    } catch {
      // ignore
    }
    entry.count += 1;
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

const NATIVE_SOL = "So11111111111111111111111111111111111111112";
const USDC_MINTS = new Set([
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "61ro7AExqfk4dZYoCyRzTahahCC2TdUUZ4M5epMPunJf",
]);
const USDT_MINTS = new Set(["Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"]);

function TokenLogo({
  mint,
  symbol,
  className,
}: {
  mint: string;
  symbol: string;
  className?: string;
}) {
  if (mint === NATIVE_SOL || symbol.toUpperCase() === "SOL") return <SolanaLogo className={className} />;
  if (USDC_MINTS.has(mint) || symbol.toUpperCase() === "USDC") return <UsdcLogo className={className} />;
  if (USDT_MINTS.has(mint) || symbol.toUpperCase() === "USDT") return <UsdtLogo className={className} />;
  return <ClockIconFallback className={className} label={symbol || "?"} />;
}

function ClockIconFallback({ className, label }: { className?: string; label: string }) {
  return (
    <span className={cn("grid place-items-center rounded-full border border-border bg-background font-mono text-[9px]", className)}>
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}

function buildGroups(
  records: PaymentRecord[],
  received: ReceivedTransaction[],
  filter: FilterId,
): Group[] {
  const sourceFiltered =
    filter === "all" || filter === "received"
      ? records
      : records.filter((record) => inferPaymentSource(record) === filter);
  const outgoing = filter === "received" ? [] : groupOutgoing(sourceFiltered);
  const incoming =
    filter === "all" || filter === "received"
      ? received.map((tx) => ({ kind: "received", tx }) satisfies Group)
      : [];
  return [...outgoing, ...incoming].sort((a, b) => groupTimestamp(b) - groupTimestamp(a));
}

function groupOutgoing(records: PaymentRecord[]): Group[] {
  const bySig = new Map<string, PaymentRecord[]>();
  for (const record of records) {
    const sig = record.batchId ?? record.depositSignature;
    bySig.set(sig, [...(bySig.get(sig) ?? []), record]);
  }
  const seen = new Set<string>();
  const groups: Group[] = [];
  for (const record of records) {
    const sig = record.batchId ?? record.depositSignature;
    if (seen.has(sig)) continue;
    seen.add(sig);
    const bucket = bySig.get(sig) ?? [record];
    groups.push(bucket.length > 1 ? { kind: "batch", batchId: sig, records: bucket } : { kind: "single", record: bucket[0] });
  }
  return groups;
}

function groupTimestamp(group: Group): number {
  if (group.kind === "single") return group.record.timestamp;
  if (group.kind === "received") return group.tx.timestamp;
  return Math.max(...group.records.map((record) => record.timestamp));
}

function groupKey(group: Group): string {
  if (group.kind === "single") return group.record.id;
  if (group.kind === "batch") return group.batchId;
  return `received-${group.tx.signature ?? group.tx.commitment}`;
}

function matches(record: PaymentRecord, q: string): boolean {
  return (
    record.recipient.toLowerCase().includes(q) ||
    record.depositSignature.toLowerCase().includes(q) ||
    record.withdrawSignature.toLowerCase().includes(q)
  );
}

function matchesReceived(tx: ReceivedTransaction, q: string): boolean {
  return (
    tx.recipient.toLowerCase().includes(q) ||
    tx.commitment.toLowerCase().includes(q) ||
    (tx.signature?.toLowerCase().includes(q) ?? false)
  );
}

function txTypeLabel(txType: string): string {
  switch (txType) {
    case "deposit":
      return "Deposit";
    case "withdraw":
      return "Withdraw";
    case "transfer":
      return "Transfer";
    case "swap":
      return "Swap";
    default:
      return "Unknown";
  }
}

function shortAddr(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function shortSig(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function shortMint(value: string): string {
  if (value.length <= 10) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function formatDate(ms: number): string {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(ms: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
