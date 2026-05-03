"use client";

import {
  Alert02Icon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Coins01Icon,
  Delete02Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";

import { SolanaLogo, UsdcLogo, UsdtLogo } from "@/components/logos";
import { DueBanner } from "@/components/team/due-banner";
import { DueRunDialog } from "@/components/team/due-run-dialog";
import { FancyButton } from "@/components/ui/fancy-button";
import {
  appendPayment,
  formatBaseUnits,
} from "@/lib/cloak/payment-history";
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
  | {
      kind: "ready";
      fileName: string;
      result: PayrollParseResult;
    }
  | { kind: "error"; fileName: string; message: string };

export default function PayrollPage() {
  const [drag, setDrag] = React.useState(false);
  const [parse, setParse] = React.useState<ParseState>({ kind: "idle" });
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const due = useDueMembers();
  const [runOpen, setRunOpen] = React.useState(false);

  const handleFile = React.useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParse({
        kind: "error",
        fileName: file.name,
        message: "Only .csv files are supported.",
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
  }, []);

  const reset = () => {
    setParse({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  };

  const showDropzone = parse.kind === "idle" || parse.kind === "error";

  return (
    <div className="mx-auto w-full max-w-screen-xl px-5 relative">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(var(--primary-rgb),0.12),transparent_70%)]" aria-hidden />

      {/* Page title */}
      <div className="py-12 flex flex-col items-center text-center relative z-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary shadow-sm backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_currentColor]" />
          Mass Distribution
        </span>
        <h1 className="mt-6 text-[42px] font-black leading-[1.05] tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40 sm:text-[54px]">
          Batch Payments
        </h1>
      </div>

      <div className="flex flex-col gap-8 pb-16 mx-auto max-w-[56rem] relative z-10">
        <DueBanner
          total={due.total}
          groups={due.groups}
          onRunNow={() => setRunOpen(true)}
        />

        <AnimatePresence mode="wait" initial={false}>
          {showDropzone ? (
            <motion.label
              key="dropzone"
              htmlFor="roster-upload"
              onDragEnter={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFile(file);
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "group relative flex cursor-pointer flex-col items-center justify-center gap-5 overflow-hidden rounded-[2rem] border-2 border-dashed bg-gradient-to-br from-white/[0.04] to-transparent px-8 py-24 text-center transition-all duration-500 backdrop-blur-xl shadow-2xl",
                "border-white/[0.1] hover:border-primary/40 hover:bg-white/[0.06] hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.1)]",
                drag && "border-primary/60 bg-primary/10 shadow-[0_0_50px_rgba(var(--primary-rgb),0.2)]",
              )}
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

              <motion.div
                aria-hidden="true"
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.08,
                  type: "spring",
                  stiffness: 320,
                  damping: 22,
                }}
                className="grid size-16 place-items-center rounded-2xl border border-primary/30 bg-primary/20 text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] group-hover:scale-110 transition-transform duration-500"
              >
                <HugeiconsIcon icon={Upload01Icon} size={24} strokeWidth={2} />
              </motion.div>

              <div className="flex flex-col gap-2">
                <p className="text-[20px] font-bold text-white group-hover:text-primary transition-colors duration-300">
                  Drop your roster CSV
                </p>
                <p className="text-[14px] text-white/50 max-w-sm mx-auto leading-relaxed">
                  Columns: wallet, amount. Optional: label. Up to 1,000 rows.
                </p>
              </div>

              <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] px-4 py-1.5 font-mono text-[12px] font-bold text-white/60 backdrop-blur-md">
                <HugeiconsIcon icon={Coins01Icon} size={14} strokeWidth={2} className="text-primary" />
                SOL · USDC · USDT
              </span>

              {parse.kind === "error" && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive shadow-sm backdrop-blur-md font-medium">
                  <HugeiconsIcon
                    icon={Alert02Icon}
                    size={16}
                    strokeWidth={2}
                  />
                  <span>
                    <span className="font-mono">{parse.fileName}</span>:{" "}
                    {parse.message}
                  </span>
                </div>
              )}
            </motion.label>
          ) : (
            <ParsedSummary
              key="parsed"
              state={parse}
              onReset={reset}
            />
          )}
        </AnimatePresence>

      </div>

      <DueRunDialog
        open={runOpen}
        groups={due.groups}
        onClose={() => setRunOpen(false)}
      />
    </div>
  );
}

const TOKEN_OPTIONS: {
  id: ShieldTokenId;
  label: string;
  Logo: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "SOL", label: "SOL", Logo: SolanaLogo },
  { id: "USDC", label: "USDC", Logo: UsdcLogo },
  { id: "USDT", label: "USDT", Logo: UsdtLogo },
];

function ParsedSummary({
  state,
  onReset,
}: {
  state: Extract<ParseState, { kind: "ready" } | { kind: "parsing" }>;
  onReset: () => void;
}) {
  const [tokenId, setTokenId] = React.useState<ShieldTokenId>("USDC");
  const shieldToken = React.useMemo(() => getShieldToken(tokenId), [tokenId]);
  const tokenSupported = isShieldTokenSupported(tokenId);
  const wallet = useWallet();
  const batch = useBatchPayroll();

  const validated: ValidatedRow[] = React.useMemo(() => {
    if (state.kind !== "ready" || !shieldToken) return [];
    return validateRows(state.result.rows, shieldToken);
  }, [state, shieldToken]);

  const totals = React.useMemo(() => totalsFor(validated), [validated]);

  const tokenDecimals = shieldToken?.decimals ?? 0;

  const canRun =
    batch.status === "idle" &&
    tokenSupported &&
    wallet.connected &&
    totals.validCount > 0;

  const runLabel =
    batch.status === "running"
      ? batch.phase === "depositing-proof"
        ? `Shielding · ${Math.round(batch.depositPercent)}%`
        : batch.phase === "depositing-submit"
          ? "Submitting deposit"
          : `Paying ${runProgress(batch.rows)}`
      : batch.status === "done"
        ? "Run complete"
        : !wallet.connected
          ? "Connect wallet to run"
          : totals.validCount === 0
            ? "No valid rows"
            : `Run payroll (${totals.validCount})`;

  const onRun = React.useCallback(async () => {
    if (!shieldToken || !wallet.publicKey) return;
    const validRows = validated.filter((r) => r.isValid);
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
      const r = validById.get(result.id);
      if (!r) continue;
      // The whole batch shares one deposit; each row has its own payout sig.
      // Use payoutSig as the record id so /history shows N distinct rows.
      appendPayment(sender, solanaConfig.cluster, {
        id: result.payoutSig,
        cluster: solanaConfig.cluster,
        sender,
        recipient: r.wallet,
        token: tokenId,
        mint: shieldToken.mint.toBase58(),
        decimals: shieldToken.decimals,
        amountRaw: r.amountBaseUnits!.toString(),
        netRaw: r.netBaseUnits!.toString(),
        depositSignature: outcome.depositSignature,
        withdrawSignature: result.payoutSig,
        timestamp: Date.now(),
        batchId: outcome.depositSignature,
        source: "payroll",
      });
    }
  }, [batch, shieldToken, tokenId, validated, wallet.publicKey]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-6 rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-6 sm:p-10 backdrop-blur-xl shadow-2xl"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
            Roster
          </p>
          <p className="mt-1 truncate font-mono text-[13.5px] text-foreground">
            {state.fileName}
          </p>
          {state.kind === "ready" && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px]">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={10}
                  strokeWidth={2.2}
                />
                {totals.validCount} valid
              </span>
              {totals.invalidCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-destructive">
                  <HugeiconsIcon
                    icon={Alert02Icon}
                    size={10}
                    strokeWidth={2.2}
                  />
                  {totals.invalidCount} invalid
                </span>
              )}
              {state.result.errors.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-2 py-0.5 text-muted-foreground">
                  {state.result.errors.length} parse issue
                  {state.result.errors.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
          )}
          {state.kind === "parsing" && (
            <p className="mt-1 text-[12.5px] text-muted-foreground">Parsing…</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1.5 shadow-inner">
            {TOKEN_OPTIONS.map((t) => {
              const isActive = tokenId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTokenId(t.id)}
                  className={cn(
                    "relative flex h-full items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-bold transition-colors",
                    isActive
                      ? "text-white drop-shadow-md"
                      : "text-white/40 hover:text-white/80",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="payroll-token-active"
                      aria-hidden="true"
                      className="absolute inset-0 -z-0 rounded-xl bg-white/[0.08] border border-white/[0.1] shadow-sm backdrop-blur-md"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <t.Logo className="size-4 drop-shadow-sm" />
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] font-medium text-white/50 transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive shadow-sm"
          >
            <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={2} />
            Clear
          </button>
        </div>
      </div>

      {!tokenSupported && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
          <HugeiconsIcon icon={Alert02Icon} size={12} strokeWidth={2.2} />
          {tokenId} is not available on {solanaConfig.cluster}.
        </div>
      )}

      {state.kind === "ready" && state.result.errors.length > 0 && (
        <ul className="flex flex-col gap-1.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-[12px] text-destructive">
          {state.result.errors.slice(0, 5).map((err, i) => (
            <li key={i} className="flex items-start gap-2">
              <HugeiconsIcon
                icon={Alert02Icon}
                size={12}
                strokeWidth={2.2}
                className="mt-0.5 shrink-0"
              />
              <span>
                {err.rowNumber !== null ? `Row ${err.rowNumber}: ` : ""}
                {err.message}
              </span>
            </li>
          ))}
          {state.result.errors.length > 5 && (
            <li className="text-muted-foreground">
              +{state.result.errors.length - 5} more
            </li>
          )}
        </ul>
      )}

      {state.kind === "ready" &&
        validated.length > 0 &&
        shieldToken &&
        batch.status !== "done" && (
          <PreviewTable
            rows={validated}
            tokenId={tokenId}
            decimals={tokenDecimals}
            execRows={batch.rows}
            activeRowId={batch.activeRowId}
            activeStartedAt={batch.activeStartedAt}
          />
        )}

      {state.kind === "ready" &&
        validated.length > 0 &&
        batch.status !== "done" && (
          <TotalsCard
            totals={totals}
            tokenId={tokenId}
            tokenDecimals={tokenDecimals}
          />
        )}

      {state.kind === "ready" &&
        validated.length > 0 &&
        batch.status !== "done" && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FancyButton
              type="button"
              variant="primary"
              size="lg"
              disabled={!canRun}
              onClick={onRun}
              className="h-14 rounded-2xl text-[15px] shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] transition-shadow px-8"
            >
              {runLabel}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                strokeWidth={2.2}
              />
            </FancyButton>

            {(batch.phase === "depositing-proof" ||
              batch.phase === "depositing-submit") && (
              <span className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                </span>
                <span className="truncate">
                  {batch.depositProgress ?? "Shielding into pool"}
                </span>
              </span>
            )}
          </div>
        )}

      {state.kind === "ready" && batch.status === "done" && batch.summary && (
        <Receipt
          summary={batch.summary}
          validated={validated}
          execRows={batch.rows}
          onRunAnother={() => {
            batch.reset();
            onReset();
          }}
        />
      )}
    </motion.section>
  );
}

function Receipt({
  summary,
  validated,
  execRows,
  onRunAnother,
}: {
  summary: {
    total: number;
    confirmed: number;
    failed: number;
    startedAt: number;
    finishedAt: number;
    depositSignature: string | null;
  };
  validated: ValidatedRow[];
  execRows: Record<number, BatchRowState>;
  onRunAnother: () => void;
}) {
  const durationSeconds = (summary.finishedAt - summary.startedAt) / 1000;
  const validRows = validated.filter((r) => r.isValid);
  const invalidSkipped = validated.length - validRows.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-5 rounded-2xl border border-border bg-background/40 p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
          aria-hidden="true"
        >
          <HugeiconsIcon
            icon={CheckmarkCircle01Icon}
            size={18}
            strokeWidth={2.2}
          />
        </motion.span>
        <div className="flex flex-col">
          <h3 className="text-[16px] font-medium tracking-tight text-foreground">
            Roster complete
          </h3>
          <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">
            <span className="font-medium text-foreground">
              {summary.confirmed} of {summary.total}
            </span>{" "}
            confirmed
            {summary.failed > 0 && (
              <>
                {" · "}
                <span className="font-medium text-destructive">
                  {summary.failed} failed
                </span>
              </>
            )}
            {" · "}
            {durationSeconds.toFixed(1)}s
            {invalidSkipped > 0 && ` · ${invalidSkipped} skipped`}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            Total: <span className="text-foreground/70">[redacted]</span>
          </p>
          {summary.depositSignature && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Batch deposit:{" "}
              <a
                href={solscanTxUrl(summary.depositSignature)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-foreground/80 underline underline-offset-2"
              >
                {shortSig(summary.depositSignature)} ↗
              </a>
            </p>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Recipient</th>
                <th className="px-3 py-2 font-medium">Outcome</th>
                <th className="px-3 py-2 text-right font-medium">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {validRows.map((r) => {
                const exec = execRows[r.row.rowNumber];
                const isConfirmed = exec?.status === "confirmed";
                const isFailed = exec?.status === "failed";
                return (
                  <tr
                    key={r.row.rowNumber}
                    className={cn(
                      isFailed && "bg-destructive/5",
                    )}
                  >
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                      {r.row.rowNumber}
                    </td>
                    <td className="px-3 py-2 text-foreground/90">
                      {shortAddr(r.wallet)}
                    </td>
                    <td className="px-3 py-2">
                      {isConfirmed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                          <HugeiconsIcon
                            icon={CheckmarkCircle01Icon}
                            size={10}
                            strokeWidth={2.5}
                          />
                          Confirmed
                        </span>
                      ) : isFailed ? (
                        <span
                          title={exec?.errorMessage}
                          className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive"
                        >
                          <HugeiconsIcon
                            icon={Alert02Icon}
                            size={10}
                            strokeWidth={2.5}
                          />
                          {truncate(exec?.errorMessage ?? "Failed", 40)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">·</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isConfirmed && exec?.payoutSignature ? (
                        <a
                          href={solscanTxUrl(exec.payoutSignature)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2 py-1 text-[11px] text-foreground transition-colors hover:bg-secondary"
                          title="Open payout on Solscan"
                        >
                          <span>{shortSig(exec.payoutSignature)}</span>
                          <span aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground">·</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FancyButton
          type="button"
          variant="primary"
          size="md"
          onClick={onRunAnother}
        >
          Run another roster
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2.2} />
        </FancyButton>
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-3 py-2 text-[12.5px] text-foreground transition-colors hover:bg-secondary"
        >
          View in history
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </motion.div>
  );
}

function shortSig(sig: string): string {
  if (sig.length <= 10) return sig;
  return `${sig.slice(0, 4)}…${sig.slice(-4)}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function runProgress(rows: Record<number, BatchRowState>): string {
  const ids = Object.keys(rows);
  const total = ids.length;
  if (total === 0) return "";
  const done = ids.filter((id) => {
    const s = rows[Number(id)]?.status;
    return s === "confirmed" || s === "failed";
  }).length;
  return `${done}/${total}`;
}

function PreviewTable({
  rows,
  tokenId,
  decimals,
  execRows,
  activeRowId,
  activeStartedAt,
}: {
  rows: ValidatedRow[];
  tokenId: ShieldTokenId;
  decimals: number;
  execRows: Record<number, BatchRowState>;
  activeRowId: number | null;
  activeStartedAt: number | null;
}) {
  // Tick once a second so the active row's elapsed timer updates without
  // re-rendering the whole table on every event from the SDK.
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (activeRowId === null || activeStartedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [activeRowId, activeStartedAt]);
  const activeElapsedMs =
    activeStartedAt !== null ? Math.max(0, now - activeStartedAt) : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
            <tr className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Wallet</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 text-right font-medium">Net</th>
              <th className="px-3 py-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono">
            {rows.map((r) => {
              const exec = execRows[r.row.rowNumber];
              const isActive = activeRowId === r.row.rowNumber;
              return (
                <tr
                  key={r.row.rowNumber}
                  className={cn(
                    "transition-colors",
                    !r.isValid && "bg-destructive/5",
                    isActive && "bg-primary/5",
                    exec?.status === "confirmed" && "bg-primary/[0.04]",
                    exec?.status === "failed" && "bg-destructive/10",
                  )}
                >
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">
                    {r.row.rowNumber}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2",
                      r.walletIssue ? "text-destructive" : "text-foreground/90",
                    )}
                  >
                    {r.wallet ? shortAddr(r.wallet) : "·"}
                    {r.walletIssue && (
                      <span className="ml-2 font-sans text-[10.5px] uppercase tracking-[0.1em]">
                        {describeRowIssue(r.walletIssue)}
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right",
                      r.amountIssue ? "text-destructive" : "text-foreground/90",
                    )}
                  >
                    {r.amount || "·"}{" "}
                    <span className="text-muted-foreground">{tokenId}</span>
                    {r.amountIssue && (
                      <div className="mt-0.5 font-sans text-[10.5px] uppercase tracking-[0.1em]">
                        {describeRowIssue(r.amountIssue)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.isValid && r.netBaseUnits !== undefined ? (
                      <span className="font-medium text-yellow-600 dark:text-yellow-400">
                        {formatBaseUnits(r.netBaseUnits.toString(), decimals)}{" "}
                        <span className="text-muted-foreground">{tokenId}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">·</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <RowStatus
                      validRow={r.isValid}
                      exec={exec}
                      elapsedMs={isActive ? activeElapsedMs : null}
                    />
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
  elapsedMs,
}: {
  validRow: boolean;
  exec?: BatchRowState;
  elapsedMs: number | null;
}) {
  if (!validRow) {
    return (
      <span className="inline-flex size-5 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <HugeiconsIcon icon={Alert02Icon} size={10} strokeWidth={2.5} />
      </span>
    );
  }

  if (!exec || exec.status === "pending") {
    return (
      <span
        title="Pending"
        className="inline-flex size-5 items-center justify-center rounded-full border border-border bg-background/40 text-muted-foreground"
      >
        <span className="size-1.5 rounded-full bg-muted-foreground/60" />
      </span>
    );
  }

  if (exec.status === "confirmed") {
    return (
      <span
        title="Confirmed"
        className="inline-flex size-5 items-center justify-center rounded-full bg-primary/20 text-primary"
      >
        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={10} strokeWidth={2.5} />
      </span>
    );
  }

  if (exec.status === "failed") {
    return (
      <span
        title={exec.errorMessage ?? "Failed"}
        className="inline-flex size-5 items-center justify-center rounded-full bg-destructive/20 text-destructive"
      >
        <HugeiconsIcon icon={Alert02Icon} size={10} strokeWidth={2.5} />
      </span>
    );
  }

  // proving / submitting: small inline label with %, plus elapsed timer
  // so the row feels alive during the longer waits.
  const elapsedSec = elapsedMs !== null ? Math.floor(elapsedMs / 1000) : null;
  return (
    <span
      title={exec.progress ?? statusLabel(exec.status)}
      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
    >
      <span className="size-1.5 animate-pulse rounded-full bg-primary" />
      {phaseShort(exec.status)}
      {exec.proofPercent !== null && exec.status === "paying-proof" && (
        <span className="font-mono">{Math.round(exec.proofPercent)}%</span>
      )}
      {elapsedSec !== null && (
        <span className="font-mono text-primary/70">{elapsedSec}s</span>
      )}
    </span>
  );
}

function statusLabel(s: BatchRowStatus): string {
  switch (s) {
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

function phaseShort(s: BatchRowStatus): string {
  switch (s) {
    case "paying-proof":
      return "Payout";
    case "paying-submit":
      return "Settle";
    default:
      return "";
  }
}

function TotalsCard({
  totals,
  tokenId,
  tokenDecimals,
}: {
  totals: ReturnType<typeof totalsFor>;
  tokenId: ShieldTokenId;
  tokenDecimals: number;
}) {
  const fmt = (raw: bigint) => formatBaseUnits(raw.toString(), tokenDecimals);
  const fmtSol = (lamports: bigint) => formatBaseUnits(lamports.toString(), 9);
  return (
    <div className="grid gap-2 rounded-xl border border-border bg-background/40 p-4 text-[13px] sm:grid-cols-2">
      <Row label="Recipients" value={`${totals.validCount}`} />
      <Row label="Gross total" value={`${fmt(totals.totalBaseUnits)} ${tokenId}`} />
      <Row
        label="Variable fee"
        hint="0.30%"
        value={`${fmt(totals.totalVariableFeeBaseUnits)} ${tokenId}`}
      />
      <Row
        label="Network fee"
        hint={`${totals.validCount} × 0.005 SOL`}
        value={`${fmtSol(totals.totalFixedFeeLamports)} SOL`}
      />
      <Row
        label="Recipients receive"
        value={`${fmt(totals.totalNetBaseUnits)} ${tokenId}`}
        accent
      />
    </div>
  );
}

function Row({
  label,
  hint,
  value,
  accent,
}: {
  label: string;
  hint?: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:contents">
      <dt className="flex items-center gap-2 text-muted-foreground sm:py-1">
        <span>{label}</span>
        {hint && (
          <span className="font-mono text-[11px] text-muted-foreground/70">
            {hint}
          </span>
        )}
      </dt>
      <dd
        className={cn(
          "font-mono sm:py-1 sm:text-right",
          accent
            ? "font-medium text-yellow-600 dark:text-yellow-400"
            : "text-foreground/90",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function shortAddr(s: string): string {
  if (!s) return "";
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-6)}`;
}
