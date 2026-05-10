"use client";

import {
  ArrowDown01Icon,
  CoinsSwapIcon,
  Loading03Icon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useWallet } from "@solana/wallet-adapter-react";
import * as React from "react";

import { SolanaLogo, UsdcLogo, UsdtLogo } from "@/components/logos";
import { FancyButton } from "@/components/ui/fancy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InlineNotice,
  WorkbenchPage,
  WorkbenchPanel,
} from "@/components/ui/workbench";
import {
  getShieldToken,
  isShieldTokenSupported,
  toBaseUnits,
  type ShieldTokenId,
} from "@/lib/cloak/tokens";
import { useTreasuryRebalance } from "@/lib/cloak/use-treasury-rebalance";
import { solscanTxUrl } from "@/lib/solana/explorer";
import { useSolanaNetwork } from "@/lib/solana/network";
import { cn } from "@/lib/utils";

const TOKENS = [
  { id: "SOL" as ShieldTokenId, label: "SOL", name: "Solana", Logo: SolanaLogo },
  { id: "USDC" as ShieldTokenId, label: "USDC", name: "USD Coin", Logo: UsdcLogo },
  { id: "USDT" as ShieldTokenId, label: "USDT", name: "Tether USD", Logo: UsdtLogo },
];

const SLIPPAGE_OPTIONS = [
  { label: "0.5%", value: "50" },
  { label: "1%", value: "100" },
  { label: "3%", value: "300" },
];

type QuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; quote: TreasuryQuote }
  | { status: "error"; message: string };

type TreasuryQuote = {
  inAmount: string;
  outAmount: string;
  minOutputAmount: string;
  priceImpactPct: string | null;
  routeLabel: string;
  provider: string;
};

export default function TreasuryPage() {
  const wallet = useWallet();
  const { config } = useSolanaNetwork();
  const cluster = config.cluster;
  const rebalance = useTreasuryRebalance();
  const [sourceToken] = React.useState<ShieldTokenId>("SOL");
  const [outputToken, setOutputToken] = React.useState<ShieldTokenId>("USDC");
  const [amount, setAmount] = React.useState("");
  const [slippageBps, setSlippageBps] = React.useState("100");
  const [quoteNonce, setQuoteNonce] = React.useState(0);
  const [quoteState, setQuoteState] = React.useState<QuoteState>({ status: "idle" });

  const source = getShieldToken(sourceToken, cluster);
  const output = getShieldToken(outputToken, cluster);
  const sourceMint = source?.mint.toBase58() ?? "";
  const outputMint = output?.mint.toBase58() ?? "";
  const sourceDecimals = source?.decimals ?? 0;
  const outputDecimals = output?.decimals ?? 0;
  const outputSupported = isShieldTokenSupported(outputToken, cluster) && outputToken !== "SOL";
  const normalizedSlippageBps = normalizeBps(slippageBps);
  const amountValid = isPositiveDecimal(amount);
  const running =
    rebalance.phase !== "idle" &&
    rebalance.phase !== "success" &&
    rebalance.phase !== "error";
  const quote = quoteState.status === "success" ? quoteState.quote : null;
  const canRun =
    !!wallet.publicKey &&
    !!source &&
    !!output &&
    outputSupported &&
    amountValid &&
    !!quote &&
    BigInt(quote.minOutputAmount) > 0n &&
    !running;

  React.useEffect(() => {
    let cancelled = false;

    if (!sourceMint || !outputMint || !outputSupported || !amountValid || !sourceDecimals || !outputDecimals) {
      const idleTimer = window.setTimeout(() => {
        if (!cancelled) setQuoteState({ status: "idle" });
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(idleTimer);
      };
    }

    const loadingTimer = window.setTimeout(() => {
      if (!cancelled) setQuoteState({ status: "loading" });
    }, 0);
    const timer = window.setTimeout(async () => {
      try {
        const amountBaseUnits = toBaseUnits(amount, sourceDecimals).toString();
        const res = await fetch("/api/treasury/quote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            inputMint: sourceMint,
            outputMint,
            amount: amountBaseUnits,
            slippageBps: normalizedSlippageBps,
            cluster,
          }),
        });
        const body = (await res.json().catch(() => null)) as
          | { quote?: TreasuryQuote; error?: string }
          | null;
        if (cancelled) return;
        if (!res.ok || !body?.quote) {
          setQuoteState({
            status: "error",
            message: body?.error ?? `Quote failed (${res.status}).`,
          });
          return;
        }
        setQuoteState({ status: "success", quote: body.quote });
      } catch (err) {
        if (!cancelled) {
          setQuoteState({
            status: "error",
            message: err instanceof Error ? err.message : "Quote request failed.",
          });
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimer);
      window.clearTimeout(timer);
    };
  }, [
    amount,
    amountValid,
    normalizedSlippageBps,
    outputDecimals,
    outputMint,
    outputSupported,
    quoteNonce,
    sourceDecimals,
    sourceMint,
    cluster,
  ]);

  async function run() {
    if (!source || !output || !quote || !canRun) return;
    await rebalance.run({
      amountBaseUnits: toBaseUnits(amount, source.decimals),
      outputMint: output.mint,
      minOutputBaseUnits: BigInt(quote.minOutputAmount),
      slippageBps: normalizedSlippageBps,
    }).catch(() => undefined);
  }

  const receiveValue =
    quoteState.status === "success" && output
      ? formatBaseUnitAmount(quoteState.quote.outAmount, output.decimals)
      : quoteState.status === "loading"
        ? "Fetching..."
        : "0";
  const minReceiveValue =
    quote && output
      ? `${formatBaseUnitAmount(quote.minOutputAmount, output.decimals)} ${outputToken}`
      : "Waiting for quote";
  const priceImpact = quote?.priceImpactPct
    ? `${formatPercent(quote.priceImpactPct)}%`
    : "Not returned";

  return (
    <WorkbenchPage
      kicker="Treasury module"
      title="Private treasury rebalance"
      description="Swap shielded SOL into treasury stablecoins with the same compact flow users expect from crypto swap and bridge apps."
      stats={[
        { label: "Source", value: "SOL", hint: "shielded input" },
        { label: "Receive", value: outputToken, tone: outputSupported ? "primary" : "danger" },
        { label: "Network", value: cluster },
        {
          label: "State",
          value: rebalance.phase,
          tone:
            rebalance.phase === "error"
              ? "danger"
              : rebalance.phase === "success"
                ? "success"
                : "default",
        },
      ]}
      aside={
        <WorkbenchPanel title="Execution path" eyebrow="Cloak + Orca">
          <div className="grid gap-3 text-sm leading-6 text-muted-foreground">
            <p>SOL is deposited into Cloak first, then the shielded UTXO is spent through the private swap path.</p>
            <p>The receive amount is quoted before signing and converted into a minimum output guard for execution.</p>
            <p>Final receipts include the shield deposit, swap signature, relay request id, state PDA, and nullifier.</p>
          </div>
        </WorkbenchPanel>
      }
    >
      <div className="grid gap-4">
        <WorkbenchPanel className="mx-auto w-full max-w-xl">
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run();
            }}
          >
            {!wallet.publicKey ? (
              <InlineNotice tone="warning">Connect your treasury wallet before creating a private rebalance.</InlineNotice>
            ) : null}
            {!outputSupported ? (
              <InlineNotice tone="danger">
                {outputToken} is not available as a Cloak swap output on {cluster}.
              </InlineNotice>
            ) : null}

            <div className="rounded-lg border border-border/70 bg-secondary/15 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Label htmlFor="rebalanceAmount" required>
                  Send
                </Label>
                <span className="text-xs text-muted-foreground">Shielded source</span>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  id="rebalanceAmount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                  invalid={amount.length > 0 && !amountValid}
                  aria-invalid={amount.length > 0 && !amountValid ? "true" : undefined}
                  aria-describedby={amount.length > 0 && !amountValid ? "amount-error" : undefined}
                  className="h-14 flex-1 border-0 bg-transparent px-0 focus-within:bg-transparent"
                />
                <TokenPill tokenId="SOL" disabled />
              </div>
              {amount.length > 0 && !amountValid ? (
                <p id="amount-error" className="mt-2 text-xs text-destructive">
                  Enter a SOL amount greater than zero.
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Private swap input is currently SOL because Cloak spends the shielded SOL UTXO.
                </p>
              )}
            </div>

            <div className="relative flex justify-center">
              <div className="absolute inset-x-0 top-1/2 border-t border-border/60" aria-hidden="true" />
              <button
                type="button"
                className="relative grid size-11 place-items-center rounded-lg border border-border bg-card text-primary shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Private swap direction"
              >
                <HugeiconsIcon icon={ArrowDown01Icon} size={18} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>

            <div className="rounded-lg border border-border/70 bg-secondary/15 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Label>Receive</Label>
                <span className="text-xs text-muted-foreground">
                  {quoteState.status === "loading" ? "Quoting route" : "Estimated output"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
                  {receiveValue}
                </div>
                <OutputTokenSelector value={outputToken} onChange={setOutputToken} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Quote refreshes automatically when amount, token, or slippage changes.
              </p>
            </div>

            <fieldset className="grid gap-2">
              <legend className="text-xs font-medium text-muted-foreground">Slippage</legend>
              <div className="grid grid-cols-3 gap-2">
                {SLIPPAGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSlippageBps(option.value)}
                    className={cn(
                      "h-10 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      normalizedSlippageBps === Number(option.value)
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border/70 bg-secondary/15 text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="customSlippage"
                  value={slippageBps}
                  onChange={(event) => setSlippageBps(event.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-10 max-w-36"
                  trailingIcon={<span className="text-xs text-muted-foreground">bps</span>}
                />
                <Label htmlFor="customSlippage" className="text-xs text-muted-foreground">
                  Custom guard
                </Label>
              </div>
            </fieldset>

            <div className="grid gap-2 rounded-lg border border-border/70 bg-secondary/10 p-3 text-sm">
              <QuoteLine label="Route" value={quote?.routeLabel ?? "Waiting for amount"} />
              <QuoteLine label="Minimum received" value={minReceiveValue} />
              <QuoteLine label="Price impact" value={priceImpact} />
              <QuoteLine label="Quote source" value={quote?.provider ?? "Jupiter quote API"} />
            </div>

            {quoteState.status === "error" ? (
              <InlineNotice
                tone="danger"
                title="Receive estimate unavailable"
                action={
                  <button
                    type="button"
                    onClick={() => setQuoteNonce((current) => current + 1)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <HugeiconsIcon icon={Refresh01Icon} size={14} strokeWidth={2.2} aria-hidden="true" />
                    Retry
                  </button>
                }
              >
                {quoteState.message}
              </InlineNotice>
            ) : null}
            {rebalance.error ? (
              <InlineNotice tone="danger" title="Rebalance failed">
                {rebalance.error}
              </InlineNotice>
            ) : null}
            {running ? (
              <InlineNotice tone="primary" title={phaseTitle(rebalance.phase)}>
                {rebalance.progress ?? "Working"}
                {rebalance.proofPercent !== null ? ` · ${Math.round(rebalance.proofPercent)}%` : ""}
              </InlineNotice>
            ) : null}

            <FancyButton
              type="submit"
              variant="primary"
              size="xl"
              disabled={!canRun}
              aria-busy={running ? "true" : undefined}
              className="h-12 w-full"
            >
              {running ? (
                <HugeiconsIcon icon={Loading03Icon} size={16} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
              ) : (
                <HugeiconsIcon icon={CoinsSwapIcon} size={16} strokeWidth={2.2} aria-hidden="true" />
              )}
              {buttonLabel({ running, walletConnected: !!wallet.publicKey, amountValid, quoteState })}
            </FancyButton>
          </form>
        </WorkbenchPanel>

        {rebalance.result ? (
          <WorkbenchPanel title="Private rebalance receipt" eyebrow="Confirmed">
            <div className="grid gap-4">
              <InlineNotice tone="success" title="Swap route submitted">
                The shield deposit and private swap state were submitted through Cloak.
              </InlineNotice>
              <div className="grid gap-2">
                <ReceiptLine label="Shield deposit" value={rebalance.result.depositSignature} href={solscanTxUrl(rebalance.result.depositSignature, config.cluster, config.rpcUrl)} />
                <ReceiptLine label="Swap transaction" value={rebalance.result.swapSignature} href={solscanTxUrl(rebalance.result.swapSignature, config.cluster, config.rpcUrl)} />
                <ReceiptLine label="Swap state PDA" value={rebalance.result.swapStatePda} />
                <ReceiptLine label="Relay request" value={rebalance.result.requestId ?? "not returned"} />
                <ReceiptLine label="Nullifier" value={rebalance.result.nullifier} />
              </div>
            </div>
          </WorkbenchPanel>
        ) : null}
      </div>
    </WorkbenchPage>
  );
}

function OutputTokenSelector({
  value,
  onChange,
}: {
  value: ShieldTokenId;
  onChange: (id: ShieldTokenId) => void;
}) {
  const { config } = useSolanaNetwork();
  const cluster = config.cluster;
  return (
    <div className="flex rounded-lg border border-border/70 bg-card p-1" role="group" aria-label="Receive token">
      {TOKENS.filter((token) => token.id !== "SOL").map((token) => {
        const active = value === token.id;
        const supported = isShieldTokenSupported(token.id, cluster);
        return (
          <button
            key={token.id}
            type="button"
            disabled={!supported}
            onClick={() => onChange(token.id)}
            className={cn(
              "flex h-10 min-w-20 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            title={supported ? token.name : `Not configured on ${cluster}`}
          >
            <token.Logo className="size-3.5" />
            {token.label}
          </button>
        );
      })}
    </div>
  );
}

function TokenPill({
  tokenId,
  disabled,
}: {
  tokenId: ShieldTokenId;
  disabled?: boolean;
}) {
  const token = TOKENS.find((entry) => entry.id === tokenId) ?? TOKENS[0];
  return (
    <button
      type="button"
      disabled={disabled}
      className="flex h-11 shrink-0 items-center gap-2 rounded-lg border border-border/70 bg-card px-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
    >
      <token.Logo className="size-4" />
      {token.label}
    </button>
  );
}

function QuoteLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function ReceiptLine({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="truncate font-mono text-sm text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {short(value)}
        </a>
      ) : (
        <span className="truncate font-mono text-sm text-foreground">{short(value)}</span>
      )}
    </div>
  );
}

function phaseTitle(phase: string): string {
  switch (phase) {
    case "deposit-proof":
      return "Generating deposit proof";
    case "deposit-submit":
      return "Submitting shield deposit";
    case "swap-proof":
      return "Generating swap proof";
    case "swap-submit":
      return "Submitting private swap";
    default:
      return "Routing privately";
  }
}

function buttonLabel({
  running,
  walletConnected,
  amountValid,
  quoteState,
}: {
  running: boolean;
  walletConnected: boolean;
  amountValid: boolean;
  quoteState: QuoteState;
}) {
  if (running) return "Routing privately";
  if (!walletConnected) return "Connect wallet";
  if (!amountValid) return "Enter amount";
  if (quoteState.status === "loading") return "Fetching receive amount";
  if (quoteState.status === "error") return "Quote required";
  return "Run private rebalance";
}

function normalizeBps(value: string): number {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return 100;
  return Math.max(0, Math.min(5_000, Math.floor(n)));
}

function isPositiveDecimal(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim()) && Number(value) > 0;
}

function formatBaseUnitAmount(raw: string, decimals: number): string {
  const value = BigInt(raw);
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const remainder = value % base;
  if (remainder === 0n) return whole.toString();
  const fraction = remainder
    .toString()
    .padStart(decimals, "0")
    .slice(0, Math.min(decimals, 6))
    .replace(/0+$/, "");
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

function formatPercent(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toFixed(n < 0.01 ? 4 : 2).replace(/0+$/, "").replace(/\.$/, "");
}

function short(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}
