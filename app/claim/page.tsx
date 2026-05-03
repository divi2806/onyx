"use client";

import {
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
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

import { ConnectButton } from "@/components/solana/connect-button";
import { OnyxMark } from "@/components/logos";
import { FancyButton } from "@/components/ui/fancy-button";
import { cloakConfig } from "@/lib/cloak/config";
import { decodeClaimPayload } from "@/lib/cloak/invoice";
import { fastSendOnce } from "@/lib/cloak/fast-send-core";
import { createMemoizedSignMessage } from "@/lib/cloak/sign-message-cache";
import { getShieldToken, toBaseUnits } from "@/lib/cloak/tokens";
import { applyBufferPolyfill } from "@/lib/buffer-polyfill";

type PayState = "idle" | "paying" | "success" | "error";

function ClaimPageInner() {
  const params = useSearchParams();
  const { connection } = useConnection();
  const { publicKey, signTransaction, signMessage } = useWallet();

  const vParam = params.get("v") ?? "";
  const payload = React.useMemo(() => decodeClaimPayload(vParam), [vParam]);

  const [payState, setPayState] = React.useState<PayState>("idle");
  const [progress, setProgress] = React.useState<string | null>(null);
  const [txSig, setTxSig] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const signMessageCacheRef = React.useRef<{
    fn: ((msg: Uint8Array) => Promise<Uint8Array>) | null;
    key: string;
  }>({ fn: null, key: "" });

  const token = payload ? getShieldToken(payload.s) : null;

  async function handlePay() {
    if (!payload || !publicKey || !signTransaction || !signMessage || !token) return;

    setPayState("paying");
    setError(null);
    setProgress("Preparing payment…");

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
      const recipient = new PublicKey(payload.r);

      const result = await fastSendOnce({
        amountBaseUnits,
        mint: token.mint,
        recipient,
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

  const isLoading = payState === "paying";

  if (!payload) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-foreground">
        <OnyxMark className="mb-4 size-10 opacity-40" />
        <h1 className="text-[18px] font-semibold text-foreground">Invalid claim link</h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground">
          This link is missing or malformed. Ask the sender for a new one.
        </p>
        <Link href="/" className="mt-6 text-[13px] text-primary underline-offset-2 hover:underline">
          Return to Onyx
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Minimal nav */}
      <header className="flex h-14 items-center gap-3 border-b border-border px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <OnyxMark className="size-6" />
          <span className="text-[15px] font-semibold tracking-tight">Onyx</span>
        </Link>
        <div className="h-5 w-px bg-border" />
        <span className="text-[13px] text-muted-foreground">Payment request</span>
      </header>

      <main className="mx-auto max-w-md px-4 py-16">
        {payState === "success" && txSig ? (
          /* Success state */
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="grid size-16 place-items-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
              <HugeiconsIcon
                icon={CheckmarkCircle01Icon}
                size={28}
                strokeWidth={1.6}
                className="text-emerald-400"
              />
            </div>
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
                Payment sent
              </h1>
              <p className="mt-2 text-[13.5px] text-muted-foreground">
                {payload.a} {payload.s} routed through the shielded pool. The recipient will
                receive funds shortly.
              </p>
            </div>
            <div className="w-full rounded-xl border border-border bg-card/60 p-4 text-left">
              <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Transaction
              </p>
              <p className="mt-1 truncate font-mono text-[12.5px] text-foreground">
                {txSig}
              </p>
            </div>
            <Link
              href="/"
              className="text-[13px] text-primary underline-offset-2 hover:underline"
            >
              Return to Onyx
            </Link>
          </div>
        ) : (
          /* Invoice card */
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="grid size-12 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <HugeiconsIcon icon={InvoiceIcon} size={22} strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
                  Payment request
                </h1>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Review and pay through the Onyx shielded pool.
                </p>
              </div>
            </div>

            {/* Invoice details */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-6">
              <div className="flex items-end justify-between">
                <span className="text-[13px] text-muted-foreground">Amount</span>
                <span className="font-mono text-[22px] font-semibold text-foreground">
                  {payload.a}{" "}
                  <span className="text-[16px] text-muted-foreground">{payload.s}</span>
                </span>
              </div>
              {payload.memo && (
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[13px] text-muted-foreground">Memo</span>
                  <span className="text-[13px] text-foreground">{payload.memo}</span>
                </div>
              )}
              <div className="flex items-start justify-between border-t border-border pt-3">
                <span className="text-[13px] text-muted-foreground">Recipient</span>
                <span className="font-mono text-[12px] text-foreground/80">
                  {payload.r.slice(0, 6)}…{payload.r.slice(-4)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-[13px] text-muted-foreground">Route</span>
                <span className="flex items-center gap-1.5 text-[12.5px] text-primary">
                  <HugeiconsIcon icon={LockIcon} size={12} strokeWidth={2} />
                  Cloak shielded pool
                </span>
              </div>
            </div>

            {/* Privacy note */}
            <p className="text-[12px] leading-5 text-muted-foreground">
              Your payment flows through a ZK shielded pool. On-chain, there is no direct
              link between your wallet and the recipient.
            </p>

            {/* Error */}
            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
                {error}
              </p>
            )}

            {/* Progress */}
            {isLoading && progress && (
              <p className="text-[12.5px] text-muted-foreground">{progress}</p>
            )}

            {/* CTA */}
            {publicKey ? (
              <FancyButton
                variant="primary"
                size="lg"
                onClick={handlePay}
                disabled={isLoading || !token}
              >
                {isLoading ? (
                  <>
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      size={14}
                      strokeWidth={2.2}
                      className="animate-spin"
                    />
                    {progress ?? "Paying…"}
                  </>
                ) : (
                  <>
                    Pay {payload.a} {payload.s}
                    <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2.2} />
                  </>
                )}
              </FancyButton>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[12.5px] text-muted-foreground">
                  Connect your wallet to pay this invoice.
                </p>
                <ConnectButton />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={24}
            strokeWidth={1.8}
            className="animate-spin text-muted-foreground"
          />
        </div>
      }
    >
      <ClaimPageInner />
    </React.Suspense>
  );
}
