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
        typeof window !== "undefined" ? window.location.origin : "https://onyx-red.vercel.app/";
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
    <div className="mx-auto w-full max-w-screen-xl px-5 relative">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(var(--primary-rgb),0.12),transparent_70%)]" aria-hidden />

      {/* Page title */}
      <div className="py-12 flex flex-col items-center text-center relative z-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary shadow-sm backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_currentColor]" />
          Client Billing
        </span>
        <h1 className="mt-6 text-[42px] font-black leading-[1.05] tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40 sm:text-[54px]">
          Payment Links
        </h1>
      </div>

      <div className="mx-auto grid max-w-[64rem] gap-6 pb-24 lg:grid-cols-[1.2fr_1fr] lg:items-start relative z-10">
        {/* Create invoice */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col gap-7 overflow-hidden rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-8 shadow-2xl backdrop-blur-2xl"
        >
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-primary/30 bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]">
              <HugeiconsIcon icon={InvoiceIcon} size={20} strokeWidth={2} />
            </div>
            <div className="mt-1">
              <h2 className="text-[18px] font-bold tracking-tight text-white">
                Create a payment request
              </h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-white/50">
                Your wallet address is embedded in the link. The payer routes funds through
                the shielded pool — no direct on-chain trace to you.
              </p>
            </div>
          </div>

          {/* Token selector */}
          <div className="flex flex-col gap-2.5">
            <Label className="text-white/60 ml-1">Token</Label>
            <div className="flex items-center gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1.5 shadow-inner w-max">
              {TOKENS.map(({ id, label, Logo }) => {
                const active = token === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setToken(id)}
                    className={cn(
                      "relative flex h-full items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-colors",
                      active
                        ? "text-white drop-shadow-md"
                        : "text-white/40 hover:text-white/80",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="invoice-token-active"
                        aria-hidden="true"
                        className="absolute inset-0 -z-0 rounded-xl bg-white/[0.08] border border-white/[0.1] shadow-sm backdrop-blur-md"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <Logo className="size-4 drop-shadow-sm" />
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="inv-amount" className="text-white/60 ml-1">Amount</Label>
            <Input
              id="inv-amount"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono text-[16px] bg-white/[0.03] border-white/[0.06] rounded-2xl h-14 px-4 focus:border-primary/50 focus:bg-white/[0.05] transition-all shadow-inner"
            />
          </div>

          {/* Memo */}
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="inv-memo" hint="Optional" className="text-white/60 ml-1">
              Memo
            </Label>
            <Input
              id="inv-memo"
              placeholder="e.g. Consulting · May 2026"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="text-[14px] bg-white/[0.03] border-white/[0.06] rounded-2xl h-14 px-4 focus:border-primary/50 focus:bg-white/[0.05] transition-all shadow-inner"
            />
          </div>

          {!wallet && (
            <p className="text-[13px] text-white/50 font-medium ml-1">
              Connect your wallet to create an invoice.
            </p>
          )}

          {lastInvoice && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-3 rounded-[1.5rem] border border-primary/40 bg-primary/10 p-5 shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)] backdrop-blur-md mt-2"
            >
              <p className="text-[13px] font-bold text-primary drop-shadow-[0_0_4px_rgba(var(--primary-rgb),0.5)]">
                Invoice ready — share this link:
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-3 font-mono text-[13px] font-bold text-white shadow-inner">
                  {lastInvoice.claimLink}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(lastInvoice.claimLink)}
                  className="shrink-0 flex items-center justify-center size-12 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white/60 transition-all hover:bg-primary/20 hover:text-primary hover:border-primary/40"
                  aria-label="Copy claim link"
                >
                  <HugeiconsIcon
                    icon={copied ? CheckmarkCircle01Icon : Copy01Icon}
                    size={18}
                    strokeWidth={2}
                    className={copied ? "text-primary drop-shadow-[0_0_6px_currentColor]" : ""}
                  />
                </button>
              </div>
              <p className="text-[12px] text-white/60 font-medium ml-1">
                {lastInvoice.amount} {lastInvoice.symbol}
                {lastInvoice.memo ? ` · ${lastInvoice.memo}` : ""}
              </p>
            </motion.div>
          )}

          <FancyButton
            variant="primary"
            size="lg"
            className="self-start mt-2 h-14 rounded-2xl text-[15px] shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] transition-shadow px-8"
            onClick={handleCreate}
            disabled={!canCreate || creating}
          >
            {creating ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={16}
                  strokeWidth={2.2}
                  className="animate-spin"
                />
                Creating…
              </>
            ) : (
              <>
                Create invoice link
                <HugeiconsIcon icon={CopyLinkIcon} size={16} strokeWidth={2.2} />
              </>
            )}
          </FancyButton>
        </motion.section>

        {/* Invoice history */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[2rem] border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent p-6 sm:p-8 lg:sticky lg:top-24 shadow-xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold tracking-tight text-white">
              Your invoices
            </h3>
            <span className="font-mono text-[12px] font-bold text-white/40">
              {invoices.length} total
            </span>
          </div>

          {invoices.length === 0 ? (
            <p className="mt-6 text-[14px] text-white/40 font-medium">
              No invoices yet. Create your first one.
            </p>
          ) : (
            <ul className="mt-6 flex flex-col gap-3">
              {invoices.map((inv, i) => (
                <motion.li
                  key={inv.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.04, duration: 0.28 }}
                  className="group flex items-start gap-4 rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04] hover:border-primary/30"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl border text-[13px] font-bold shadow-sm",
                      inv.paidAt
                        ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                        : "border-primary/30 bg-primary/20 text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]",
                    )}
                  >
                    {inv.symbol.slice(0, 3)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[14px] font-bold text-white group-hover:text-primary transition-colors">
                        {inv.amount} {inv.symbol}
                      </p>
                      {inv.paidAt && (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 shadow-sm">
                          paid
                        </span>
                      )}
                    </div>
                    {inv.memo && (
                      <p className="truncate text-[13px] text-white/60 mt-1">
                        {inv.memo}
                      </p>
                    )}
                    <p className="mt-1.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Copy link"
                    onClick={() => handleCopy(inv.claimLink)}
                    className="flex size-8 items-center justify-center rounded-lg text-white/40 transition-all hover:bg-white/[0.06] hover:text-white"
                  >
                    <HugeiconsIcon icon={CopyLinkIcon} size={16} strokeWidth={2} />
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>
    </div>
  );
}
