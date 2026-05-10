"use client";

import {
  createUtxo,
  createZeroUtxo,
  generateUtxoKeypair,
  NATIVE_SOL_MINT,
  swapWithChange,
  transact,
  type UtxoSwapResult,
} from "@cloak.dev/sdk";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import * as React from "react";

import { applyBufferPolyfill } from "@/lib/buffer-polyfill";
import { cloakConfig } from "@/lib/cloak/config";
import { createMemoizedSignMessage } from "@/lib/cloak/sign-message-cache";

export type RebalancePhase =
  | "idle"
  | "deposit-proof"
  | "deposit-submit"
  | "swap-proof"
  | "swap-submit"
  | "success"
  | "error";

export type RebalanceResult = {
  depositSignature: string;
  swapSignature: string;
  swapStatePda: string;
  requestId?: string;
  nullifier: string;
};

export type RunRebalanceArgs = {
  amountBaseUnits: bigint;
  outputMint: PublicKey;
  minOutputBaseUnits: bigint;
  slippageBps: number;
};

const RELAY_SETTLE_DELAY_MS = 4000;

export function useTreasuryRebalance() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [phase, setPhase] = React.useState<RebalancePhase>("idle");
  const [progress, setProgress] = React.useState<string | null>(null);
  const [proofPercent, setProofPercent] = React.useState<number | null>(null);
  const [result, setResult] = React.useState<RebalanceResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const signCacheRef = React.useRef<{
    key: string;
    fn: ((msg: Uint8Array) => Promise<Uint8Array>) | null;
  }>({ key: "", fn: null });

  const reset = React.useCallback(() => {
    setPhase("idle");
    setProgress(null);
    setProofPercent(null);
    setResult(null);
    setError(null);
  }, []);

  const run = React.useCallback(
    async ({ amountBaseUnits, outputMint, minOutputBaseUnits, slippageBps }: RunRebalanceArgs) => {
      if (!wallet.publicKey) throw new Error("Connect your wallet first.");
      if (!wallet.signTransaction) throw new Error("Wallet does not support transaction signing.");
      if (!wallet.signMessage) throw new Error("Wallet does not support signMessage.");
      if (amountBaseUnits <= 0n) throw new Error("Amount must be greater than zero.");
      if (minOutputBaseUnits <= 0n) throw new Error("Minimum output must be greater than zero.");

      applyBufferPolyfill();
      setPhase("deposit-proof");
      setProgress("Generating shield deposit proof");
      setProofPercent(0);
      setResult(null);
      setError(null);

      const sender = wallet.publicKey;
      if (signCacheRef.current.key !== sender.toBase58() || !signCacheRef.current.fn) {
        signCacheRef.current = {
          key: sender.toBase58(),
          fn: createMemoizedSignMessage(wallet.signMessage),
        };
      }
      const signMessage = signCacheRef.current.fn;
      if (!signMessage) throw new Error("Unable to prepare wallet message signer.");

      try {
        const owner = await generateUtxoKeypair();
        const depositOutput = await createUtxo(amountBaseUnits, owner, NATIVE_SOL_MINT);
        let depositSubmitting = false;
        const deposit = await transact(
          {
            inputUtxos: [await createZeroUtxo(NATIVE_SOL_MINT)],
            outputUtxos: [depositOutput],
            externalAmount: amountBaseUnits,
            depositor: sender,
          },
          {
            connection,
            programId: cloakConfig.programId,
            relayUrl: cloakConfig.relayUrl,
            depositorPublicKey: sender,
            walletPublicKey: sender,
            signTransaction: wallet.signTransaction,
            signMessage,
            enforceViewingKeyRegistration: false,
            onProgress: (status) => {
              if (!depositSubmitting && isSubmitting(status)) {
                depositSubmitting = true;
                setPhase("deposit-submit");
              }
              setProgress(status);
            },
            onProofProgress: (percent) => setProofPercent(clampPercent(percent)),
          },
        );

        setPhase("swap-proof");
        setProgress("Waiting for relay to index shield deposit");
        setProofPercent(0);
        await sleep(RELAY_SETTLE_DELAY_MS);

        const recipientAta = getAssociatedTokenAddressSync(outputMint, sender);
        let swapSubmitting = false;
        const swap = await swapWithChange(
          deposit.outputUtxos,
          amountBaseUnits,
          outputMint,
          recipientAta,
          minOutputBaseUnits,
          {
            connection,
            programId: cloakConfig.programId,
            relayUrl: cloakConfig.relayUrl,
            walletPublicKey: sender,
            signTransaction: wallet.signTransaction,
            signMessage,
            enforceViewingKeyRegistration: false,
            cachedMerkleTree: deposit.merkleTree,
            swapSlippageBps: slippageBps,
            onProgress: (status) => {
              if (!swapSubmitting && isSubmitting(status)) {
                swapSubmitting = true;
                setPhase("swap-submit");
              }
              setProgress(status);
            },
            onProofProgress: (percent) => setProofPercent(clampPercent(percent)),
          },
          sender,
        ) as UtxoSwapResult;

        const next: RebalanceResult = {
          depositSignature: deposit.signature,
          swapSignature: swap.signature,
          swapStatePda: swap.swapStatePda,
          requestId: swap.requestId,
          nullifier: swap.nullifier,
        };
        setResult(next);
        setPhase("success");
        setProgress("Private rebalance submitted");
        setProofPercent(100);
        return next;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setPhase("error");
        throw err;
      }
    },
    [connection, wallet],
  );

  return { phase, progress, proofPercent, result, error, run, reset };
}

function isSubmitting(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("submit") || s.includes("send") || s.includes("confirm") || s.includes("broadcast");
}

function clampPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.max(0, Math.min(100, percent));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
