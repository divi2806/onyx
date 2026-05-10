"use client";

import {
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Copy01Icon,
  Delete02Icon,
  Download01Icon,
  EyeIcon,
  KeyIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useWallet } from "@solana/wallet-adapter-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { FancyButton } from "@/components/ui/fancy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FieldStack,
  InlineNotice,
  WorkbenchPage,
  WorkbenchPanel,
} from "@/components/ui/workbench";
import { cloakConfig } from "@/lib/cloak/config";
import { deriveNk, registerNkWithRelay } from "@/lib/cloak/derive-nk";
import { createMemoizedSignMessage } from "@/lib/cloak/sign-message-cache";
import { useViewingKeys } from "@/lib/cloak/use-viewing-keys";
import {
  AUDIT_REDACTION_MODES,
  AUDIT_ROLES,
  type AuditAccessLog,
  type AuditCapabilityPublic,
  type AuditRedactionMode,
  type AuditRole,
} from "@/lib/cloak/audit-capability-types";
import {
  addViewingKey,
  encodeViewingKeyToken,
  revokeViewingKey,
  type ViewingKey,
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
  const [role, setRole] = React.useState<AuditRole>("external-auditor");
  const [redaction, setRedaction] = React.useState<AuditRedactionMode>("full");
  const [expiresInDays, setExpiresInDays] = React.useState("30");
  const [state, setState] = React.useState<GenerateState>("idle");
  const [lastToken, setLastToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [regWarning, setRegWarning] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState<string | null>(null);
  const [logs, setLogs] = React.useState<AuditAccessLog[]>([]);

  const signCacheRef = React.useRef<{
    fn: ((msg: Uint8Array) => Promise<Uint8Array>) | null;
    key: string;
  }>({ fn: null, key: "" });
  const nkCacheRef = React.useRef<{
    nsk: Uint8Array;
    nkHex: string;
    key: string;
  } | null>(null);

  const activeKeys = viewingKeys.filter((key) => !key.revoked);
  const revokedKeys = viewingKeys.filter((key) => key.revoked);
  const isLoading = state === "signing" || state === "registering";
  const expiryDays = Number.parseInt(expiresInDays, 10);
  const canGenerate =
    !!publicKey &&
    !!signMessage &&
    auditor.trim().length > 0 &&
    !!dateFrom &&
    !!dateTo &&
    Number.isFinite(expiryDays) &&
    expiryDays > 0 &&
    !isLoading;

  const refreshLogs = React.useCallback(async (wallet: string) => {
    try {
      const res = await fetch(`/api/audit/logs?wallet=${encodeURIComponent(wallet)}`);
      if (!res.ok) return;
      const body = (await res.json()) as { logs?: AuditAccessLog[] };
      setLogs(Array.isArray(body.logs) ? body.logs : []);
    } catch {
      // Logs are best-effort diagnostics.
    }
  }, []);

  React.useEffect(() => {
    if (!publicKey) return;
    let cancelled = false;
    async function load() {
      try {
        const wallet = publicKey!.toBase58();
        const res = await fetch(`/api/audit/logs?wallet=${encodeURIComponent(wallet)}`);
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as { logs?: AuditAccessLog[] };
        if (!cancelled) setLogs(Array.isArray(body.logs) ? body.logs : []);
      } catch {
        // Logs are best-effort diagnostics.
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

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
    if (nkCacheRef.current?.key === walletKey) return nkCacheRef.current;
    const result = await deriveNk(getMemoizedSign());
    nkCacheRef.current = { ...result, key: walletKey };
    return nkCacheRef.current;
  }

  async function handleGenerate() {
    if (!publicKey || !signMessage || !canGenerate) return;

    setState("signing");
    setError(null);
    setRegWarning(null);
    setLastToken(null);

    try {
      const { nsk, nkHex } = await getOrDeriveNk();
      setState("registering");
      try {
        await registerNkWithRelay(
          cloakConfig.relayUrl,
          publicKey,
          nsk,
          getMemoizedSign(),
        );
      } catch (regErr) {
        const msg = regErr instanceof Error ? regErr.message : String(regErr);
        setRegWarning(`Relay registration skipped: ${msg}`);
      }

      const issued = await issueAuditCapability({
        auditor: auditor.trim(),
        wallet: publicKey.toBase58(),
        issuer: publicKey.toBase58(),
        nkHex,
        role,
        redaction,
        dateFrom,
        dateTo,
        expiresInDays: expiryDays,
      });

      const key = addViewingKey(solanaConfig.cluster, publicKey.toBase58(), {
        auditor: auditor.trim(),
        dateFrom,
        dateTo,
        nkHex,
        token: issued.token,
        tokenId: issued.capability.tokenId,
        role: issued.capability.role,
        redaction: issued.capability.redaction,
        expiresAt: issued.capability.expiresAt,
      });
      setLastToken(encodeViewingKeyToken(key));
      setState("done");
      setAuditor("");
      setDateFrom("");
      setDateTo("");
      void refreshLogs(publicKey.toBase58());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Key generation failed.");
      setState("error");
    }
  }

  async function handleCopy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // clipboard blocked
    }
  }

  async function handleExportCsv(key: ViewingKey) {
    if (!publicKey || exporting) return;
    setExporting(key.id);
    setError(null);
    try {
      let csv: string;
      if (key.token) {
        const res = await fetch("/api/audit/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: key.token }),
        });
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? `Scan failed (${res.status})`);
        }
        const body = (await res.json()) as { csv: string };
        csv = body.csv;
      } else {
        const afterTimestamp = new Date(key.dateFrom).getTime();
        const beforeTimestamp = new Date(key.dateTo).getTime() + 86_400_000 - 1;
        const res = await fetch("/api/scan-received", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: publicKey.toBase58(),
            viewingKeyNk: key.nkHex,
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
        csv = formatComplianceCsv(report as Parameters<typeof formatComplianceCsv>[0]);
      }
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `onyx-audit-${key.dateFrom}-to-${key.dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      void refreshLogs(publicKey.toBase58());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(null);
    }
  }

  async function handleRevoke(key: ViewingKey) {
    if (!publicKey) return;
    if (key.tokenId) {
      await fetch("/api/audit/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: key.tokenId,
          wallet: publicKey.toBase58(),
          auditor: key.auditor,
          role: key.role,
          redaction: key.redaction,
        }),
      }).catch(() => undefined);
    }
    revokeViewingKey(solanaConfig.cluster, publicKey.toBase58(), key.id);
    void refreshLogs(publicKey.toBase58());
  }

  return (
    <WorkbenchPage
      kicker="Compliance module"
      title="Viewing-key desk"
      description="Derive a local NK, register it with the relay, and issue server-enforced audit capabilities with immutable scope."
      stats={[
        { label: "Active keys", value: activeKeys.length, hint: "available tokens", tone: activeKeys.length ? "primary" : "default" },
        { label: "Revoked", value: revokedKeys.length, hint: "local revoke flag" },
        { label: "Relay", value: cloakConfig.relayUrl.includes("devnet") ? "devnet" : "mainnet", hint: "Cloak endpoint" },
        { label: "Wallet", value: publicKey ? "connected" : "missing", tone: publicKey ? "success" : "warning" },
      ]}
      aside={
        <WorkbenchPanel title="Compliance model" eyebrow="Scope">
          <div className="grid gap-3 text-sm text-muted-foreground">
            <p>Shared tokens are opaque. Auditors cannot read or edit the NK.</p>
            <p>The server decrypts the token, enforces expiry and date range, then scans Cloak.</p>
            <p>Revocation is enforced by the app server for active runtime sessions.</p>
          </div>
        </WorkbenchPanel>
      }
    >
      <div className="grid gap-4">
        <WorkbenchPanel title="Issue token" eyebrow="Generate">
          <div className="grid gap-5">
            {!publicKey ? (
              <InlineNotice tone="warning">Connect your wallet to derive a viewing key.</InlineNotice>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldStack className="sm:col-span-2">
                <Label htmlFor="auditor" required>Auditor label</Label>
                <Input
                  id="auditor"
                  value={auditor}
                  onChange={(e) => setAuditor(e.target.value)}
                  placeholder="Internal finance, auditor, accountant"
                  disabled={isLoading}
                  autoComplete="organization"
                />
              </FieldStack>
              <FieldStack>
                <Label htmlFor="dateFrom" required>From</Label>
                <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} disabled={isLoading} />
              </FieldStack>
              <FieldStack>
                <Label htmlFor="dateTo" required>To</Label>
                <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} disabled={isLoading} />
              </FieldStack>
              <FieldStack>
                <Label htmlFor="auditRole">Role</Label>
                <select
                  id="auditRole"
                  value={role}
                  onChange={(e) => setRole(e.target.value as AuditRole)}
                  disabled={isLoading}
                  className="h-11 rounded-lg border border-border bg-secondary/15 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {AUDIT_ROLES.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </FieldStack>
              <FieldStack>
                <Label htmlFor="redaction">Disclosure</Label>
                <select
                  id="redaction"
                  value={redaction}
                  onChange={(e) => setRedaction(e.target.value as AuditRedactionMode)}
                  disabled={isLoading}
                  className="h-11 rounded-lg border border-border bg-secondary/15 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {AUDIT_REDACTION_MODES.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {AUDIT_REDACTION_MODES.find((mode) => mode.id === redaction)?.description}
                </p>
              </FieldStack>
              <FieldStack>
                <Label htmlFor="expiresInDays" required>Expires after</Label>
                <Input
                  id="expiresInDays"
                  type="number"
                  min={1}
                  max={365}
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  disabled={isLoading}
                  trailingIcon={<span className="text-xs text-muted-foreground">days</span>}
                />
              </FieldStack>
            </div>

            {regWarning ? <InlineNotice tone="warning">{regWarning}</InlineNotice> : null}
            {error ? <InlineNotice tone="danger" title="Compliance action failed">{error}</InlineNotice> : null}

            {lastToken ? (
              <InlineNotice
                tone="success"
                title="Token ready"
                action={
                  <Button type="button" variant="outline" onClick={() => handleCopy(lastToken, "new")}>
                    <HugeiconsIcon icon={copied === "new" ? CheckmarkCircle01Icon : Copy01Icon} size={14} strokeWidth={2} aria-hidden="true" />
                    Copy
                  </Button>
                }
              >
                <code className="block truncate font-mono text-xs text-foreground">{lastToken}</code>
              </InlineNotice>
            ) : null}

            <FancyButton
              type="button"
              variant="primary"
              size="xl"
              disabled={!canGenerate}
              onClick={handleGenerate}
              className="justify-self-start"
            >
              {isLoading ? (
                <HugeiconsIcon icon={Loading03Icon} size={15} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
              ) : (
                <HugeiconsIcon icon={KeyIcon} size={15} strokeWidth={2.2} aria-hidden="true" />
              )}
              {state === "signing" ? "Signing" : state === "registering" ? "Registering" : "Generate token"}
              {!isLoading ? <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={2.2} aria-hidden="true" /> : null}
            </FancyButton>
          </div>
        </WorkbenchPanel>

        <WorkbenchPanel title="Issued keys" eyebrow="Manage">
          <div className="grid gap-3">
            {activeKeys.length === 0 ? (
              <InlineNotice>No active keys yet.</InlineNotice>
            ) : (
              activeKeys.map((key) => (
                <KeyRow
                  key={key.id}
                  viewingKey={key}
                  copied={copied === key.id}
                  exporting={exporting === key.id}
                  onCopy={() => handleCopy(encodeViewingKeyToken(key), key.id)}
                  onExport={() => handleExportCsv(key)}
                  onRevoke={() => handleRevoke(key)}
                />
              ))
            )}
          </div>
        </WorkbenchPanel>

        {revokedKeys.length > 0 ? (
          <WorkbenchPanel title="Revoked keys" eyebrow="Archive">
            <div className="grid gap-2">
              {revokedKeys.map((key) => (
                <div key={key.id} className="rounded-lg border border-border/70 bg-secondary/20 p-3 opacity-60">
                  <p className="text-sm font-medium text-foreground line-through">{key.auditor}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{key.dateFrom} to {key.dateTo}</p>
                </div>
              ))}
            </div>
          </WorkbenchPanel>
        ) : null}

        <WorkbenchPanel title="Audit access log" eyebrow="Server">
          {logs.length === 0 ? (
            <InlineNotice>No token activity recorded for this wallet in the current server session.</InlineNotice>
          ) : (
            <div className="grid gap-2">
              {logs.slice(0, 8).map((log) => (
                <div key={log.id} className="grid gap-1 rounded-lg border border-border/60 bg-secondary/15 p-3 text-sm sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-medium text-foreground">{log.auditor}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {log.action} · {log.result}{log.reason ? ` · ${log.reason}` : ""}
                    </p>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{new Date(log.at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </WorkbenchPanel>
      </div>
    </WorkbenchPage>
  );
}

function KeyRow({
  viewingKey,
  copied,
  exporting,
  onCopy,
  onExport,
  onRevoke,
}: {
  viewingKey: ViewingKey;
  copied: boolean;
  exporting: boolean;
  onCopy: () => void;
  onExport: () => void;
  onRevoke: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border/80 bg-card/45 p-4 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center">
      <span className="grid size-10 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
        <HugeiconsIcon icon={EyeIcon} size={17} strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{viewingKey.auditor}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {viewingKey.dateFrom} to {viewingKey.dateTo}
          {viewingKey.expiresAt ? ` · expires ${new Date(viewingKey.expiresAt).toLocaleDateString()}` : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {viewingKey.role ?? "legacy"} · {viewingKey.redaction ?? "legacy disclosure"}
        </p>
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground/80">
          {encodeViewingKeyToken(viewingKey).slice(0, 44)}...
        </p>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <IconButton label="Copy token" onClick={onCopy}>
          <HugeiconsIcon icon={copied ? CheckmarkCircle01Icon : Copy01Icon} size={15} strokeWidth={2} className={cn(copied && "text-primary")} aria-hidden="true" />
        </IconButton>
        <IconButton label="Export CSV" onClick={onExport} disabled={exporting}>
          <HugeiconsIcon icon={exporting ? Loading03Icon : Download01Icon} size={15} strokeWidth={2} className={cn(exporting && "animate-spin")} aria-hidden="true" />
        </IconButton>
        <IconButton label="Revoke key" onClick={onRevoke} danger>
          <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={2} aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
}

async function issueAuditCapability(input: {
  auditor: string;
  wallet: string;
  issuer: string;
  nkHex: string;
  role: AuditRole;
  redaction: AuditRedactionMode;
  dateFrom: string;
  dateTo: string;
  expiresInDays: number;
}): Promise<{ token: string; capability: AuditCapabilityPublic }> {
  const res = await fetch("/api/audit/issue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      cluster: solanaConfig.cluster,
    }),
  });
  const body = (await res.json()) as {
    token?: string;
    capability?: AuditCapabilityPublic;
    error?: string;
  };
  if (!res.ok || !body.token || !body.capability) {
    throw new Error(body.error ?? `Token issue failed (${res.status})`);
  }
  return { token: body.token, capability: body.capability };
}

function IconButton({
  label,
  children,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-lg border border-border/75 bg-secondary/25 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        danger && "hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}
