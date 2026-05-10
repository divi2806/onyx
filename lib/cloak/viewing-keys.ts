import type { SolanaCluster } from "@/lib/solana/config";
import type {
  AuditRedactionMode,
  AuditRole,
} from "./audit-capability-types";

const STORAGE_PREFIX = "onyx:viewing-keys:v1";
const STORAGE_EVENT = "onyx:viewing-keys-updated";

export type ViewingKey = {
  id: string;
  auditor: string;
  dateFrom: string;
  dateTo: string;
  nkHex: string;
  wallet: string;
  createdAt: number;
  revoked: boolean;
  token?: string;
  tokenId?: string;
  role?: AuditRole;
  redaction?: AuditRedactionMode;
  expiresAt?: number;
};

export type SharableToken = {
  nk: string;
  from: string;
  to: string;
  wallet: string;
};

function storageKey(cluster: SolanaCluster, wallet: string): string {
  return `${STORAGE_PREFIX}:${cluster}:${wallet}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function viewingKeysStorageEvent(): string {
  return STORAGE_EVENT;
}

export function loadViewingKeys(cluster: SolanaCluster, wallet: string): ViewingKey[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(cluster, wallet));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isViewingKey);
  } catch {
    return [];
  }
}

function persist(cluster: SolanaCluster, wallet: string, keys: ViewingKey[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(storageKey(cluster, wallet), JSON.stringify(keys));
    window.dispatchEvent(
      new CustomEvent(STORAGE_EVENT, { detail: { cluster, wallet } }),
    );
  } catch {
    // ignore quota errors
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `vk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function addViewingKey(
  cluster: SolanaCluster,
  wallet: string,
  draft: Pick<ViewingKey, "auditor" | "dateFrom" | "dateTo" | "nkHex"> &
    Partial<Pick<ViewingKey, "token" | "tokenId" | "role" | "redaction" | "expiresAt">>,
): ViewingKey {
  const vk: ViewingKey = {
    id: newId(),
    ...draft,
    wallet,
    createdAt: Date.now(),
    revoked: false,
  };
  const next = [vk, ...loadViewingKeys(cluster, wallet)];
  persist(cluster, wallet, next);
  return vk;
}

export function revokeViewingKey(cluster: SolanaCluster, wallet: string, id: string): void {
  const current = loadViewingKeys(cluster, wallet);
  const next = current.map((k) => (k.id === id ? { ...k, revoked: true } : k));
  persist(cluster, wallet, next);
}

/** Encodes a ViewingKey into a compact base64 token to share with the auditor. */
export function encodeViewingKeyToken(vk: ViewingKey): string {
  if (vk.token) return vk.token;
  const payload: SharableToken = {
    nk: vk.nkHex,
    from: vk.dateFrom,
    to: vk.dateTo,
    wallet: vk.wallet,
  };
  return btoa(JSON.stringify(payload));
}

/** Decodes a base64 token produced by encodeViewingKeyToken. Returns null if malformed. */
export function decodeViewingKeyToken(token: string): SharableToken | null {
  try {
    const payload = JSON.parse(atob(token)) as unknown;
    if (
      payload &&
      typeof payload === "object" &&
      "nk" in payload &&
      "from" in payload &&
      "to" in payload &&
      "wallet" in payload &&
      typeof (payload as Record<string, unknown>).nk === "string" &&
      typeof (payload as Record<string, unknown>).from === "string" &&
      typeof (payload as Record<string, unknown>).to === "string" &&
      typeof (payload as Record<string, unknown>).wallet === "string"
    ) {
      return payload as SharableToken;
    }
    return null;
  } catch {
    return null;
  }
}

function isViewingKey(v: unknown): v is ViewingKey {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.auditor === "string" &&
    typeof r.dateFrom === "string" &&
    typeof r.dateTo === "string" &&
    typeof r.nkHex === "string" &&
    typeof r.wallet === "string" &&
    typeof r.createdAt === "number" &&
    typeof r.revoked === "boolean" &&
    (r.token === undefined || typeof r.token === "string") &&
    (r.tokenId === undefined || typeof r.tokenId === "string") &&
    (r.role === undefined || typeof r.role === "string") &&
    (r.redaction === undefined || typeof r.redaction === "string") &&
    (r.expiresAt === undefined || typeof r.expiresAt === "number")
  );
}
