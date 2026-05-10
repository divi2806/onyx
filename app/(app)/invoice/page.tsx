"use client";

import {
  CheckmarkCircle01Icon,
  Copy01Icon,
  CopyLinkIcon,
  InvoiceIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useWallet } from "@solana/wallet-adapter-react";
import * as React from "react";

import { SolanaLogo, UsdcLogo, UsdtLogo } from "@/components/logos";
import { Button } from "@/components/ui/button";
import { FancyButton } from "@/components/ui/fancy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EmptyWorkbench,
  FieldStack,
  InlineNotice,
  WorkbenchPage,
  WorkbenchPanel,
} from "@/components/ui/workbench";
import {
  createInvoice,
  invoiceStorageEvent,
  loadInvoices,
  type Invoice,
} from "@/lib/cloak/invoice";
import {
  getShieldToken,
  isShieldTokenSupported,
  type ShieldTokenId,
} from "@/lib/cloak/tokens";
import { useSolanaNetwork } from "@/lib/solana/network";
import { cn } from "@/lib/utils";

const TOKENS = [
  { id: "SOL" as ShieldTokenId, label: "SOL", Logo: SolanaLogo },
  { id: "USDC" as ShieldTokenId, label: "USDC", Logo: UsdcLogo },
  { id: "USDT" as ShieldTokenId, label: "USDT", Logo: UsdtLogo },
];

const EMPTY: Invoice[] = [];

export default function InvoicePage() {
  const { publicKey } = useWallet();
  const { config } = useSolanaNetwork();
  const cluster = config.cluster;
  const wallet = publicKey?.toBase58() ?? "";
  const invoices = useInvoices(wallet);

  const [token, setToken] = React.useState<ShieldTokenId>("USDC");
  const [amount, setAmount] = React.useState("");
  const [memo, setMemo] = React.useState("");
  const [payerMemo, setPayerMemo] = React.useState("");
  const [expiresOn, setExpiresOn] = React.useState("");
  const [lastInvoice, setLastInvoice] = React.useState<Invoice | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  const supported = isShieldTokenSupported(token, cluster);
  const validAmount = /^\d+(\.\d+)?$/.test(amount.trim()) && Number(amount.trim()) > 0;
  const canCreate = !!wallet && validAmount && supported;

  function handleCreate() {
    if (!canCreate) return;
    const baseUrl =
      typeof window !== "undefined" ? window.location.origin : "https://onyx-red.vercel.app";
    const invoice = createInvoice(
      cluster,
      wallet,
      {
        amount: amount.trim(),
        mint: getShieldToken(token, cluster)!.mint.toBase58(),
        symbol: token,
        memo: memo.trim() || undefined,
        payerMemo: payerMemo.trim() || undefined,
        expiresAt: expiresOn ? new Date(`${expiresOn}T23:59:59`).getTime() : undefined,
      },
      baseUrl,
    );
    setLastInvoice(invoice);
    setAmount("");
    setMemo("");
    setPayerMemo("");
    setExpiresOn("");
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

  return (
    <WorkbenchPage
      kicker="Invoice module"
      title="Payment-link desk"
      description="Create claim links that ask a payer to send through the same shielded deposit and payout route."
      stats={[
        { label: "Invoices", value: invoices.length, hint: "stored locally" },
        { label: "Unpaid", value: invoices.filter((invoice) => !invoice.paidAt).length },
        { label: "Token", value: token, tone: supported ? "primary" : "danger" },
        { label: "Wallet", value: wallet ? "connected" : "missing", tone: wallet ? "success" : "warning" },
      ]}
      aside={
        <WorkbenchPanel title="Link payload" eyebrow="Claim">
          <div className="grid gap-3 text-sm text-muted-foreground">
            <p>The link contains recipient wallet, amount, mint, expiry, and payer instructions.</p>
            <p>The payer only needs a Solana wallet. The claim page handles the Cloak route.</p>
          </div>
        </WorkbenchPanel>
      }
    >
      <div className="grid gap-4">
        <WorkbenchPanel title="Create request" eyebrow="Builder">
          <div className="grid gap-5">
            {!wallet ? <InlineNotice tone="warning">Connect your wallet to create an invoice link.</InlineNotice> : null}
            {!supported ? <InlineNotice tone="danger">{token} is unavailable on {cluster}.</InlineNotice> : null}

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_260px]">
              <FieldStack>
                <Label htmlFor="invoiceAmount" required>Amount</Label>
                <Input
                  id="invoiceAmount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                  className="font-mono"
                  aria-invalid={amount && !validAmount ? "true" : undefined}
                />
                <p className="text-xs text-muted-foreground">The payer sends this exact gross amount.</p>
              </FieldStack>
              <FieldStack>
                <Label>Token</Label>
                <TokenSwitch value={token} onChange={setToken} />
              </FieldStack>
            </div>

            <FieldStack>
              <Label htmlFor="invoiceMemo">Memo</Label>
              <Input
                id="invoiceMemo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Consulting, May retainer, invoice number"
                maxLength={160}
              />
            </FieldStack>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldStack>
                <Label htmlFor="payerMemo">Payer instructions</Label>
                <Input
                  id="payerMemo"
                  value={payerMemo}
                  onChange={(e) => setPayerMemo(e.target.value)}
                  placeholder="Works for any Solana wallet; no Cloak setup required"
                  maxLength={160}
                />
              </FieldStack>
              <FieldStack>
                <Label htmlFor="invoiceExpires">Expires</Label>
                <Input
                  id="invoiceExpires"
                  type="date"
                  value={expiresOn}
                  onChange={(e) => setExpiresOn(e.target.value)}
                />
              </FieldStack>
            </div>

            {lastInvoice ? (
              <InlineNotice
                tone="success"
                title="Invoice link ready"
                action={
                  <Button type="button" variant="outline" onClick={() => handleCopy(lastInvoice.claimLink, lastInvoice.id)}>
                    <HugeiconsIcon icon={copied === lastInvoice.id ? CheckmarkCircle01Icon : Copy01Icon} size={14} strokeWidth={2} aria-hidden="true" />
                    Copy
                  </Button>
                }
              >
                <code className="block truncate font-mono text-xs text-foreground">{lastInvoice.claimLink}</code>
                <QrPreview url={lastInvoice.claimLink} />
              </InlineNotice>
            ) : null}

            <FancyButton
              type="button"
              variant="primary"
              size="xl"
              disabled={!canCreate}
              onClick={handleCreate}
              className="justify-self-start"
            >
              <HugeiconsIcon icon={CopyLinkIcon} size={16} strokeWidth={2.2} aria-hidden="true" />
              Create invoice link
            </FancyButton>
          </div>
        </WorkbenchPanel>

        <WorkbenchPanel title="Your invoices" eyebrow="Local">
          {invoices.length === 0 ? (
            <EmptyWorkbench
              title="No invoice links yet"
              description="Create a request and it will appear here for quick copy access."
            />
          ) : (
            <div className="grid gap-2">
              {invoices.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  copied={copied === invoice.id}
                  onCopy={() => handleCopy(invoice.claimLink, invoice.id)}
                />
              ))}
            </div>
          )}
        </WorkbenchPanel>
      </div>
    </WorkbenchPage>
  );
}

function TokenSwitch({
  value,
  onChange,
}: {
  value: ShieldTokenId;
  onChange: (id: ShieldTokenId) => void;
}) {
  const { config } = useSolanaNetwork();
  const cluster = config.cluster;
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-secondary/30 p-1">
      {TOKENS.map((token) => {
        const active = value === token.id;
        const supported = isShieldTokenSupported(token.id, cluster);
        return (
          <button
            key={token.id}
            type="button"
            disabled={!supported}
            onClick={() => onChange(token.id)}
            className={cn(
              "flex h-10 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
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

function InvoiceRow({
  invoice,
  copied,
  onCopy,
}: {
  invoice: Invoice;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border/80 bg-card/45 p-4 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center">
      <span
        className={cn(
          "grid size-10 place-items-center rounded-lg border",
          invoice.paidAt
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
            : "border-primary/25 bg-primary/10 text-primary",
        )}
      >
        <HugeiconsIcon icon={invoice.paidAt ? CheckmarkCircle01Icon : InvoiceIcon} size={17} strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="font-mono text-sm text-foreground">
          {invoice.amount} {invoice.symbol}
          {invoice.paidAt ? <span className="ml-2 text-emerald-300">paid</span> : null}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {invoice.memo || "No memo"} · {new Date(invoice.createdAt).toLocaleDateString()}
        </p>
        {invoice.expiresAt ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Expires {new Date(invoice.expiresAt).toLocaleDateString()}
          </p>
        ) : null}
      </div>
      <Button type="button" variant="outline" onClick={onCopy}>
        <HugeiconsIcon icon={copied ? CheckmarkCircle01Icon : Copy01Icon} size={14} strokeWidth={2} aria-hidden="true" />
        Copy link
      </Button>
    </div>
  );
}

function QrPreview({ url }: { url: string }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`;
  return (
    <div className="mt-3 flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- QR is generated by a lightweight external QR endpoint for share links. */}
      <img
        src={src}
        alt="QR code for the private payment request"
        width={80}
        height={80}
        className="rounded-md border border-border bg-white p-1"
      />
      <p className="text-xs text-muted-foreground">
        QR claim code for cross-border payers who receive the request on mobile.
      </p>
    </div>
  );
}

function useInvoices(wallet: string): Invoice[] {
  const { config } = useSolanaNetwork();
  const cluster = config.cluster;
  const cacheRef = React.useRef<{ wallet: string; json: string; value: Invoice[] }>({
    wallet: "",
    json: "[]",
    value: EMPTY,
  });

  const subscribe = React.useCallback(
    (notify: () => void) => {
      if (typeof window === "undefined") return () => {};
      const onCustom = (event: Event) => {
        const detail = (event as CustomEvent<{ wallet: string; cluster: string }>).detail;
        if (!detail || (detail.wallet === wallet && detail.cluster === cluster)) notify();
      };
      const onStorage = (event: StorageEvent) => {
        if (event.key?.startsWith("onyx:invoices:v1:")) notify();
      };
      window.addEventListener(invoiceStorageEvent(), onCustom);
      window.addEventListener("storage", onStorage);
      return () => {
        window.removeEventListener(invoiceStorageEvent(), onCustom);
        window.removeEventListener("storage", onStorage);
      };
    },
    [cluster, wallet],
  );

  const getSnapshot = React.useCallback(() => {
    if (!wallet || typeof window === "undefined") return EMPTY;
    const fresh = loadInvoices(cluster, wallet);
    const json = JSON.stringify(fresh);
    const cache = cacheRef.current;
    if (cache.wallet === wallet && cache.json === json) return cache.value;
    cacheRef.current = { wallet, json, value: fresh };
    return fresh;
  }, [cluster, wallet]);

  return React.useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
