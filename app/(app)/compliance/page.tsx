"use client";

import {
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Copy01Icon,
  Delete02Icon,
  Download01Icon,
  EyeIcon,
  FileSecurityIcon,
  KeyIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "motion/react";
import * as React from "react";

import { FancyButton } from "@/components/ui/fancy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cloakConfig } from "@/lib/cloak/config";
import { deriveNk, registerNkWithRelay } from "@/lib/cloak/derive-nk";
import { createMemoizedSignMessage } from "@/lib/cloak/sign-message-cache";
import { useViewingKeys } from "@/lib/cloak/use-viewing-keys";
import {
  addViewingKey,
  encodeViewingKeyToken,
  revokeViewingKey,
} from "@/lib/cloak/viewing-keys";
import { solanaConfig } from "@/lib/solana/config";
import { cn } from "@/lib/utils";

type GenerateState = "idle" | "signing" | "registering" | "done" | "error";

export default function CompliancePage() {
  const { publicKey, signMessage } = useWallet();
  const viewingKeys = useViewingKeys();

  const [auditor, setAuditor] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [state, setState] = React.useState<GenerateState>("idle");
  const [lastToken, setLastToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [regWarning, setRegWarning] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState<string | null>(null);

  // Memoised sign fn: avoids re-prompting for the same wallet in a session.
  const signCacheRef = React.useRef<{
    fn: ((msg: Uint8Array) => Promise<Uint8Array>) | null;
    key: string;
  }>({ fn: null, key: "" });

  // Cached NK for this wallet session (same wallet = same NK every time).
  const nkCacheRef = React.useRef<{
    nsk: Uint8Array;
    nkHex: string;
    key: string;
  } | null>(null);

  function getMemoizedSign() {
    const walletKey = publicKey!.toBase58();
    if (signCacheRef.current.key !== walletKey || !signCacheRef.current.fn) {
      signCacheRef.current = {
        fn: createMemoizedSignMessage(signMessage!),
        key: walletKey,
      };
    }
    return signCacheRef.current.fn!;
  }

  async function getOrDeriveNk() {
    const walletKey = publicKey!.toBase58();
    if (nkCacheRef.current?.key === walletKey) {
      return nkCacheRef.current;
    }
    const result = await deriveNk(getMemoizedSign());
    nkCacheRef.current = { ...result, key: walletKey };
    return nkCacheRef.current;
  }

  async function handleGenerate() {
    if (!publicKey || !signMessage) return;
    if (!auditor.trim() || !dateFrom || !dateTo) return;

    setState("signing");
    setError(null);
    setRegWarning(null);
    setLastToken(null);

    try {
      const { nsk, nkHex } = await getOrDeriveNk();

      // Register NK with relay so chain notes are encrypted for this wallet.
      setState("registering");
      try {
        await registerNkWithRelay(
          cloakConfig.relayUrl,
          publicKey,
          nsk,
          getMemoizedSign(),
        );
      } catch (regErr) {
        // Non-fatal: scanning still works via ATA fallback.
        const msg = regErr instanceof Error ? regErr.message : String(regErr);
        setRegWarning(`Relay registration skipped: ${msg}`);
      }

      const vk = addViewingKey(solanaConfig.cluster, publicKey.toBase58(), {
        auditor: auditor.trim(),
        dateFrom,
        dateTo,
        nkHex,
      });

      setLastToken(encodeViewingKeyToken(vk));
      setState("done");
      setAuditor("");
      setDateFrom("");
      setDateTo("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Key generation failed.");
      setState("error");
    }
  }

  function handleRevoke(id: string) {
    if (!publicKey) return;
    revokeViewingKey(solanaConfig.cluster, publicKey.toBase58(), id);
  }

  async function handleCopy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* clipboard blocked */ }
  }

  async function handleExportCsv(
    nkHex: string,
    dateFrom: string,
    dateTo: string,
    keyId: string,
  ) {
    if (!publicKey || exporting) return;
    setExporting(keyId);
    try {
      // Convert ISO date strings to millisecond timestamps.
      // beforeTimestamp includes the full final day (+1 day - 1 ms).
      const afterTimestamp = new Date(dateFrom).getTime();
      const beforeTimestamp = new Date(dateTo).getTime() + 86_400_000 - 1;

      const res = await fetch("/api/scan-received", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          viewingKeyNk: nkHex,
          afterTimestamp,
          beforeTimestamp,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `Scan failed (${res.status})`);
      }
      const { report } = (await res.json()) as { report: unknown };

      const { formatComplianceCsv } = await import("@cloak.dev/sdk");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const csv = formatComplianceCsv(report as any);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `onyx-audit-${dateFrom}-to-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed.";
      setError(msg);
    } finally {
      setExporting(null);
    }
  }

  const canGenerate =
    !!publicKey && !!signMessage && auditor.trim().length > 0 && !!dateFrom && !!dateTo;
  const isLoading = state === "signing" || state === "registering";

  const stateLabel: Record<GenerateState, string> = {
    idle: "Generate viewing key",
    signing: "Signing…",
    registering: "Registering with relay…",
    done: "Generate viewing key",
    error: "Try again",
  };

  const activeKeys = viewingKeys.filter((k) => !k.revoked);
  const revokedKeys = viewingKeys.filter((k) => k.revoked);

  return (
    <div className="mx-auto w-full max-w-screen-xl px-5">
      <div className="py-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/22 bg-primary/8 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-primary/75">
          <span className="size-1.5 rounded-full bg-primary/70" />
          Regulatory Audit
        </span>
        <div className="mt-3 flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-bold tracking-[-0.03em] text-foreground sm:text-[32px]">
            Key Generation
          </h1>
        </div>
        <div className="mt-4 h-px bg-gradient-to-r from-primary/40 via-border/50 to-transparent" />
      </div>

      <div className="grid gap-6 pb-16 lg:grid-cols-[1fr_360px] lg:items-start">

        {/* ── Issue new key ─────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-6 rounded-xl border border-border/60 bg-card/40 p-6 sm:p-8"
        >
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <HugeiconsIcon icon={KeyIcon} size={18} strokeWidth={1.6} />
            </div>
            <div>
              <h2 className="text-[16px] font-medium tracking-tight text-foreground">
                Issue a viewing key
              </h2>
              <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                Date-ranged, read-only, revocable. Derived locally from your master key — never sent to any server.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="auditor">Auditor / recipient label</Label>
              <Input
                id="auditor"
                placeholder="e.g. Trail of Bits, Internal Finance"
                value={auditor}
                onChange={(e) => setAuditor(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dateFrom">From date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dateTo">To date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* How it works */}
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/20 bg-primary/5 p-4">
            {[
              "NK derived from SIGN_IN_MESSAGE — same wallet always produces the same key.",
              "Registered with the Cloak relay so chain notes are encrypted for you.",
              "Token encodes NK + date range. Revoke any time — auditor loses access instantly.",
            ].map((t, i) => (
              <motion.p
                key={t}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.16 + i * 0.05, duration: 0.25 }}
                className="flex items-start gap-2 text-[12.5px] leading-5 text-foreground/85"
              >
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={13}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-primary"
                />
                {t}
              </motion.p>
            ))}
          </div>

          {!publicKey && (
            <p className="text-[12.5px] text-amber-400">
              Connect your wallet to generate a viewing key.
            </p>
          )}

          {/* Relay registration warning (non-fatal) */}
          {regWarning && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-400">
              {regWarning}
            </p>
          )}

          {/* Error */}
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
              {error}
            </p>
          )}

          {/* Token output */}
          {lastToken && (
            <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-[12px] font-medium text-primary">
                Viewing key ready — share this token with your auditor:
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-background/60 px-2 py-1.5 font-mono text-[11px] text-foreground/80">
                  {lastToken}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(lastToken, "new")}
                  aria-label="Copy token"
                  className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                >
                  <HugeiconsIcon
                    icon={copied === "new" ? CheckmarkCircle01Icon : Copy01Icon}
                    size={14}
                    strokeWidth={1.8}
                    className={copied === "new" ? "text-primary" : ""}
                  />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Auditors paste this at{" "}
                <a
                  href="/audit"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  /audit
                </a>{" "}
                to run a verifiable scan for the date range you specified.
              </p>
            </div>
          )}

          <FancyButton
            variant="primary"
            size="lg"
            className="self-start"
            onClick={handleGenerate}
            disabled={!canGenerate || isLoading}
          >
            {isLoading ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={14}
                  strokeWidth={2.2}
                  className="animate-spin"
                />
                {stateLabel[state]}
              </>
            ) : (
              <>
                {stateLabel[state]}
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2.2} />
              </>
            )}
          </FancyButton>
        </motion.section>

        {/* ── Right column ──────────────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* Active keys */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl border border-border/60 bg-card/40 p-6 lg:sticky lg:top-20"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-medium tracking-tight text-foreground">
                Active keys
              </h3>
              <span className="font-mono text-[11px] text-muted-foreground">
                {activeKeys.length} issued
              </span>
            </div>

            {activeKeys.length === 0 ? (
              <p className="mt-4 text-[12.5px] text-muted-foreground">
                No active keys yet.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {activeKeys.map((k, i) => {
                  const token = encodeViewingKeyToken(k);
                  return (
                    <motion.li
                      key={k.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.18 + i * 0.05, duration: 0.28 }}
                      className="group flex items-start gap-3 rounded-lg border border-border/50 bg-background/40 p-4"
                    >
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                        <HugeiconsIcon icon={EyeIcon} size={12} strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground">
                          {k.auditor}
                        </p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {k.dateFrom} → {k.dateTo}
                        </p>
                        <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground/70">
                          {token.slice(0, 20)}…
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          aria-label="Copy token"
                          title="Copy token"
                          onClick={() => handleCopy(token, k.id)}
                          className="text-muted-foreground transition-colors hover:text-primary"
                        >
                          <HugeiconsIcon
                            icon={copied === k.id ? CheckmarkCircle01Icon : Copy01Icon}
                            size={13}
                            strokeWidth={1.8}
                            className={cn(copied === k.id && "text-primary")}
                          />
                        </button>
                        <button
                          type="button"
                          aria-label="Export CSV"
                          title="Export scoped CSV"
                          onClick={() =>
                            handleExportCsv(k.nkHex, k.dateFrom, k.dateTo, k.id)
                          }
                          disabled={!!exporting}
                          className="text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
                        >
                          <HugeiconsIcon
                            icon={exporting === k.id ? Loading03Icon : Download01Icon}
                            size={13}
                            strokeWidth={1.8}
                            className={exporting === k.id ? "animate-spin" : ""}
                          />
                        </button>
                        <button
                          type="button"
                          aria-label="Revoke key"
                          title="Revoke — auditor loses access immediately"
                          onClick={() => handleRevoke(k.id)}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={1.8} />
                        </button>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </motion.section>

          {/* Revoked keys */}
          {revokedKeys.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-xl border border-border/60 bg-card/40 p-6 lg:sticky lg:top-20"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-medium tracking-tight text-foreground">
                  Revoked
                </h3>
                <HugeiconsIcon
                  icon={FileSecurityIcon}
                  size={14}
                  strokeWidth={1.8}
                  className="text-muted-foreground"
                />
              </div>
              <ul className="mt-4 flex flex-col gap-2">
                {revokedKeys.map((k, i) => (
                  <motion.li
                    key={k.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.24 + i * 0.05, duration: 0.28 }}
                    className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/40 p-4 opacity-50"
                  >
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-border bg-background/60 text-muted-foreground">
                      <HugeiconsIcon icon={EyeIcon} size={12} strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-muted-foreground line-through">
                        {k.auditor}
                      </p>
                      <p className="text-[11.5px] text-muted-foreground">
                        {k.dateFrom} → {k.dateTo}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </motion.section>
          )}
        </div>
      </div>
    </div>
  );
}
