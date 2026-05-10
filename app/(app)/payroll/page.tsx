"use client";

import {
  ArrowRight01Icon,
  Download01Icon,
  Delete02Icon,
  Refresh01Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { fullWithdraw } from "@cloak.dev/sdk";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import * as React from "react";

import { SolanaLogo, UsdcLogo, UsdtLogo } from "@/components/logos";
import { DueBanner } from "@/components/team/due-banner";
import { DueRunDialog } from "@/components/team/due-run-dialog";
import { Button } from "@/components/ui/button";
import { FancyButton } from "@/components/ui/fancy-button";
import {
  EmptyWorkbench,
  InlineNotice,
  WorkbenchPage,
  WorkbenchPanel,
} from "@/components/ui/workbench";
import { applyBufferPolyfill } from "@/lib/buffer-polyfill";
import { cloakConfig } from "@/lib/cloak/config";
import {
  clearOrphan,
  deserializeStoredUtxo,
  loadOrphans,
  type OrphanUtxoRecord,
} from "@/lib/cloak/orphan-utxo-store";
import {
  appendPayment,
  formatBaseUnits,
} from "@/lib/cloak/payment-history";
import { createMemoizedSignMessage } from "@/lib/cloak/sign-message-cache";
import {
  getShieldToken,
  isShieldTokenSupported,
  type ShieldTokenId,
} from "@/lib/cloak/tokens";
import {
  useBatchPayroll,
  type BatchRowState,
  type BatchRowStatus,
} from "@/lib/cloak/use-batch-payroll";
import {
  parsePayrollCsv,
  type PayrollParseResult,
} from "@/lib/payroll/parse-csv";
import {
  describeRowIssue,
  totalsFor,
  validateRows,
  type ValidatedRow,
} from "@/lib/payroll/validate";
import { solanaConfig } from "@/lib/solana/config";
import { solscanTxUrl } from "@/lib/solana/explorer";
import { useDueMembers } from "@/lib/team/use-due-members";
import { cn } from "@/lib/utils";

type ParseState =
  | { kind: "idle" }
  | { kind: "parsing"; fileName: string }
  | { kind: "ready"; fileName: string; result: PayrollParseResult }
  | { kind: "error"; fileName: string; message: string };

const TOKEN_OPTIONS: {
  id: ShieldTokenId;
  label: string;
  Logo: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "SOL", label: "SOL", Logo: SolanaLogo },
  { id: "USDC", label: "USDC", Logo: UsdcLogo },
  { id: "USDT", label: "USDT", Logo: UsdtLogo },
];

export default function PayrollPage() {
  const [parse, setParse] = React.useState<ParseState>({ kind: "idle" });
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const due = useDueMembers();
  const [runOpen, setRunOpen] = React.useState(false);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParse({
        kind: "error",
        fileName: file.name,
        message: "Only CSV files are supported.",
      });
      return;
    }
    setParse({ kind: "parsing", fileName: file.name });
    try {
      const result = await parsePayrollCsv(file);
      setParse({ kind: "ready", fileName: file.name, result });
    } catch (err) {
      setParse({
        kind: "error",
        fileName: file.name,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  function reset() {
    setParse({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <WorkbenchPage
        kicker="Payroll module"
        title="Batch payment control room"
        description="Load a roster, validate every recipient and amount, then run one shielded deposit with private payouts for each row."
        stats={[
          { label: "Scheduled due", value: due.total, hint: "from team schedules", tone: due.total > 0 ? "warning" : "default" },
          { label: "Roster state", value: parse.kind, hint: parse.kind === "ready" ? parse.fileName : "CSV not loaded" },
          { label: "Network", value: solanaConfig.cluster, tone: solanaConfig.cluster === "devnet" ? "warning" : "default" },
          { label: "Limit", value: "1000", hint: "rows per CSV" },
        ]}
        aside={
          <WorkbenchPanel title="Roster contract" eyebrow="CSV">
            <div className="grid gap-3 text-sm text-muted-foreground">
              <p>Required columns: wallet and amount.</p>
              <p>Optional columns: label, name, memo, or note.</p>
              <p>Each valid row becomes a private payout from the shielded batch balance.</p>
            </div>
          </WorkbenchPanel>
        }
      >
        <div className="grid gap-4">
          <DueBanner
            total={due.total}
            groups={due.groups}
            onRunNow={() => setRunOpen(true)}
          />
          <OrphanRecoveryPanel />

          <WorkbenchPanel
            title="Roster import"
            eyebrow="Input"
            description="Select or drop a CSV. Validation runs locally before any wallet signature."
            action={
              parse.kind !== "idle" ? (
                <Button type="button" variant="outline" onClick={reset}>
                  <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={2} aria-hidden="true" />
                  Clear
                </Button>
              ) : null
            }
          >
            <label
              htmlFor="roster-upload"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFile(file);
              }}
              className="grid cursor-pointer place-items-center rounded-lg border border-dashed border-border/90 bg-secondary/20 p-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <input
                ref={inputRef}
                id="roster-upload"
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
              <HugeiconsIcon icon={Upload01Icon} size={24} strokeWidth={1.8} className="text-primary" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-foreground">
                {parse.kind === "idle" ? "Drop roster CSV or browse" : parse.fileName}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {parse.kind === "parsing"
                  ? "Parsing roster..."
                  : parse.kind === "error"
                    ? parse.message
                    : "wallet, amount, optional label"}
              </p>
            </label>
          </WorkbenchPanel>

          {parse.kind === "ready" ? (
            <ParsedSummary state={parse} onReset={reset} />
          ) : parse.kind === "error" ? (
            <InlineNotice tone="danger" title="Import failed">
              {parse.message}
            </InlineNotice>
          ) : (
            <EmptyWorkbench
              title="No roster loaded"
              description="Load a CSV to preview recipients, net amounts, and validation issues before signing."
            />
          )}
        </div>
      </WorkbenchPage>

      <DueRunDialog
        open={runOpen}
        groups={due.groups}
        onClose={() => setRunOpen(false)}
      />
    </>
  );
}

function ParsedSummary({
  state,
  onReset,
}: {
  state: Extract<ParseState, { kind: "ready" }>;
  onReset: () => void;
}) {
  const [tokenId, setTokenId] = React.useState<ShieldTokenId>("USDC");
  const shieldToken = React.useMemo(() => getShieldToken(tokenId), [tokenId]);
  const tokenSupported = isShieldTokenSupported(tokenId);
  const wallet = useWallet();
  const batch = useBatchPayroll();

  const validated = React.useMemo(() => {
    if (!shieldToken) return [];
    return validateRows(state.result.rows, shieldToken);
  }, [state.result.rows, shieldToken]);

  const totals = React.useMemo(() => totalsFor(validated), [validated]);
  const validRows = React.useMemo(
    () => validated.filter((r) => r.isValid),
    [validated],
  );

  const canRun =
    batch.status === "idle" &&
    tokenSupported &&
    wallet.connected &&
    validRows.length > 0;

  async function onRun() {
    if (!shieldToken || !wallet.publicKey) return;
    const validById = new Map(validRows.map((r) => [r.row.rowNumber, r]));

    const outcome = await batch.run({
      rows: validRows.map((r) => ({
        id: r.row.rowNumber,
        recipient: r.wallet,
        amountBaseUnits: r.amountBaseUnits!,
      })),
      mint: shieldToken.mint,
      tokenId,
      decimals: shieldToken.decimals,
    });

    if (!outcome || !wallet.publicKey) return;

    const sender = wallet.publicKey.toBase58();
    for (const result of outcome.results) {
      if (!result.ok) continue;
      const row = validById.get(result.id);
      if (!row) continue;
      appendPayment(sender, solanaConfig.cluster, {
        id: result.payoutSig,
        cluster: solanaConfig.cluster,
        sender,
        recipient: row.wallet,
        token: tokenId,
        mint: shieldToken.mint.toBase58(),
        decimals: shieldToken.decimals,
        amountRaw: row.amountBaseUnits!.toString(),
        netRaw: row.netBaseUnits!.toString(),
        depositSignature: outcome.depositSignature,
        withdrawSignature: result.payoutSig,
        timestamp: Date.now(),
        batchId: outcome.depositSignature,
        source: "payroll",
      });
    }
  }

  return (
    <WorkbenchPanel
      title="Validated roster"
      eyebrow="Review"
      description={`${totals.validCount} valid rows, ${totals.invalidCount} blocked rows.`}
      action={
        <div className="flex items-center gap-2">
          <TokenSwitch value={tokenId} onChange={setTokenId} />
        </div>
      }
    >
      <div className="grid gap-4">
        {!tokenSupported ? (
          <InlineNotice tone="danger">
            {tokenId} is not available on {solanaConfig.cluster}.
          </InlineNotice>
        ) : null}

        {state.result.errors.length > 0 ? (
          <InlineNotice tone="warning" title="Parse warnings">
            {state.result.errors.slice(0, 3).map((e) => (
              <span key={`${e.rowNumber ?? "file"}-${e.message}`} className="block">
                {e.rowNumber !== null ? `Row ${e.rowNumber}: ` : ""}
                {e.message}
              </span>
            ))}
          </InlineNotice>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-4">
          <MiniMetric label="Gross" value={`${formatBaseUnits(totals.totalBaseUnits.toString(), shieldToken?.decimals ?? 0)} ${tokenId}`} />
          <MiniMetric label="Net" value={`${formatBaseUnits(totals.totalNetBaseUnits.toString(), shieldToken?.decimals ?? 0)} ${tokenId}`} />
          <MiniMetric label="Variable fee" value={`${formatBaseUnits(totals.totalVariableFeeBaseUnits.toString(), shieldToken?.decimals ?? 0)} ${tokenId}`} />
          <MiniMetric label="Fixed fee" value={`${formatBaseUnits(totals.totalFixedFeeLamports.toString(), 9)} SOL`} />
        </div>

        <PreviewTable
          rows={validated}
          tokenId={tokenId}
          decimals={shieldToken?.decimals ?? 0}
          execRows={batch.rows}
          activeRowId={batch.activeRowId}
        />

        {batch.status === "done" && batch.summary ? (
          <Receipt
            summary={batch.summary}
            execRows={batch.rows}
            rows={validated}
            tokenId={tokenId}
            decimals={shieldToken?.decimals ?? 0}
            onRunAnother={() => {
              batch.reset();
              onReset();
            }}
          />
        ) : (
          <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {batch.status === "running"
                ? runLabel(batch.phase, batch.rows, batch.depositPercent)
                : "One aggregate shield deposit, then one private payout per valid row."}
            </p>
            <FancyButton
              type="button"
              variant="primary"
              size="xl"
              disabled={!canRun}
              onClick={onRun}
            >
              {batch.status === "running"
                ? runLabel(batch.phase, batch.rows, batch.depositPercent)
                : !wallet.connected
                  ? "Connect wallet"
                  : `Run ${totals.validCount} payouts`}
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2.2} aria-hidden="true" />
            </FancyButton>
          </div>
        )}
      </div>
    </WorkbenchPanel>
  );
}

function OrphanRecoveryPanel() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const sender = wallet.publicKey?.toBase58() ?? null;
  const orphans = useOrphans(sender);
  const [recovering, setRecovering] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const signCacheRef = React.useRef<{
    key: string;
    fn: ((msg: Uint8Array) => Promise<Uint8Array>) | null;
  }>({ key: "", fn: null });

  if (!sender || orphans.length === 0) return null;
  const senderKey = sender;

  async function reclaim(record: OrphanUtxoRecord) {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signMessage) return;
    setRecovering(record.id);
    setMessage(null);
    try {
      applyBufferPolyfill();
      if (signCacheRef.current.key !== senderKey || !signCacheRef.current.fn) {
        signCacheRef.current = {
          key: senderKey,
          fn: createMemoizedSignMessage(wallet.signMessage),
        };
      }
      const result = await fullWithdraw(
        [deserializeStoredUtxo(record)],
        wallet.publicKey,
        {
          connection,
          programId: cloakConfig.programId,
          relayUrl: cloakConfig.relayUrl,
          walletPublicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signMessage: signCacheRef.current.fn!,
          enforceViewingKeyRegistration: false,
        },
      );
      clearOrphan(senderKey, solanaConfig.cluster, record.id);
      setMessage(`Recovered residual balance: ${shortSig(result.signature)}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Recovery failed.");
    } finally {
      setRecovering(null);
    }
  }

  return (
    <WorkbenchPanel title="Residual shielded balance" eyebrow="Recovery">
      <div className="grid gap-3">
        <InlineNotice tone="warning" title="Incomplete payroll deposits found">
          A previous batch left change in a recoverable shielded UTXO. Reclaim it before starting another run.
        </InlineNotice>
        {message ? <InlineNotice>{message}</InlineNotice> : null}
        {orphans.map((record) => (
          <div key={record.id} className="grid gap-3 rounded-lg border border-border/60 bg-secondary/15 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <p className="font-mono text-sm text-foreground">
                {formatBaseUnits(record.utxo.amount, record.decimals)} {record.tokenId}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {record.rowsRemaining} rows remaining · deposit {shortSig(record.depositSignature)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={recovering === record.id}
              onClick={() => reclaim(record)}
            >
              <HugeiconsIcon
                icon={recovering === record.id ? Refresh01Icon : ArrowRight01Icon}
                size={14}
                strokeWidth={2}
                className={cn(recovering === record.id && "animate-spin")}
                aria-hidden="true"
              />
              Reclaim
            </Button>
          </div>
        ))}
      </div>
    </WorkbenchPanel>
  );
}

function useOrphans(sender: string | null): OrphanUtxoRecord[] {
  const [orphans, setOrphans] = React.useState<OrphanUtxoRecord[]>([]);
  React.useEffect(() => {
    function load() {
      setOrphans(loadOrphans(sender, solanaConfig.cluster));
    }
    function onStorage(e: StorageEvent) {
      if (e.key?.startsWith("cloak:orphan-utxo:v1:")) load();
    }
    load();
    window.addEventListener("storage", onStorage);
    window.addEventListener("cloak:orphans-updated", load);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cloak:orphans-updated", load);
    };
  }, [sender]);
  return orphans;
}

function TokenSwitch({
  value,
  onChange,
}: {
  value: ShieldTokenId;
  onChange: (id: ShieldTokenId) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-secondary/30 p-1">
      {TOKEN_OPTIONS.map((token) => {
        const active = value === token.id;
        const supported = isShieldTokenSupported(token.id);
        return (
          <button
            key={token.id}
            type="button"
            disabled={!supported}
            onClick={() => onChange(token.id)}
            className={cn(
              "flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
              active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <token.Logo className="size-3.5" />
            {token.label}
          </button>
        );
      })}
    </div>
  );
}

function PreviewTable({
  rows,
  tokenId,
  decimals,
  execRows,
  activeRowId,
}: {
  rows: ValidatedRow[];
  tokenId: ShieldTokenId;
  decimals: number;
  execRows: Record<number, BatchRowState>;
  activeRowId: number | null;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/80">
      <div className="max-h-[460px] overflow-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border/80 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-3 py-3 font-medium">Row</th>
              <th className="px-3 py-3 font-medium">Recipient</th>
              <th className="px-3 py-3 text-right font-medium">Gross</th>
              <th className="px-3 py-3 text-right font-medium">Net</th>
              <th className="px-3 py-3 text-right font-medium">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70 font-mono">
            {rows.map((row) => {
              const exec = execRows[row.row.rowNumber];
              const active = activeRowId === row.row.rowNumber;
              return (
                <tr
                  key={row.row.rowNumber}
                  className={cn(
                    "bg-background/20",
                    active && "bg-primary/10",
                    !row.isValid && "bg-destructive/10",
                    exec?.status === "confirmed" && "bg-emerald-500/10",
                  )}
                >
                  <td className="px-3 py-3 text-muted-foreground">{row.row.rowNumber}</td>
                  <td className={cn("px-3 py-3", row.walletIssue && "text-destructive")}>
                    {row.wallet ? shortAddr(row.wallet) : "-"}
                    {row.walletIssue ? (
                      <span className="ml-2 font-sans text-xs">{describeRowIssue(row.walletIssue)}</span>
                    ) : null}
                  </td>
                  <td className={cn("px-3 py-3 text-right", row.amountIssue && "text-destructive")}>
                    {row.amount || "-"} <span className="text-muted-foreground">{tokenId}</span>
                    {row.amountIssue ? (
                      <span className="block font-sans text-xs">{describeRowIssue(row.amountIssue)}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {row.isValid && row.netBaseUnits !== undefined
                      ? `${formatBaseUnits(row.netBaseUnits.toString(), decimals)} ${tokenId}`
                      : "-"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <RowStatus validRow={row.isValid} exec={exec} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowStatus({
  validRow,
  exec,
}: {
  validRow: boolean;
  exec?: BatchRowState;
}) {
  if (!validRow) return <StatusChip tone="danger" label="Blocked" />;
  if (!exec || exec.status === "pending") return <StatusChip label="Pending" />;
  if (exec.status === "confirmed") return <StatusChip tone="success" label="Confirmed" />;
  if (exec.status === "failed") return <StatusChip tone="danger" label="Failed" title={exec.errorMessage} />;
  return (
    <StatusChip
      tone="primary"
      label={
        exec.status === "paying-proof" && exec.proofPercent !== null
          ? `${Math.round(exec.proofPercent)}%`
          : phaseShort(exec.status)
      }
      title={exec.progress ?? statusLabel(exec.status)}
    />
  );
}

function StatusChip({
  label,
  tone = "default",
  title,
}: {
  label: string;
  tone?: "default" | "primary" | "success" | "danger";
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-7 items-center rounded-md border border-border/70 bg-secondary/30 px-2.5 text-xs font-medium",
        tone === "primary" && "border-primary/30 bg-primary/10 text-primary",
        tone === "success" && "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
        tone === "danger" && "border-destructive/35 bg-destructive/10 text-destructive",
      )}
    >
      {label}
    </span>
  );
}

function Receipt({
  summary,
  execRows,
  rows,
  tokenId,
  decimals,
  onRunAnother,
}: {
  summary: NonNullable<ReturnType<typeof useBatchPayroll>["summary"]>;
  execRows: Record<number, BatchRowState>;
  rows: ValidatedRow[];
  tokenId: ShieldTokenId;
  decimals: number;
  onRunAnother: () => void;
}) {
  const confirmed = Object.values(execRows).filter((r) => r.status === "confirmed");
  const receiptRows = rows.filter((row) => row.isValid);

  function downloadReceipt() {
    const header = "row,recipient,status,gross,net,payoutSignature,error\n";
    const body = receiptRows
      .map((row) => {
        const exec = execRows[row.row.rowNumber];
        return [
          row.row.rowNumber,
          row.wallet,
          exec?.status ?? "pending",
          `${formatBaseUnits(row.amountBaseUnits?.toString() ?? "0", decimals)} ${tokenId}`,
          `${formatBaseUnits(row.netBaseUnits?.toString() ?? "0", decimals)} ${tokenId}`,
          exec?.payoutSignature ?? "",
          exec?.errorMessage ?? "",
        ]
          .map(csvCell)
          .join(",");
      })
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `onyx-payroll-receipt-${summary.depositSignature ?? Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4 rounded-lg border border-border/60 bg-secondary/15 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Run complete: {summary.confirmed}/{summary.total} confirmed
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {confirmed.length} payout signatures stored in Ledger. Failed rows remain visible below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={downloadReceipt}>
            <HugeiconsIcon icon={Download01Icon} size={14} strokeWidth={2} aria-hidden="true" />
            Receipt CSV
          </Button>
          <FancyButton type="button" variant="neutral" size="md" onClick={onRunAnother}>
            New roster
          </FancyButton>
        </div>
      </div>

      <div className="grid gap-2 text-sm">
        <ReceiptLine
          label="Aggregate shield deposit"
          value={summary.depositSignature ?? "No deposit signature"}
          href={summary.depositSignature ? solscanTxUrl(summary.depositSignature) : undefined}
        />
        <ReceiptLine label="Started" value={new Date(summary.startedAt).toLocaleString()} />
        <ReceiptLine label="Finished" value={new Date(summary.finishedAt).toLocaleString()} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border/60">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-secondary/25 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">Row</th>
              <th className="px-3 py-3 font-medium">Recipient</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Payout signature</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {receiptRows.map((row) => {
              const exec = execRows[row.row.rowNumber];
              return (
                <tr key={row.row.rowNumber}>
                  <td className="px-3 py-3 font-mono text-muted-foreground">{row.row.rowNumber}</td>
                  <td className="px-3 py-3 font-mono">{shortAddr(row.wallet)}</td>
                  <td className="px-3 py-3">
                    <RowStatus validRow exec={exec} />
                  </td>
                  <td className="px-3 py-3 font-mono text-muted-foreground">
                    {exec?.payoutSignature ? (
                      <a href={solscanTxUrl(exec.payoutSignature)} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
                        {shortSig(exec.payoutSignature)}
                      </a>
                    ) : (
                      exec?.errorMessage ?? "-"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReceiptLine({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="truncate font-mono text-primary underline underline-offset-4">
          {shortSig(value)}
        </a>
      ) : (
        <span className="truncate font-mono text-foreground">{value}</span>
      )}
    </div>
  );
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/75 bg-secondary/25 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 truncate font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}

function runLabel(
  phase: ReturnType<typeof useBatchPayroll>["phase"],
  rows: Record<number, BatchRowState>,
  depositPercent: number,
) {
  if (phase === "depositing-proof") return `Deposit proof ${Math.round(depositPercent)}%`;
  if (phase === "depositing-submit") return "Submitting deposit";
  if (phase === "paying") return `Paying ${runProgress(rows)}`;
  return "Running";
}

function runProgress(rows: Record<number, BatchRowState>): string {
  const ids = Object.keys(rows);
  if (ids.length === 0) return "0/0";
  const done = ids.filter((id) => {
    const status = rows[Number(id)]?.status;
    return status === "confirmed" || status === "failed";
  }).length;
  return `${done}/${ids.length}`;
}

function statusLabel(status: BatchRowStatus): string {
  switch (status) {
    case "paying-proof":
      return "Generating payout proof";
    case "paying-submit":
      return "Submitting payout";
    case "confirmed":
      return "Confirmed";
    case "failed":
      return "Failed";
    default:
      return "Pending";
  }
}

function phaseShort(status: BatchRowStatus): string {
  switch (status) {
    case "paying-proof":
      return "Proof";
    case "paying-submit":
      return "Settle";
    default:
      return statusLabel(status);
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
