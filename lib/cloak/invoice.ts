import type { SolanaCluster } from "@/lib/solana/config";
import type { ShieldTokenId } from "./tokens";

const STORAGE_PREFIX = "onyx:invoices:v1";
const STORAGE_EVENT = "onyx:invoices-updated";

export type Invoice = {
  id: string;
  recipient: string;   // issuer's Solana wallet (payer sends here via shielded pool)
  amount: string;      // human-readable e.g. "100.00"
  mint: string;        // token mint base58
  symbol: ShieldTokenId;
  memo?: string;
  createdAt: number;
  paidAt?: number;
  payerSignature?: string;
  claimLink: string;
};

export type ClaimPayload = {
  r: string;           // recipient Solana address
  a: string;           // amount string
  m: string;           // mint base58
  s: ShieldTokenId;    // symbol
  id: string;          // invoice id
  memo?: string;
};

function storageKey(cluster: SolanaCluster, wallet: string): string {
  return `${STORAGE_PREFIX}:${cluster}:${wallet}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function invoiceStorageEvent(): string {
  return STORAGE_EVENT;
}

export function loadInvoices(cluster: SolanaCluster, wallet: string): Invoice[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(cluster, wallet));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isInvoice);
  } catch {
    return [];
  }
}

function persist(cluster: SolanaCluster, wallet: string, invoices: Invoice[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(storageKey(cluster, wallet), JSON.stringify(invoices));
    window.dispatchEvent(
      new CustomEvent(STORAGE_EVENT, { detail: { cluster, wallet } }),
    );
  } catch {
    // ignore quota errors
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function encodeClaimPayload(payload: ClaimPayload): string {
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function decodeClaimPayload(token: string): ClaimPayload | null {
  try {
    const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(atob(base64)) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "r" in parsed &&
      "a" in parsed &&
      "m" in parsed &&
      "s" in parsed &&
      "id" in parsed
    ) {
      return parsed as ClaimPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function createInvoice(
  cluster: SolanaCluster,
  wallet: string,
  draft: { amount: string; mint: string; symbol: ShieldTokenId; memo?: string },
  baseUrl: string,
): Invoice {
  const id = newId();
  const payload: ClaimPayload = {
    r: wallet,
    a: draft.amount,
    m: draft.mint,
    s: draft.symbol,
    id,
    ...(draft.memo ? { memo: draft.memo } : {}),
  };
  const claimLink = `${baseUrl}/claim?v=${encodeClaimPayload(payload)}`;
  const invoice: Invoice = {
    id,
    recipient: wallet,
    amount: draft.amount,
    mint: draft.mint,
    symbol: draft.symbol,
    memo: draft.memo,
    createdAt: Date.now(),
    claimLink,
  };
  const next = [invoice, ...loadInvoices(cluster, wallet)];
  persist(cluster, wallet, next);
  return invoice;
}

export function markInvoicePaid(
  cluster: SolanaCluster,
  wallet: string,
  id: string,
  payerSignature: string,
): void {
  const current = loadInvoices(cluster, wallet);
  const next = current.map((inv) =>
    inv.id === id
      ? { ...inv, paidAt: Date.now(), payerSignature }
      : inv,
  );
  persist(cluster, wallet, next);
}

function isInvoice(v: unknown): v is Invoice {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.recipient === "string" &&
    typeof r.amount === "string" &&
    typeof r.mint === "string" &&
    typeof r.symbol === "string" &&
    typeof r.createdAt === "number" &&
    typeof r.claimLink === "string"
  );
}
