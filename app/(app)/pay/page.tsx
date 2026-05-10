"use client";

import {
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  LockIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { isAddress } from "@solana/kit";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import * as React from "react";

import { SolanaLogo, UsdcLogo, UsdtLogo } from "@/components/logos";
import { FancyButton } from "@/components/ui/fancy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress";
import {
  FieldStack,
  InlineNotice,
  WorkbenchPage,
  WorkbenchPanel,
} from "@/components/ui/workbench";
import { appendPayment } from "@/lib/cloak/payment-history";
import {
  getShieldToken,
  isShieldTokenSupported,
  toBaseUnits,
  type ShieldTokenId,
} from "@/lib/cloak/tokens";
import { useFastSend } from "@/lib/cloak/use-fast-send";
import { solscanTxUrl } from "@/lib/solana/explorer";
import { useSolanaNetwork } from "@/lib/solana/network";
import { cn } from "@/lib/utils";

const TOKENS = [
  { id: "SOL", label: "SOL", Logo: SolanaLogo, decimals: 9, min: 0.01 },
  { id: "USDC", label: "USDC", Logo: UsdcLogo, decimals: 6, min: 0.01 },
  { id: "USDT", label: "USDT", Logo: UsdtLogo, decimals: 6, min: 0.01 },
] as const;

type TokenId = (typeof TOKENS)[number]["id"] & ShieldTokenId;

type AmountError =
  | { kind: "format" }
  | { kind: "non-positive" }
  | { kind: "decimals"; max: number }
  | { kind: "below-min"; min: number; token: TokenId };

type AddressError = { kind: "format" } | { kind: "length" };

export default function PayPage() {
  const [token, setToken] = React.useState<TokenId>("USDC");
  const [amount, setAmount] = React.useState("");
  const [recipient, setRecipient] = React.useState("");
  const [amountTouched, setAmountTouched] = React.useState(false);
  const [recipientTouched, setRecipientTouched] = React.useState(false);
  const [lastSend, setLastSend] = React.useState<{
    net: number;
    token: TokenId;
    recipient: string;
  } | null>(null);

  const wallet = useWallet();
  const { config } = useSolanaNetwork();
  const cluster = config.cluster;
  const fastSend = useFastSend();

  const amountError = React.useMemo(
    () => validateAmount(amount, token),
    [amount, token],
  );
  const addressError = React.useMemo(
    () => validateAddress(recipient),
    [recipient],
  );
  const shieldToken = React.useMemo(
    () => getShieldToken(token, cluster),
    [cluster, token],
  );
  const tokenSupported = isShieldTokenSupported(token, cluster);
  const amountValid = !amountError && amount.trim() !== "";
  const addressValid = !addressError && recipient.trim() !== "";
  const submitting = isSubmitting(fastSend.status);
  const numericAmount = amountValid ? Number(amount) : 0;
  const variableFee = numericAmount * 0.003;
  const recipientReceives =
    numericAmount > 0
      ? Math.max(0, numericAmount - variableFee - (token === "SOL" ? 0.005 : 0))
      : 0;

  const canSubmit =
    amountValid &&
    addressValid &&
    tokenSupported &&
    wallet.connected &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAmountTouched(true);
    setRecipientTouched(true);
    if (!amountValid || !addressValid || !shieldToken || !wallet.connected) return;

    const recipientTrimmed = recipient.trim();
    setLastSend({ net: recipientReceives, token, recipient: recipientTrimmed });

    try {
      const amountBaseUnits = toBaseUnits(amount, shieldToken.decimals);
      const recipientPubkey = new PublicKey(recipientTrimmed);
      const result = await fastSend.send({
        amountBaseUnits,
        mint: shieldToken.mint,
        recipient: recipientPubkey,
      });

      if (wallet.publicKey) {
        appendPayment(wallet.publicKey.toBase58(), cluster, {
          id: result.depositSignature,
          cluster,
          sender: wallet.publicKey.toBase58(),
          recipient: recipientPubkey.toBase58(),
          token,
          mint: shieldToken.mint.toBase58(),
          decimals: shieldToken.decimals,
          amountRaw: amountBaseUnits.toString(),
          netRaw: netBaseUnits(amountBaseUnits, token === "SOL").toString(),
          depositSignature: result.depositSignature,
          withdrawSignature: result.withdrawSignature,
          timestamp: Date.now(),
          source: "pay",
        });
      }
    } catch {
      // useFastSend owns the visible error state.
    }
  }

  return (
    <WorkbenchPage
      kicker="Send module"
      title="Private transfer workbench"
      description="Build a single-recipient payment, review the fee path, then execute the deposit and payout proofs without exposing counterparty details on-chain."
      stats={[
        { label: "Cluster", value: cluster, tone: cluster === "devnet" ? "warning" : "default" },
        { label: "Asset", value: token, hint: tokenSupported ? "available" : "unsupported", tone: tokenSupported ? "primary" : "danger" },
        { label: "Recipient net", value: recipientReceives > 0 ? `${formatAmount(recipientReceives)} ${token}` : "0.00", hint: "estimated after fees" },
        { label: "Status", value: phaseLabel(fastSend.status), tone: fastSend.status === "error" ? "danger" : fastSend.status === "success" ? "success" : "default" },
      ]}
      aside={
        <div className="flex flex-col gap-4">
          <WorkbenchPanel title="Settlement preview" eyebrow="Fees">
            <dl className="grid gap-3 text-sm">
              <SummaryRow label="Gross send" value={numericAmount > 0 ? `${formatAmount(numericAmount)} ${token}` : "-"} />
              <SummaryRow label="Variable fee" value={numericAmount > 0 ? `${formatAmount(variableFee)} ${token}` : "-"} hint="0.30%" />
              <SummaryRow label="Network fee" value="0.005 SOL" />
              <div className="border-t border-border/70 pt-3">
                <SummaryRow
                  label="Recipient receives"
                  value={recipientReceives > 0 ? `${formatAmount(recipientReceives)} ${token}` : "-"}
                  strong
                />
              </div>
            </dl>
          </WorkbenchPanel>

          <WorkbenchPanel title="Privacy path" eyebrow="Cloak">
            <ul className="grid gap-3 text-sm text-muted-foreground">
              {[
                "Deposit proof creates a shielded UTXO.",
                "Withdraw proof pays the recipient from the shield pool.",
                "Local history stores your audit trail in this browser.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <HugeiconsIcon icon={LockIcon} size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </WorkbenchPanel>
        </div>
      }
    >
      <WorkbenchPanel
        title={fastSend.status === "success" && lastSend ? "Transfer complete" : "Transfer builder"}
        eyebrow="Execution"
        description={fastSend.status === "success" && lastSend ? "Both shield and payout transactions confirmed." : "Enter the recipient and amount, then sign the proof transactions in your wallet."}
      >
        {fastSend.status === "success" && lastSend ? (
          <SuccessCard
            net={lastSend.net}
            token={lastSend.token}
            recipient={lastSend.recipient}
            depositSignature={fastSend.depositSignature}
            withdrawSignature={fastSend.withdrawSignature}
            onSendAnother={() => {
              fastSend.reset();
              setLastSend(null);
              setAmount("");
              setRecipient("");
              setAmountTouched(false);
              setRecipientTouched(false);
            }}
          />
        ) : (
          <form className="grid gap-5" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
            <FieldStack>
              <Label htmlFor="recipient" required>Recipient wallet</Label>
              <Input
                id="recipient"
                placeholder="7xKX...p2aB"
                autoComplete="off"
                spellCheck={false}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                onBlur={() => setRecipientTouched(true)}
                invalid={recipientTouched && !!addressError}
                aria-invalid={recipientTouched && !!addressError ? "true" : undefined}
                aria-describedby={recipientTouched && addressError ? "recipient-error" : "recipient-hint"}
                className="font-mono"
                trailingIcon={
                  addressValid ? (
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} strokeWidth={2} className="text-primary" aria-hidden="true" />
                  ) : undefined
                }
              />
              <FieldFootnote
                id="recipient"
                hint="The address is only used inside the payout proof."
                error={recipientTouched && addressError ? addressErrorMessage(addressError) : null}
              />
            </FieldStack>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <FieldStack>
                <Label htmlFor="amount" required>Amount</Label>
                <Input
                  id="amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => setAmountTouched(true)}
                  invalid={amountTouched && !!amountError}
                  aria-invalid={amountTouched && !!amountError ? "true" : undefined}
                  aria-describedby={amountTouched && amountError ? "amount-error" : "amount-hint"}
                  className="font-mono"
                />
                <FieldFootnote
                  id="amount"
                  hint={numericAmount > 0 ? `Estimated net: ${formatAmount(recipientReceives)} ${token}` : "Minimum 0.01"}
                  error={amountTouched && amountError ? amountErrorMessage(amountError) : null}
                />
              </FieldStack>

              <FieldStack>
                <Label>Token</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TOKENS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setToken(option.id)}
                      disabled={!isShieldTokenSupported(option.id, cluster)}
                      className={cn(
                        "flex h-11 items-center justify-center gap-2 rounded-lg border border-border/80 bg-secondary/35 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
                        token === option.id && "border-primary/40 bg-primary/12 text-primary",
                      )}
                    >
                      <option.Logo className="size-4" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </FieldStack>
            </div>

            {!tokenSupported ? (
              <InlineNotice tone="danger">This token is not available on {cluster}.</InlineNotice>
            ) : null}

            {fastSend.status === "error" && fastSend.error ? (
              <InlineNotice tone="danger" title="Transfer failed">
                {fastSend.error.message}
              </InlineNotice>
            ) : null}

            <TransactionProgress
              show={submitting}
              percent={fastSend.uiPercent}
              message={fastSend.progress ?? phaseLabel(fastSend.status)}
            />

            <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Wallet prompts appear for proof authorization and transaction signing.
              </p>
              <FancyButton type="submit" variant="primary" size="xl" disabled={!canSubmit}>
                {submitButtonLabel(fastSend.status, wallet.connected)}
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2.2} aria-hidden="true" />
              </FancyButton>
            </div>
          </form>
        )}
      </WorkbenchPanel>
    </WorkbenchPage>
  );
}

function FieldFootnote({
  id,
  hint,
  error,
}: {
  id: string;
  hint?: React.ReactNode;
  error: string | null;
}) {
  if (error) {
    return (
      <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
        {error}
      </p>
    );
  }
  return hint ? (
    <p id={`${id}-hint`} className="text-xs text-muted-foreground">
      {hint}
    </p>
  ) : null;
}

function SuccessCard({
  net,
  token,
  recipient,
  depositSignature,
  withdrawSignature,
  onSendAnother,
}: {
  net: number;
  token: TokenId;
  recipient: string;
  depositSignature: string | null;
  withdrawSignature: string | null;
  onSendAnother: () => void;
}) {
  return (
    <div className="grid gap-4">
      <InlineNotice
        tone="success"
        title={`${formatAmount(net)} ${token} sent privately`}
        action={
          <FancyButton type="button" variant="neutral" size="md" onClick={onSendAnother}>
            Send another
          </FancyButton>
        }
      >
        Recipient {shortAddress(recipient)} can verify the payout on Solscan.
      </InlineNotice>
      <div className="grid gap-3 sm:grid-cols-2">
        <TxLink label="Shield deposit" signature={depositSignature} />
        <TxLink label="Private payout" signature={withdrawSignature} />
      </div>
    </div>
  );
}

function TxLink({ label, signature }: { label: string; signature: string | null }) {
  const { config } = useSolanaNetwork();
  return (
    <a
      href={signature ? solscanTxUrl(signature, config.cluster, config.rpcUrl) : undefined}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "rounded-lg border border-border/80 bg-secondary/25 p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        signature ? "hover:border-primary/35 hover:bg-secondary/45" : "pointer-events-none opacity-50",
      )}
    >
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-sm text-foreground">
        {signature ? shortSig(signature) : "-"}
      </p>
    </a>
  );
}

function SummaryRow({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">
        {label}
        {hint ? <span className="ml-2 font-mono text-xs text-muted-foreground/70">{hint}</span> : null}
      </dt>
      <dd className={cn("font-mono tabular-nums", strong ? "text-primary" : "text-foreground")}>
        {value}
      </dd>
    </div>
  );
}

function TransactionProgress({
  show,
  percent,
  message,
}: {
  show: boolean;
  percent: number;
  message: string;
}) {
  if (!show) return null;
  const display = Math.round(Math.max(0, Math.min(100, percent)));
  return (
    <div className="rounded-lg border border-primary/25 bg-primary/10 p-4" role="status" aria-live="polite">
      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
        <span className="truncate text-foreground">{message}</span>
        <span className="font-mono tabular-nums text-primary">{display}%</span>
      </div>
      <ProgressPrimitive.Root value={display}>
        <ProgressTrack className="h-2 bg-background/60">
          <ProgressIndicator />
        </ProgressTrack>
      </ProgressPrimitive.Root>
    </div>
  );
}

function validateAmount(raw: string, token: TokenId): AmountError | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === ".") return { kind: "format" };
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return { kind: "non-positive" };
  const dot = trimmed.indexOf(".");
  const decimals = dot === -1 ? 0 : trimmed.length - dot - 1;
  const tokenMeta = TOKENS.find((t) => t.id === token)!;
  if (decimals > tokenMeta.decimals) return { kind: "decimals", max: tokenMeta.decimals };
  if (n < tokenMeta.min) return { kind: "below-min", min: tokenMeta.min, token };
  return null;
}

function validateAddress(raw: string): AddressError | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length < 32 || trimmed.length > 44) return { kind: "length" };
  if (!isAddress(trimmed)) return { kind: "format" };
  return null;
}

function amountErrorMessage(err: AmountError) {
  switch (err.kind) {
    case "format":
      return "Use numbers and one decimal point.";
    case "non-positive":
      return "Amount must be greater than zero.";
    case "decimals":
      return `Use up to ${err.max} decimal places.`;
    case "below-min":
      return `Minimum is ${err.min} ${err.token}.`;
  }
}

function addressErrorMessage(err: AddressError) {
  return err.kind === "length"
    ? "A Solana address is 32 to 44 characters."
    : "Enter a valid Solana address.";
}

function netBaseUnits(amount: bigint, tokenIsSol: boolean): bigint {
  const variable = (amount * 3n) / 1000n;
  const fixed = tokenIsSol ? 5_000_000n : 0n;
  const net = amount - variable - fixed;
  return net < 0n ? 0n : net;
}

function isSubmitting(status: ReturnType<typeof useFastSend>["status"]): boolean {
  return (
    status === "deposit-proof" ||
    status === "deposit-submit" ||
    status === "withdraw-proof" ||
    status === "withdraw-submit"
  );
}

function submitButtonLabel(
  status: ReturnType<typeof useFastSend>["status"],
  connected: boolean,
): string {
  if (!connected) return "Connect wallet";
  switch (status) {
    case "deposit-proof":
      return "Generating deposit proof";
    case "deposit-submit":
      return "Shielding deposit";
    case "withdraw-proof":
      return "Generating payout proof";
    case "withdraw-submit":
      return "Paying recipient";
    default:
      return "Send privately";
  }
}

function phaseLabel(status: ReturnType<typeof useFastSend>["status"]): string {
  switch (status) {
    case "deposit-proof":
      return "Deposit proof";
    case "deposit-submit":
      return "Deposit submit";
    case "withdraw-proof":
      return "Payout proof";
    case "withdraw-submit":
      return "Payout submit";
    case "success":
      return "Confirmed";
    case "error":
      return "Failed";
    default:
      return "Ready";
  }
}

function formatAmount(n: number) {
  if (!Number.isFinite(n) || n === 0) return "0.00";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function shortSig(sig: string): string {
  if (sig.length <= 10) return sig;
  return `${sig.slice(0, 5)}...${sig.slice(-5)}`;
}

function shortAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}
