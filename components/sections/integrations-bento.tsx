"use client";

import {
  CalendarCheckIn01Icon,
  CheckmarkCircle01Icon,
  ClockIcon,
  DollarSendIcon,
  EyeIcon,
  FileSecurityIcon,
  KeyIcon,
  Link01Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";

import { Spotlight } from "@/components/ui/spotlight";
import { cn } from "@/lib/utils";

type Feature = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  icon: typeof DollarSendIcon;
  span?: "wide" | "tall";
  bullets?: string[];
  chips?: { value: string; label: string }[];
  accent?: boolean;
};

const FEATURES: Feature[] = [
  {
    id: "send",
    eyebrow: "Private transfer",
    title: "Send to any wallet, privately",
    body: "Route a single payment to any Solana address through the shielded pool. The chain records a transaction. The amount and recipient stay sealed.",
    icon: DollarSendIcon,
    span: "wide",
    chips: [
      { value: "SOL", label: "native" },
      { value: "USDC", label: "stablecoin" },
      { value: "USDT", label: "stablecoin" },
    ],
  },
  {
    id: "compliance",
    eyebrow: "Selective disclosure",
    title: "Scoped viewing keys for auditors",
    body: "Issue a viewing key tied to a specific date range and auditor. They get a structured compliance report — amounts, timestamps, counterparties. The public ledger sees nothing.",
    icon: KeyIcon,
    span: "tall",
    accent: true,
    bullets: [
      "Date-ranged scope per auditor",
      "Revoke any time, instantly",
      "Downloadable CSV ledger",
      "No ZK knowledge required",
    ],
  },
  {
    id: "payroll",
    eyebrow: "Batch disbursement",
    title: "Full-roster payroll in one transaction",
    body: "Drop a CSV with addresses, amounts, and tokens. Onyx fans the disbursement out through one shielded pool deposit — every recipient paid privately, one signature.",
    icon: UserMultipleIcon,
    chips: [
      { value: "1,000", label: "max recipients" },
      { value: "1 sig", label: "batch deposit" },
    ],
  },
  {
    id: "team",
    eyebrow: "Recurring payments",
    title: "Schedules that run themselves",
    body: "Save your contributors and set cadences — daily, weekly, biweekly, or monthly. Onyx surfaces who's due each cycle so nothing slips.",
    icon: CalendarCheckIn01Icon,
    bullets: [
      "Daily / weekly / biweekly / monthly",
      "Due alerts each cycle",
      "Run with one click",
    ],
  },
  {
    id: "invoice",
    eyebrow: "Invoice & claim links",
    title: "Contractors request payment without exposing their wallet",
    body: "A contractor generates a private invoice link with amount, token, and memo. The payer opens the link and pays through Onyx — the destination address is never visible on-chain.",
    icon: Link01Icon,
    span: "wide",
    accent: true,
    bullets: [
      "Stealth address per invoice",
      "QR-shareable claim links",
      "No Onyx account needed to claim",
    ],
  },
  {
    id: "ledger",
    eyebrow: "Private ledger",
    title: "Your full transaction history",
    body: "Every send, batch, and recurring payment in one filterable view. Search by recipient, date range, or source. Sync incoming payments with one click.",
    icon: ClockIcon,
  },
];

function Chip({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-1.5">
      <span className="font-mono text-[12px] font-medium text-primary">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-[13px] text-foreground/80">
      <HugeiconsIcon
        icon={CheckmarkCircle01Icon}
        size={14}
        strokeWidth={1.8}
        className="mt-0.5 shrink-0 text-primary"
      />
      <span>{children}</span>
    </div>
  );
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.4,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        feature.span === "wide" && "md:col-span-2",
        feature.span === "tall" && "md:row-span-2",
      )}
    >
      <Spotlight
        className={cn(
          "flex h-full flex-col rounded-2xl border bg-card/60 p-6 transition-colors duration-300",
          feature.accent
            ? "border-primary/25 hover:border-primary/45"
            : "border-border hover:border-primary/25",
        )}
      >
        {/* Subtle accent glow for highlighted features */}
        {feature.accent && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, color-mix(in oklch, var(--primary) 8%, transparent), transparent 70%)",
            }}
          />
        )}

        <div className="relative flex flex-1 flex-col">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl border",
                feature.accent
                  ? "border-primary/30 bg-primary/15 text-primary"
                  : "border-primary/20 bg-primary/10 text-primary",
              )}
            >
              <HugeiconsIcon icon={feature.icon} size={18} strokeWidth={1.6} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-primary/70">
                {feature.eyebrow}
              </p>
              <h3 className="mt-1 text-[15.5px] font-semibold leading-snug tracking-tight text-foreground">
                {feature.title}
              </h3>
            </div>
          </div>

          <p className="mt-4 text-[13.5px] leading-6 text-muted-foreground">
            {feature.body}
          </p>

          {feature.bullets && (
            <div className="mt-5 flex flex-col gap-2.5">
              {feature.bullets.map((b) => (
                <Bullet key={b}>{b}</Bullet>
              ))}
            </div>
          )}

          {feature.chips && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {feature.chips.map((c) => (
                <Chip key={c.value} value={c.value} label={c.label} />
              ))}
            </div>
          )}
        </div>
      </Spotlight>
    </motion.div>
  );
}

export function IntegrationsBento() {
  return (
    <section
      id="features"
      className="relative mx-auto w-full max-w-6xl px-6 py-24 sm:px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
        className="mb-12"
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
          What Onyx does
        </p>
        <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Every tool your finance team needs.{" "}
          <span className="text-muted-foreground">
            None of it on the public ledger.
          </span>
        </h2>
      </motion.div>

      {/*
        Layout (3 cols, desktop):
        [Private Send (2)]  [Compliance (1, tall rows 1-2)]
        [Payroll (1)] [Team (1)]  [Compliance cont.]
        [Invoice & Claims (2)]  [Ledger (1)]
      */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.id} feature={f} index={i} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground"
      >
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-1.5 rounded-full bg-primary" />
          Mainnet program
          <span className="font-mono text-foreground/70">zh1eLd6r…6qRkW</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-1.5 rounded-full bg-muted-foreground/60" />
          Groth16 proofs · browser-side
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-1.5 rounded-full bg-muted-foreground/60" />
          Fee: 0.005 SOL + 0.30%
        </span>
      </motion.div>
    </section>
  );
}
