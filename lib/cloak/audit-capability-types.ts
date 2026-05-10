import type { SolanaCluster } from "@/lib/solana/config";

export const AUDIT_TOKEN_PREFIX = "onyx_audit_v2.";

export type AuditRole =
  | "external-auditor"
  | "internal-finance"
  | "regulator"
  | "tax-reviewer";

export type AuditRedactionMode = "full" | "financial" | "summary";

export type AuditCapabilityScope = {
  from: string;
  to: string;
  afterTimestamp: number;
  beforeTimestamp: number;
};

export type AuditCapabilityPublic = {
  tokenId: string;
  auditor: string;
  wallet: string;
  issuer: string;
  cluster: SolanaCluster;
  role: AuditRole;
  redaction: AuditRedactionMode;
  scope: AuditCapabilityScope;
  issuedAt: number;
  expiresAt: number;
  revoked: boolean;
  expired: boolean;
};

export type AuditAccessLog = {
  id: string;
  tokenId: string;
  wallet: string;
  auditor: string;
  role: AuditRole;
  redaction: AuditRedactionMode;
  action: "inspect" | "scan" | "revoke";
  result: "allowed" | "denied";
  reason?: string;
  at: number;
  ip?: string;
  userAgent?: string;
};

export const AUDIT_ROLES: { id: AuditRole; label: string }[] = [
  { id: "external-auditor", label: "External auditor" },
  { id: "internal-finance", label: "Internal finance" },
  { id: "regulator", label: "Regulator" },
  { id: "tax-reviewer", label: "Tax reviewer" },
];

export const AUDIT_REDACTION_MODES: {
  id: AuditRedactionMode;
  label: string;
  description: string;
}[] = [
  {
    id: "full",
    label: "Full report",
    description: "Amounts, dates, recipients, signatures, and CSV rows.",
  },
  {
    id: "financial",
    label: "Financial only",
    description: "Amounts and dates stay visible; counterparties are redacted.",
  },
  {
    id: "summary",
    label: "Summary only",
    description: "Totals only; row-level transaction history is hidden.",
  },
];
