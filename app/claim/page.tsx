"use client";

import {
  ArrowRight01Icon,
  InvoiceIcon,
  Loading03Icon,
  LockIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { OnyxMark } from "@/components/logos";
import { ConnectButton } from "@/components/solana/connect-button";
import { FancyButton } from "@/components/ui/fancy-button";
import { InlineNotice, WorkbenchPanel } from "@/components/ui/workbench";
import { applyBufferPolyfill } from "@/lib/buffer-polyfill";
import { fastSendOnce } from "@/lib/cloak/fast-send-core";
import { decodeClaimPayload } from "@/lib/cloak/invoice";
import { createMemoizedSignMessage } from "@/lib/cloak/sign-message-cache";
import { getShieldToken, toBaseUnits } from "@/lib/cloak/tokens";
import { useSolanaNetwork } from "@/lib/solana/network";

type PayState = "idle" | "paying" | "success" | "error";

function ClaimPageInner() {
  const params = useSearchParams();
  const { connection } = useConnection();
  const { publicKey, signTransaction, signMessage } = useWallet();
  const { cloakConfig, config, switchCluster } = useSolanaNetwork();

  const vParam = params.get("v") ?? "";
  const payload = React.useMemo(() => decodeClaimPayload(vParam), [vParam]);
  const claimCluster = payload?.c ?? config.cluster;
  const token = payload ? getShieldToken(payload.s, claimCluster) : null;
  const [mountedAt] = React.useState(() => Date.now());
  const expired = !!payload?.exp && payload.exp < mountedAt;

  const [payState, setPayState] = React.useState<PayState>("idle");
  const [progress, setProgress] = React.useState<string | null>(null);
  const [txSig, setTxSig] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const signMessageCacheRef = React.useRef<{
    fn: ((msg: Uint8Array) => Promise<Uint8Array>) | null;
    key: string;
  }>({ fn: null, key: "" });

  React.useEffect(() => {
    if (payload?.c && payload.c !== config.cluster) {
      if (payload.c === "devnet" || payload.c === "mainnet-beta") {
        switchCluster(payload.c);
      }
    }
  }, [config.cluster, payload?.c, switchCluster]);

  async function handlePay() {
    if (!payload || expired || !publicKey || !signTransaction || !signMessage || !token) return;
    setPayState("paying");
    setError(null);
    setProgress("Preparing shielded payment");

    try {
      applyBufferPolyfill();
      const walletKey = publicKey.toBase58();
      if (signMessageCacheRef.current.key !== walletKey || !signMessageCacheRef.current.fn) {
        signMessageCacheRef.current = {
          fn: createMemoizedSignMessage(signMessage),
          key: walletKey,
        };
      }

      const amountBaseUnits = toBaseUnits(payload.a, token.decimals);
      const result = await fastSendOnce({
        amountBaseUnits,
        mint: token.mint,
        recipient: new PublicKey(payload.r),
        sender: publicKey,
        connection,
        programId: cloakConfig.programId,
        relayUrl: cloakConfig.relayUrl,
        signTransaction,
        signMessage: signMessageCacheRef.current.fn!,
        onProgress: (status) => setProgress(status),
      });

      setTxSig(result.withdrawSignature);
      setPayState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
      setPayState("error");
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicHeader label="Payment request" />
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        {!payload ? (
          <WorkbenchPanel title="Invalid claim link" eyebrow="Request">
            <InlineNotice tone="danger" title="Malformed link">
              This payment request is missing or cannot be decoded. Ask the issuer for a fresh link.
            </InlineNotice>
            <Link href="/" className="mt-4 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline">
              Return to Onyx
            </Link>
          </WorkbenchPanel>
        ) : payState === "success" && txSig ? (
          <WorkbenchPanel title="Payment sent" eyebrow="Confirmed">
            <div className="grid gap-5">
              <InlineNotice tone="success" title={`${payload.a} ${payload.s} routed through the shield pool`}>
                The recipient will receive funds from the payout transaction.
              </InlineNotice>
              <div className="rounded-lg border border-border/80 bg-secondary/25 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Payout transaction</p>
                <p className="mt-2 truncate font-mono text-sm text-foreground">{txSig}</p>
              </div>
              <Link href="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                Return to Onyx
              </Link>
            </div>
          </WorkbenchPanel>
        ) : (
          <WorkbenchPanel title="Review payment request" eyebrow="Claim">
            <div className="grid gap-5">
              <div className="grid gap-3 rounded-lg border border-border/80 bg-secondary/20 p-4">
                <DetailRow label="Amount" value={`${payload.a} ${payload.s}`} strong />
                {payload.memo ? <DetailRow label="Memo" value={payload.memo} /> : null}
                {payload.pm ? <DetailRow label="Instructions" value={payload.pm} /> : null}
                {payload.exp ? <DetailRow label="Expires" value={new Date(payload.exp).toLocaleDateString()} /> : null}
                <DetailRow label="Recipient" value={shortAddr(payload.r)} mono />
                <DetailRow label="Route" value="Cloak shielded pool" icon={LockIcon} />
              </div>

              {expired ? (
                <InlineNotice tone="danger" title="Request expired">
                  Ask the issuer for a fresh private payment link.
                </InlineNotice>
              ) : null}

              {!token ? (
                <InlineNotice tone="danger">
                  {payload.s} is not available on this network.
                </InlineNotice>
              ) : null}

              {error ? <InlineNotice tone="danger" title="Payment failed">{error}</InlineNotice> : null}
              {payState === "paying" && progress ? (
                <InlineNotice tone="primary" title="Transaction in progress">
                  {progress}
                </InlineNotice>
              ) : null}

              {publicKey ? (
                <FancyButton
                  type="button"
                  variant="primary"
                  size="xl"
                  onClick={handlePay}
                  disabled={payState === "paying" || !token || expired}
                  className="justify-self-start"
                >
                  {payState === "paying" ? (
                    <HugeiconsIcon icon={Loading03Icon} size={16} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2.2} aria-hidden="true" />
                  )}
                  {payState === "paying" ? "Paying" : expired ? "Expired" : `Pay ${payload.a} ${payload.s}`}
                </FancyButton>
              ) : (
                <div className="grid gap-3">
                  <p className="text-sm text-muted-foreground">Connect your wallet to pay this request.</p>
                  <ConnectButton />
                </div>
              )}
            </div>
          </WorkbenchPanel>
        )}

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <WorkbenchPanel title="What happens next" eyebrow="Settlement">
            <div className="grid gap-3 text-sm text-muted-foreground">
              <p>You do not need a Cloak account. Connect any Solana wallet and approve the request.</p>
              <p>Your wallet signs the shielded deposit and payout transactions.</p>
              <p>The recipient address is paid through the shield pool, not by a direct public transfer.</p>
              <p>Keep the confirmation signature for your own records.</p>
            </div>
          </WorkbenchPanel>
        </aside>
      </div>
    </main>
  );
}

export default function ClaimPage() {
  return (
    <React.Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-background">
          <HugeiconsIcon icon={Loading03Icon} size={24} strokeWidth={1.8} className="animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ClaimPageInner />
    </React.Suspense>
  );
}

function PublicHeader({ label }: { label: string }) {
  return (
    <header className="border-b border-border/70">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex h-10 items-center gap-2 rounded-lg border border-border/70 bg-card/50 px-3">
          <OnyxMark className="size-5" />
          <span className="text-sm font-semibold">Onyx</span>
        </Link>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    </header>
  );
}

function DetailRow({
  label,
  value,
  strong,
  mono,
  icon,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
  icon?: typeof InvoiceIcon;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={strong ? "font-mono text-xl font-semibold text-primary" : mono ? "font-mono text-sm text-foreground" : "flex items-center gap-2 text-sm text-foreground"}>
        {icon ? <HugeiconsIcon icon={icon} size={14} strokeWidth={2} className="text-primary" aria-hidden="true" /> : null}
        {value}
      </span>
    </div>
  );
}

function shortAddr(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}
