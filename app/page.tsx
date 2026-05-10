import {
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  ShieldKeyIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import type * as React from "react";

import { OnyxMark, SolanaLogo, UsdcLogo, UsdtLogo } from "@/components/logos";
import { ConnectButton } from "@/components/solana/connect-button";
import { fancyButtonVariants } from "@/components/ui/fancy-button";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Send", href: "/pay" },
  { label: "Payroll", href: "/payroll" },
  { label: "Treasury", href: "/treasury" },
  { label: "Audit Access", href: "/compliance" },
  { label: "Audit", href: "/audit" },
];

const FLOWS = [
  {
    label: "Deposit",
    value: "shield",
    meta: "proof generated in browser",
  },
  {
    label: "Withdraw",
    value: "payout",
    meta: "recipient ATA receives funds",
  },
  {
    label: "Disclose",
    value: "audit",
    meta: "date-scoped audit token",
  },
];

const FEATURES = [
  "Single private transfers for SOL, USDC, and USDT",
  "CSV payroll with per-recipient settlement tracking",
  "Recurring schedules for contributors and vendors",
  "Private SOL treasury rebalances into stablecoin outputs",
  "Scoped audit exports with auditor tokens",
  "Invoice links that route payment through the shield pool",
  "Local ledger for sent and scanned received payments",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex h-10 items-center gap-2 rounded-md px-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="grid size-6 place-items-center rounded-md border border-primary/25 bg-primary/10">
            <OnyxMark className="size-3.5" />
          </span>
          <span className="text-sm font-semibold">Onyx</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <ConnectButton />
      </header>

      <section className="border-y border-border/60">
        <div className="mx-auto grid min-h-[calc(100vh-57px)] max-w-6xl content-between gap-10 px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <span className="size-1.5 rounded-full bg-primary" />
                Confidential payments for Solana teams
              </div>
              <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-[1.03] tracking-normal text-foreground sm:text-6xl">
                Onyx
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Run payroll, vendor transfers, and invoice payments through a ZK shielded pool while keeping auditor-ready records under your control.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/payroll"
                  className={fancyButtonVariants({ variant: "primary", size: "xl" })}
                >
                  Launch workbench
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2.2} aria-hidden="true" />
                </Link>
                <Link
                  href="/audit"
                  className={fancyButtonVariants({ variant: "neutral", size: "xl" })}
                >
                  Open audit portal
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-card/30 p-4">
              <div className="flex items-center justify-between border-b border-border/55 pb-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Live flow</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">Shielded disbursement</p>
                </div>
                <span className="rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary">
                  0.30%
                </span>
              </div>
              <div className="mt-4 divide-y divide-border/50">
                {FLOWS.map((flow, index) => (
                  <div key={flow.label} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 py-3">
                    <span className="grid size-7 place-items-center rounded-md border border-primary/20 bg-primary/10 font-mono text-xs text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{flow.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{flow.meta}</p>
                    </div>
                    <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {flow.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <TokenChip label="SOL" Logo={SolanaLogo} />
                <TokenChip label="USDC" Logo={UsdcLogo} />
                <TokenChip label="USDT" Logo={UsdtLogo} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-4 border-t border-border/60 pt-6">
            {[
              ["2-phase", "deposit + withdraw"],
              ["1000", "CSV row ceiling"],
              ["local", "ledger storage"],
              ["date scoped", "audit tokens"],
            ].map(([value, label]) => (
              <div key={label} className="min-w-[9rem]">
                <p className="font-mono text-base font-semibold text-primary">{value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">What changes</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
            Private operations without a separate back office.
          </h2>
        </div>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div key={feature} className="flex gap-3 border-t border-border/55 pt-4">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm leading-6 text-foreground/85">{feature}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border/70">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
          <UseCase
            icon={UserMultipleIcon}
            title="Payroll"
            body="Upload a roster, review net payouts, and execute one token group at a time."
            href="/payroll"
          />
          <UseCase
            icon={ShieldKeyIcon}
            title="Audit Access"
            body="Create an audit access token for a date window and let auditors self-serve scoped reports."
            href="/compliance"
          />
          <UseCase
            icon={ArrowRight01Icon}
            title="Invoices"
            body="Create a claim link that asks payers to settle through the same shielded route."
            href="/invoice"
          />
        </div>
      </section>
    </main>
  );
}

function TokenChip({
  label,
  Logo,
}: {
  label: string;
  Logo: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex h-10 items-center justify-center gap-2 rounded-md border border-border/60 bg-background/30 text-sm font-medium">
      <Logo className="size-4" />
      {label}
    </div>
  );
}

function UseCase({
  icon,
  title,
  body,
  href,
}: {
  icon: typeof ArrowRight01Icon;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group rounded-lg border border-border/60 bg-card/30 p-5 transition-colors hover:border-primary/35 hover:bg-card/45",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <HugeiconsIcon icon={icon} size={20} strokeWidth={1.8} className="text-primary" aria-hidden="true" />
      <h3 className="mt-5 text-lg font-semibold tracking-normal text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
        Open module
        <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} aria-hidden="true" />
      </span>
    </Link>
  );
}
