import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import type { ComplianceReport } from "@cloak.dev/sdk";

import {
  AUDIT_TOKEN_PREFIX,
  type AuditAccessLog,
  type AuditCapabilityPublic,
  type AuditCapabilityScope,
  type AuditRedactionMode,
  type AuditRole,
  type AuditSentEntry,
} from "@/lib/cloak/audit-capability-types";
import type { SolanaCluster } from "@/lib/solana/config";

type AuditCapabilityPayload = {
  version: 2;
  tokenId: string;
  auditor: string;
  wallet: string;
  issuer: string;
  cluster: SolanaCluster;
  nkHex: string;
  role: AuditRole;
  redaction: AuditRedactionMode;
  scope: AuditCapabilityScope;
  issuedAt: number;
  expiresAt: number;
  sent?: AuditSentEntry[];
};

type TokenEnvelope = {
  iv: string;
  data: string;
};

type IssueAuditTokenInput = {
  auditor: string;
  wallet: string;
  issuer: string;
  cluster: SolanaCluster;
  nkHex: string;
  role: AuditRole;
  redaction: AuditRedactionMode;
  dateFrom: string;
  dateTo: string;
  expiresAt: number;
  sent?: AuditSentEntry[];
};

type AuditStore = {
  revoked: Set<string>;
  logs: AuditAccessLog[];
};

const globalForAudit = globalThis as typeof globalThis & {
  __ONYX_AUDIT_STORE__?: AuditStore;
};

function store(): AuditStore {
  if (!globalForAudit.__ONYX_AUDIT_STORE__) {
    globalForAudit.__ONYX_AUDIT_STORE__ = {
      revoked: new Set<string>(),
      logs: [],
    };
  }
  return globalForAudit.__ONYX_AUDIT_STORE__;
}

export function issueAuditToken(input: IssueAuditTokenInput): {
  token: string;
  capability: AuditCapabilityPublic;
} {
  const issuedAt = Date.now();
  const afterTimestamp = Date.parse(input.dateFrom);
  const beforeTimestamp = Date.parse(input.dateTo) + 86_400_000 - 1;
  if (!Number.isFinite(afterTimestamp) || !Number.isFinite(beforeTimestamp)) {
    throw new Error("Invalid audit date scope.");
  }
  if (beforeTimestamp < afterTimestamp) {
    throw new Error("Audit end date must be after start date.");
  }
  if (input.expiresAt <= issuedAt) {
    throw new Error("Audit token expiry must be in the future.");
  }

  const payload: AuditCapabilityPayload = {
    version: 2,
    tokenId: newId(),
    auditor: input.auditor,
    wallet: input.wallet,
    issuer: input.issuer,
    cluster: input.cluster,
    nkHex: input.nkHex,
    role: input.role,
    redaction: input.redaction,
    scope: {
      from: input.dateFrom,
      to: input.dateTo,
      afterTimestamp,
      beforeTimestamp,
    },
    issuedAt,
    expiresAt: input.expiresAt,
    sent: sanitizeSentEntries(input.sent, afterTimestamp, beforeTimestamp),
  };

  const token = encryptPayload(payload);
  return { token, capability: toPublicCapability(payload) };
}

export function inspectAuditToken(token: string): AuditCapabilityPublic {
  const payload = decryptToken(token);
  return toPublicCapability(payload);
}

export function resolveAuditTokenForScan(token: string): AuditCapabilityPayload {
  const payload = decryptToken(token);
  if (store().revoked.has(payload.tokenId)) {
    throw new Error("Audit token has been revoked.");
  }
  if (payload.expiresAt <= Date.now()) {
    throw new Error("Audit token has expired.");
  }
  return payload;
}

export function revokeAuditToken(tokenId: string): void {
  store().revoked.add(tokenId);
}

export function appendAuditLog(
  payload: Pick<
    AuditCapabilityPayload,
    "tokenId" | "wallet" | "auditor" | "role" | "redaction"
  >,
  entry: Omit<AuditAccessLog, "id" | "at" | "tokenId" | "wallet" | "auditor" | "role" | "redaction">,
): AuditAccessLog {
  const log: AuditAccessLog = {
    id: newId(),
    tokenId: payload.tokenId,
    wallet: payload.wallet,
    auditor: payload.auditor,
    role: payload.role,
    redaction: payload.redaction,
    at: Date.now(),
    ...entry,
  };
  const s = store();
  s.logs = [log, ...s.logs].slice(0, 200);
  return log;
}

export function listAuditLogs(wallet?: string): AuditAccessLog[] {
  const logs = store().logs;
  return wallet ? logs.filter((log) => log.wallet === wallet) : logs;
}

export function redactComplianceReport(
  report: ComplianceReport,
  mode: AuditRedactionMode,
): ComplianceReport {
  if (mode === "full") return report;
  if (mode === "summary") {
    return {
      ...report,
      transactions: [],
    };
  }
  return {
    ...report,
    transactions: report.transactions.map((tx) => ({
      ...tx,
      recipient: "[redacted]",
      signature: tx.signature ? `${tx.signature.slice(0, 8)}...redacted` : tx.signature,
      commitment: tx.commitment ? `${tx.commitment.slice(0, 8)}...redacted` : tx.commitment,
    })),
  };
}

export function mergeSentEntriesIntoReport(
  report: ComplianceReport,
  sent: AuditSentEntry[] | undefined,
): ComplianceReport {
  if (!sent?.length) return report;

  const sentDepositSigs = new Set(sent.map((entry) => entry.depositSignature));
  const dedupedScanRows = report.transactions.filter(
    (tx) =>
      !(
        tx.txType === "deposit" &&
        tx.signature &&
        sentDepositSigs.has(tx.signature)
      ),
  );
  const seen = new Set<string>();
  for (const tx of dedupedScanRows) {
    const key = tx.signature ?? tx.commitment;
    if (key) seen.add(key);
  }

  const sentRows = sent
    .map(sentEntryToTransaction)
    .filter((tx) => {
      const key = tx.signature ?? tx.commitment;
      return key ? !seen.has(key) : true;
    });

  const transactions = [...sentRows, ...dedupedScanRows].sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalFees = 0;
  for (const tx of transactions) {
    if (tx.txType === "deposit") {
      totalDeposits += tx.amount;
    } else {
      totalWithdrawals += tx.amount;
      totalFees += tx.fee;
    }
  }

  return {
    ...report,
    transactions,
    summary: {
      ...report.summary,
      totalDeposits,
      totalWithdrawals,
      totalFees,
      netChange: totalDeposits - totalWithdrawals,
      transactionCount: transactions.length,
      finalBalance: totalDeposits - totalWithdrawals,
    },
  };
}

function toPublicCapability(payload: AuditCapabilityPayload): AuditCapabilityPublic {
  return {
    tokenId: payload.tokenId,
    auditor: payload.auditor,
    wallet: payload.wallet,
    issuer: payload.issuer,
    cluster: payload.cluster,
    role: payload.role,
    redaction: payload.redaction,
    scope: payload.scope,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    revoked: store().revoked.has(payload.tokenId),
    expired: payload.expiresAt <= Date.now(),
  };
}

function encryptPayload(payload: AuditCapabilityPayload): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const envelope: TokenEnvelope = {
    iv: base64UrlEncode(iv),
    data: base64UrlEncode(Buffer.concat([ciphertext, tag])),
  };
  return `${AUDIT_TOKEN_PREFIX}${base64UrlEncode(JSON.stringify(envelope))}`;
}

function decryptToken(token: string): AuditCapabilityPayload {
  if (!token.startsWith(AUDIT_TOKEN_PREFIX)) {
    throw new Error("Unsupported audit token format.");
  }
  const envelope = JSON.parse(
    base64UrlDecode(token.slice(AUDIT_TOKEN_PREFIX.length)).toString("utf8"),
  ) as TokenEnvelope;
  const iv = base64UrlDecode(envelope.iv);
  const sealed = base64UrlDecode(envelope.data);
  const ciphertext = sealed.subarray(0, sealed.length - 16);
  const tag = sealed.subarray(sealed.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", tokenKey(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
  const payload = JSON.parse(plaintext) as AuditCapabilityPayload;
  if (!isPayload(payload)) throw new Error("Malformed audit token payload.");
  return payload;
}

function sanitizeSentEntries(
  entries: AuditSentEntry[] | undefined,
  afterTimestamp: number,
  beforeTimestamp: number,
): AuditSentEntry[] | undefined {
  const valid = entries
    ?.filter(isAuditSentEntry)
    .filter((entry) => entry.timestamp >= afterTimestamp && entry.timestamp <= beforeTimestamp)
    .slice(0, 100);
  return valid?.length ? valid : undefined;
}

function sentEntryToTransaction(entry: AuditSentEntry): ComplianceReport["transactions"][number] {
  const amount = rawToNumber(entry.amountRaw);
  const netAmount = rawToNumber(entry.netRaw);
  return {
    txType: entry.source === "payroll" ? "payroll" : "withdraw",
    amount,
    fee: Math.max(0, amount - netAmount),
    netAmount,
    runningBalance: 0,
    timestamp: entry.timestamp,
    recipient: entry.recipient,
    commitment: `sent-${entry.id}`,
    signature: entry.withdrawSignature,
    mint: entry.mint,
    decimals: entry.decimals,
    symbol: entry.symbol,
  };
}

function rawToNumber(raw: string): number {
  try {
    return Number(BigInt(raw));
  } catch {
    return 0;
  }
}

function tokenKey(): Buffer {
  const secret =
    process.env.ONYX_AUDIT_TOKEN_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "onyx-development-audit-token-secret";
  return createHash("sha256").update(secret).digest();
}

function base64UrlEncode(input: Buffer | string): string {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

function newId(): string {
  return randomBytes(16).toString("hex");
}

function isPayload(value: AuditCapabilityPayload): boolean {
  return (
    value?.version === 2 &&
    typeof value.tokenId === "string" &&
    typeof value.auditor === "string" &&
    typeof value.wallet === "string" &&
    typeof value.issuer === "string" &&
    typeof value.cluster === "string" &&
    typeof value.nkHex === "string" &&
    value.nkHex.length === 64 &&
    typeof value.scope?.afterTimestamp === "number" &&
    typeof value.scope?.beforeTimestamp === "number" &&
    typeof value.expiresAt === "number" &&
    (value.sent === undefined ||
      (Array.isArray(value.sent) && value.sent.every(isAuditSentEntry)))
  );
}

function isAuditSentEntry(value: unknown): value is AuditSentEntry {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.recipient === "string" &&
    typeof r.mint === "string" &&
    typeof r.symbol === "string" &&
    typeof r.decimals === "number" &&
    typeof r.amountRaw === "string" &&
    typeof r.netRaw === "string" &&
    typeof r.depositSignature === "string" &&
    typeof r.withdrawSignature === "string" &&
    typeof r.timestamp === "number" &&
    (r.source === undefined ||
      r.source === "pay" ||
      r.source === "payroll" ||
      r.source === "recurring")
  );
}
