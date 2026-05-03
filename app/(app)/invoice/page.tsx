"use client";

import {
  CheckmarkCircle01Icon,
  Copy01Icon,
  CopyLinkIcon,
  InvoiceIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "motion/react";
import * as React from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { SolanaLogo, UsdcLogo, UsdtLogo } from "@/components/logos";
import { FancyButton } from "@/components/ui/fancy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInvoice, loadInvoices, type Invoice } from "@/lib/cloak/invoice";
import { getShieldToken, isShieldTokenSupported, type ShieldTokenId } from "@/lib/cloak/tokens";
import { solanaConfig } from "@/lib/solana/config";
import { cn } from "@/lib/utils";

const TOKENS = [
  { id: "SOL" as ShieldTokenId, label: "SOL", Logo: SolanaLogo },
  { id: "USDC" as ShieldTokenId, label: "USDC", Logo: UsdcLogo },
  { id: "USDT" as ShieldTokenId, label: "USDT", Logo: UsdtLogo },
] as const;


export default function InvoicePage() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";

  const [token, setToken] = React.useState<ShieldTokenId>("USDC");
  const [amount, setAmount] = React.useState("");
  const [memo, setMemo] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [lastInvoice, setLastInvoice] = React.useState<Invoice | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);

  React.useEffect(() => {
    if (wallet) {
      setInvoices(loadInvoices(solanaConfig.cluster, wallet));
    }
  }, [wallet, lastInvoice]);

  const validAmount = /^\d+(\.\d+)?$/.test(amount.trim()) && Number(amount.trim()) > 0;
  const supported = isShieldTokenSupported(token);
  const canCreate = !!wallet && validAmount && supported;

  function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    try {
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "https://useonyx.xyz";
      const inv = createInvoice(
        solanaConfig.cluster,
        wallet,
        {
          amount: amount.trim(),
          mint: getShieldToken(token)!.mint.toBase58(),
          symbol: token,
          memo: memo.trim() || undefined,
        },
        baseUrl,
      );
      setLastInvoice(inv);
      setAmount("");
      setMemo("");
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Private payment requests"
        title="Invoice"
        description="Create a shareable claim link for any amount. The payer connects their wallet, routes funds through the Cloak shield pool, and you receive — with no public on-chain link between you."
      />

      <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-10 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Create invoice */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-6 rounded-2xl border border-border bg-card/60 p-6 sm:p-8"
        >
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <HugeiconsIcon icon={InvoiceIcon} size={18} strokeWidth={1.6} />
            </div>
            <div>
              <h2 className="text-[16px] font-medium tracking-tight text-foreground">
                Create a payment request
              </h2>
              <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                Your wallet address is embedded in the link. The payer routes funds through
                the shielded pool — no direct on-chain trace to you.
              </p>
            </div>
          </div>

          {/* Token selector */}
          <div className="flex flex-col gap-2">
            <Label>Token</Label>
            <div className="flex gap-2">
              {TOKENS.map(({ id, label, Logo }) => {
                const active = token === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setToken(id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-background/40 text-muted-foreground hover:border-border/80 hover:text-foreground",
                    )}
                  >
                    <Logo className="size-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="inv-amount">Amount</Label>
            <Input
              id="inv-amount"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* Memo */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="inv-memo" hint="Optional">
              Memo
            </Label>
            <Input
              id="inv-memo"
              placeholder="e.g. Consulting · May 2026"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          {!wallet && (
            <p className="text-[12.5px] text-muted-foreground">
              Connect your wallet to create an invoice.
            </p>
          )}

          {lastInvoice && (
            <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-[12px] font-medium text-primary">
                Invoice ready — share this link:
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-background/60 px-2 py-1.5 font-mono text-[11px] text-foreground/80">
                  {lastInvoice.claimLink}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(lastInvoice.claimLink)}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                  aria-label="Copy claim link"
                >
                  <HugeiconsIcon
                    icon={copied ? CheckmarkCircle01Icon : Copy01Icon}
                    size={14}
                    strokeWidth={1.8}
                    className={copied ? "text-primary" : ""}
                  />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {lastInvoice.amount} {lastInvoice.symbol}
                {lastInvoice.memo ? ` · ${lastInvoice.memo}` : ""}
              </p>
            </div>
          )}

          <FancyButton
            variant="primary"
            size="lg"
            className="self-start"
            onClick={handleCreate}
            disabled={!canCreate || creating}
          >
            {creating ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={14}
                  strokeWidth={2.2}
                  className="animate-spin"
                />
                Creating…
              </>
            ) : (
              <>
                Create invoice link
                <HugeiconsIcon icon={CopyLinkIcon} size={14} strokeWidth={2.2} />
              </>
            )}
          </FancyButton>
        </motion.section>

        {/* Invoice history */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-border bg-card/60 p-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-medium tracking-tight text-foreground">
              Your invoices
            </h3>
            <span className="font-mono text-[11px] text-muted-foreground">
              {invoices.length} total
            </span>
          </div>

          {invoices.length === 0 ? (
            <p className="mt-4 text-[12.5px] text-muted-foreground">
              No invoices yet. Create your first one.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {invoices.map((inv, i) => (
                <motion.li
                  key={inv.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.04, duration: 0.28 }}
                  className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border text-[11px] font-semibold",
                      inv.paidAt
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border-primary/20 bg-primary/10 text-primary",
                    )}
                  >
                    {inv.symbol.slice(0, 3)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-mono text-[13px] font-medium text-foreground">
                        {inv.amount} {inv.symbol}
                      </p>
                      {inv.paidAt && (
                        <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                          paid
                        </span>
                      )}
                    </div>
                    {inv.memo && (
                      <p className="truncate text-[11.5px] text-muted-foreground">
                        {inv.memo}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Copy link"
                    onClick={() => handleCopy(inv.claimLink)}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    <HugeiconsIcon icon={CopyLinkIcon} size={13} strokeWidth={1.8} />
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>
    </>
  );
}
