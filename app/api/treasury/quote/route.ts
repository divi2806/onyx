import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { getShieldToken, getShieldTokenByMint } from "@/lib/cloak/tokens";
import { solanaConfig } from "@/lib/solana/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QuoteBody = {
  inputMint?: unknown;
  outputMint?: unknown;
  amount?: unknown;
  slippageBps?: unknown;
};

type NormalizedQuote = {
  inAmount: string;
  outAmount: string;
  minOutputAmount: string;
  priceImpactPct: string | null;
  routeLabel: string;
  provider: string;
};

const DEFAULT_QUOTE_URLS = [
  "https://lite-api.jup.ag/swap/v1/quote",
  "https://quote-api.jup.ag/v6/quote",
];

export async function POST(req: Request) {
  let body: QuoteBody;
  try {
    body = (await req.json()) as QuoteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const inputMint = requirePubkey(body.inputMint, "inputMint");
    const outputMint = requirePubkey(body.outputMint, "outputMint");
    const amount = requirePositiveInteger(body.amount, "amount");
    const slippageBps = requireBps(body.slippageBps);

    const inputToken = getShieldToken("SOL");
    const outputToken = getShieldTokenByMint(outputMint.toBase58());
    if (!inputToken || inputMint.toBase58() !== inputToken.mint.toBase58()) {
      return NextResponse.json(
        { error: "Treasury rebalance currently quotes shielded SOL as the source." },
        { status: 400 },
      );
    }
    if (!outputToken || outputToken.id === "SOL") {
      return NextResponse.json(
        { error: `Unsupported treasury output on ${solanaConfig.cluster}.` },
        { status: 400 },
      );
    }

    const params = new URLSearchParams({
      inputMint: inputMint.toBase58(),
      outputMint: outputMint.toBase58(),
      amount,
      slippageBps: String(slippageBps),
    });

    const errors: string[] = [];
    for (const endpoint of quoteEndpoints()) {
      const url = `${endpoint}?${params.toString()}`;
      try {
        const res = await fetch(url, {
          headers: quoteHeaders(endpoint),
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as unknown;
        if (!res.ok) {
          errors.push(readQuoteError(json) ?? `${providerName(endpoint)} returned ${res.status}`);
          continue;
        }

        const quote = normalizeQuote(json, providerName(endpoint));
        if (quote) return NextResponse.json({ quote });
        errors.push(`${providerName(endpoint)} returned an incomplete quote.`);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Quote request failed.");
      }
    }

    return NextResponse.json(
      {
        error:
          errors[0] ??
          "Quote unavailable. Check the output token, network, or JUPITER_QUOTE_URL.",
      },
      { status: 502 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid quote request." },
      { status: 400 },
    );
  }
}

function quoteEndpoints(): string[] {
  const custom = process.env.JUPITER_QUOTE_URL?.trim();
  const urls = custom ? [custom, ...DEFAULT_QUOTE_URLS] : DEFAULT_QUOTE_URLS;
  if (process.env.JUPITER_API_KEY) {
    urls.push("https://api.jup.ag/swap/v1/quote");
  }
  return [...new Set(urls.map((url) => url.replace(/\/$/, "")))];
}

function quoteHeaders(endpoint: string): Record<string, string> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (endpoint.includes("api.jup.ag") && process.env.JUPITER_API_KEY) {
    headers["x-api-key"] = process.env.JUPITER_API_KEY;
  }
  return headers;
}

function normalizeQuote(json: unknown, provider: string): NormalizedQuote | null {
  if (!isRecord(json)) return null;
  const inAmount = stringValue(json.inAmount) ?? stringValue(json.inputAmount);
  const outAmount = stringValue(json.outAmount) ?? stringValue(json.outputAmount);
  const minOutputAmount =
    stringValue(json.otherAmountThreshold) ??
    stringValue(json.minOutputAmount) ??
    stringValue(json.minOutAmount) ??
    outAmount;
  if (!inAmount || !outAmount || !minOutputAmount) return null;
  if (!isPositiveIntegerString(inAmount) || !isPositiveIntegerString(outAmount) || !isPositiveIntegerString(minOutputAmount)) {
    return null;
  }
  return {
    inAmount,
    outAmount,
    minOutputAmount,
    priceImpactPct:
      stringValue(json.priceImpactPct) ??
      stringValue(json.priceImpactPercent) ??
      null,
    routeLabel: routeLabel(json),
    provider,
  };
}

function routeLabel(json: Record<string, unknown>): string {
  const routePlan = json.routePlan;
  if (Array.isArray(routePlan)) {
    const labels = routePlan
      .map((leg) => {
        if (!isRecord(leg)) return null;
        const swapInfo = leg.swapInfo;
        if (!isRecord(swapInfo)) return null;
        return stringValue(swapInfo.label);
      })
      .filter((label): label is string => !!label);
    if (labels.length) return [...new Set(labels)].join(" + ");
  }
  return "Best available route";
}

function readQuoteError(json: unknown): string | null {
  if (!isRecord(json)) return null;
  const error = stringValue(json.error);
  const message = stringValue(json.message);
  return error ?? message ?? null;
}

function providerName(endpoint: string): string {
  try {
    return new URL(endpoint).hostname.replace(/^www\./, "");
  } catch {
    return "quote provider";
  }
}

function requirePubkey(value: unknown, field: string): PublicKey {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${field}.`);
  try {
    return new PublicKey(value.trim());
  } catch {
    throw new Error(`Invalid ${field}.`);
  }
}

function requirePositiveInteger(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d+$/.test(value) || BigInt(value) <= 0n) {
    throw new Error(`Invalid ${field}.`);
  }
  return value;
}

function requireBps(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isFinite(n)) return 100;
  return Math.max(0, Math.min(5_000, Math.floor(n)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function isPositiveIntegerString(value: string): boolean {
  return /^\d+$/.test(value) && BigInt(value) > 0n;
}
