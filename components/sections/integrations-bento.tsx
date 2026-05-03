"use client";

import {
  CalendarCheckIn01Icon,
  ClockIcon,
  DollarSendIcon,
  KeyIcon,
  Link01Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import * as React from "react";

import { cn } from "@/lib/utils";

/* ─── motion variants ─────────────────────────────────────────────── */

const cardLift = {
  rest: { y: 0, scale: 1 },
  hover: {
    y: -8,
    scale: 1.02,
    transition: { type: "spring" as const, stiffness: 400, damping: 25 },
  },
};

const glowIn = {
  rest: { opacity: 0 },
  hover: { opacity: 1, transition: { duration: 0.3 } },
};

const iconPop = {
  rest: { scale: 1, rotate: 0 },
  hover: {
    scale: 1.15,
    rotate: -6,
    transition: { type: "spring" as const, stiffness: 500, damping: 20 },
  },
};

/* ─── micro widgets ───────────────────────────────────────────────── */

function TxRows() {
  const rows = [
    { addr: "7xK2…mR4p", label: "████ USDC", color: "bg-[#2775ca]" },
    { addr: "9nP5…wQ8r", label: "██ SOL", color: "bg-[#14F195]" },
    { addr: "3bF1…kL6s", label: "██████ USDT", color: "bg-[#26A17B]" },
  ];
  return (
    <div className="mt-auto space-y-2 pt-6">
      {rows.map((tx, i) => (
        <motion.div
          key={i}
          whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.06)" }}
          className="flex cursor-default items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-3.5 py-2.5 backdrop-blur-sm transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className={cn("size-2 rounded-full shadow-[0_0_8px_currentColor]", tx.color)} style={{ color: tx.color ? undefined : "currentColor" }} />
            <span className="font-mono text-[11px] font-medium text-white/40">{tx.addr}</span>
          </div>
          <span className="font-mono text-[11px] text-white/20 blur-[2px] select-none">{tx.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function PayrollWidget() {
  const bars = [0.45, 0.7, 0.52, 0.88, 0.63, 1.0, 0.72, 0.84, 0.58, 0.79, 0.66, 0.93];
  return (
    <div className="mt-auto pt-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Recipients</span>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-medium text-primary shadow-[inset_0_0_0_1px_oklch(0.68_0.24_285/0.2)]">847 / 1,000</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.04] shadow-inner">
        <motion.div
          initial={{ width: "0%" }}
          whileInView={{ width: "84.7%" }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: "circOut", delay: 0.2 }}
          className="relative h-full rounded-full bg-gradient-to-r from-primary/60 via-primary to-primary/80 shadow-[0_0_12px_oklch(0.68_0.24_285/0.8)]"
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] mix-blend-overlay" />
        </motion.div>
      </div>
      <div className="mt-4 flex h-10 items-end gap-[3px]">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.03, ease: "backOut" }}
            className="flex-1 rounded-[2px] bg-gradient-to-t from-white/[0.02] to-white/[0.08]"
            style={{ height: `${h * 100}%`, transformOrigin: "bottom" }}
          />
        ))}
      </div>
    </div>
  );
}

function ComplianceWidget() {
  return (
    <div className="mt-auto pt-6">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] p-4 backdrop-blur-md">
        <div className="absolute -right-4 -top-4 size-24 rounded-full bg-primary/20 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Viewing key</span>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_4px_currentColor]" />
            Active
          </span>
        </div>
        <div className="relative mt-3 rounded-lg border border-primary/10 bg-black/20 p-2.5 font-mono text-[11px] text-primary/70 shadow-inner">
          vk_7xK2…mR4p
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px] font-medium text-primary/40">
          <HugeiconsIcon icon={CalendarCheckIn01Icon} size={12} />
          Jan 1 → Mar 31, 2026
        </div>
      </div>
    </div>
  );
}

function LedgerMini() {
  const heights = [0.3, 0.7, 0.5, 0.9, 0.4, 0.8, 0.6, 1.0, 0.55, 0.75];
  return (
    <div className="mt-4 flex h-8 items-end gap-[4px]">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.1 + i * 0.04, ease: "easeOut" }}
          className="flex-1 rounded-sm bg-gradient-to-t from-white/[0.03] to-white/[0.12]"
          style={{ height: `${h * 100}%`, transformOrigin: "bottom" }}
        />
      ))}
    </div>
  );
}

/* ─── primary card ────────────────────────────────────────────────── */

type PrimaryDef = {
  eyebrow: string;
  title: string;
  body: string;
  icon: typeof DollarSendIcon;
  stat: { value: string; label: string };
  tags: string[];
  accent?: boolean;
  widget: React.ReactNode;
};

const PRIMARY: PrimaryDef[] = [
  {
    eyebrow: "01 · Send",
    title: "Any wallet.\nPrivately.",
    body: "Route SOL, USDC, or USDT through the shielded pool. Amount, sender, and recipient stay off the public record.",
    icon: DollarSendIcon,
    stat: { value: "~3s", label: "proof time" },
    tags: ["SOL", "USDC", "USDT"],
    widget: <TxRows />,
  },
  {
    eyebrow: "02 · Payroll",
    title: "Full roster.\nOne signature.",
    body: "Upload a CSV. Onyx fans every payment through a single shielded deposit — up to 1,000 recipients, zero salary data on-chain.",
    icon: UserMultipleIcon,
    stat: { value: "1,000", label: "recipients" },
    tags: ["CSV upload", "Batch"],
    widget: <PayrollWidget />,
  },
  {
    eyebrow: "03 · Compliance",
    title: "Auditors see\nwhat you choose.",
    body: "Issue a scoped viewing key tied to a date range. Your auditor gets a structured CSV report. The public ledger sees nothing.",
    icon: KeyIcon,
    stat: { value: "0", label: "on-chain leaks" },
    tags: ["Scoped keys", "Revocable"],
    accent: true,
    widget: <ComplianceWidget />,
  },
];

function PrimaryCard({ item, index }: { item: PrimaryDef; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        variants={cardLift}
        initial="rest"
        whileHover="hover"
        className={cn(
          "group relative flex h-full min-h-[380px] flex-col overflow-hidden rounded-[2rem] border p-7 shadow-2xl backdrop-blur-xl",
          item.accent
            ? "border-primary/30 bg-gradient-to-b from-primary/[0.08] to-primary/[0.02] shadow-primary/5"
            : "border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent shadow-black/50",
        )}
      >
        {/* Hover glow overlay */}
        <motion.div
          variants={glowIn}
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[2rem]",
            item.accent
              ? "bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,oklch(0.68_0.24_285/0.18),transparent)]"
              : "bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(255,255,255,0.06),transparent)]",
          )}
        />

        {/* Hover border shimmer */}
        <motion.div
          variants={glowIn}
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[2rem]",
            item.accent
              ? "shadow-[inset_0_0_0_1px_oklch(0.68_0.24_285/0.4)]"
              : "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]",
          )}
        />

        {/* Static accent glow */}
        {item.accent && (
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 left-1/2 h-40 w-60 -translate-x-1/2 rounded-full bg-primary/20 blur-[50px] transition-opacity duration-500 group-hover:opacity-100"
          />
        )}

        {/* Top: icon + stat */}
        <div className="relative flex items-start justify-between gap-4">
          <motion.div
            variants={iconPop}
            className={cn(
              "grid size-12 shrink-0 place-items-center rounded-2xl border shadow-sm backdrop-blur-md",
              item.accent
                ? "border-primary/30 bg-gradient-to-br from-primary/[0.15] to-primary/[0.05] shadow-primary/10"
                : "border-white/[0.1] bg-gradient-to-br from-white/[0.08] to-white/[0.02]",
            )}
          >
            <HugeiconsIcon
              icon={item.icon}
              size={20}
              strokeWidth={1.8}
              className={item.accent ? "text-primary drop-shadow-[0_0_8px_currentColor]" : "text-white/70"}
            />
          </motion.div>

          <div className="flex flex-col items-end">
            <span
              className={cn(
                "font-mono text-3xl font-black leading-none tracking-tight transition-colors duration-300",
                item.accent
                  ? "text-primary drop-shadow-sm"
                  : "text-white/80 group-hover:text-white",
              )}
            >
              {item.stat.value}
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              {item.stat.label}
            </span>
          </div>
        </div>

        {/* Text */}
        <div className="relative mt-8">
          <p
            className={cn(
              "text-[11px] font-bold uppercase tracking-[0.22em]",
              item.accent ? "text-primary/70" : "text-white/40",
            )}
          >
            {item.eyebrow}
          </p>
          <h3 className="mt-2.5 whitespace-pre-line text-2xl font-black leading-[1.1] tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
            {item.title}
          </h3>
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/40 font-medium">{item.body}</p>
        </div>

        {/* Widget */}
        {item.widget}

        {/* Tags */}
        <div className="relative mt-6 flex flex-wrap gap-2">
          {item.tags.map((t) => (
            <span
              key={t}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-semibold transition-all duration-300",
                item.accent
                  ? "border-primary/30 bg-primary/[0.1] text-primary/80 hover:bg-primary/[0.15] group-hover:border-primary/50"
                  : "border-white/[0.1] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] group-hover:border-white/[0.2] group-hover:text-white/70",
              )}
            >
              {t}
            </span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── secondary card ──────────────────────────────────────────────── */

type SecondaryDef = {
  eyebrow: string;
  title: string;
  icon: typeof DollarSendIcon;
  tags: string[];
  widget?: React.ReactNode;
};

const SECONDARY: SecondaryDef[] = [
  {
    eyebrow: "04 · Recurring",
    title: "Set schedules that run themselves.",
    icon: CalendarCheckIn01Icon,
    tags: ["Daily", "Weekly", "Monthly"],
  },
  {
    eyebrow: "05 · Invoice",
    title: "Request payment. No address exposed.",
    icon: Link01Icon,
    tags: ["Claim links", "QR ready"],
  },
  {
    eyebrow: "06 · Ledger",
    title: "Every transaction. Only yours.",
    icon: ClockIcon,
    tags: ["Private", "Filterable"],
    widget: <LedgerMini />,
  },
];

function SecondaryCard({ item, index }: { item: SecondaryDef; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.5, delay: 0.3 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        variants={cardLift}
        initial="rest"
        whileHover="hover"
        className="group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-6 shadow-xl backdrop-blur-lg"
      >
        {/* Hover glow */}
        <motion.div
          variants={glowIn}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[1.5rem] bg-[radial-gradient(ellipse_80%_80%_at_50%_0%,rgba(255,255,255,0.04),transparent)]"
        />
        <motion.div
          variants={glowIn}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[1.5rem] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
        />

        <div className="relative flex flex-col flex-1 gap-5">
          <div className="flex items-start gap-4">
            <motion.div
              variants={iconPop}
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/[0.1] bg-gradient-to-br from-white/[0.08] to-white/[0.02] shadow-sm"
            >
              <HugeiconsIcon
                icon={item.icon}
                size={18}
                strokeWidth={1.8}
                className="text-white/50 transition-colors duration-300 group-hover:text-white/80"
              />
            </motion.div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                {item.eyebrow}
              </p>
              <h3 className="mt-1.5 text-[15px] font-bold leading-snug tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white/90 to-white/50 transition-all duration-300 group-hover:from-white group-hover:to-white/70">
                {item.title}
              </h3>
            </div>
          </div>
          
          <div className="mt-auto">
            {item.widget}
            
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10.5px] font-medium text-white/40 transition-colors duration-300 hover:bg-white/[0.06] group-hover:border-white/[0.15] group-hover:text-white/60"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── section ─────────────────────────────────────────────────────── */

export function IntegrationsBento() {
  return (
    <section id="features" className="relative w-full py-32 overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(255,255,255,0.01),transparent)] pointer-events-none" />
      
      <div className="relative mx-auto max-w-[85rem] px-6 sm:px-10 lg:px-12">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary shadow-sm backdrop-blur-md">
              <span className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_currentColor]" />
              What Onyx does
            </p>
            <h2 className="mt-6 text-[42px] font-black leading-[1.05] tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40 sm:text-[54px]">
              Everything private.<br className="hidden sm:block" />
              <span className="text-white/20"> Nothing leaked.</span>
            </h2>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 backdrop-blur-sm lg:text-right">
            <p className="text-[14px] font-medium leading-relaxed text-white/50">
              One shielded pool. Groth16 proofs<br className="hidden sm:block" /> in your browser.
            </p>
            <p className="text-[12px] font-bold text-primary/80">
              0.005 SOL + 0.30% per transfer.
            </p>
          </div>
        </motion.div>

        {/* Primary grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PRIMARY.map((item, i) => (
            <PrimaryCard key={item.eyebrow} item={item} index={i} />
          ))}
        </div>

        {/* Secondary grid */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SECONDARY.map((item, i) => (
            <SecondaryCard key={item.eyebrow} item={item} index={i} />
          ))}
        </div>

        {/* Footer strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 rounded-3xl border border-white/[0.05] bg-white/[0.01] py-5 px-8 text-[12px] font-semibold text-white/30 backdrop-blur-md"
        >
          <span className="flex items-center gap-2.5 text-white/50">
            <span className="size-2 rounded-full bg-primary shadow-[0_0_8px_oklch(0.68_0.24_285/0.8)]" />
            Mainnet · zh1eLd6r…6qRkW
          </span>
          <div className="hidden size-1 rounded-full bg-white/10 sm:block" />
          <span>Groth16 proofs · browser-side</span>
          <div className="hidden size-1 rounded-full bg-white/10 sm:block" />
          <span>No backend, no custody</span>
        </motion.div>
      </div>
    </section>
  );
}

