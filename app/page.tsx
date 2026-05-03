import {
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Key01Icon,
  MailSend01Icon,
  Plug01Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { Hero } from "@/components/sections/hero";
import { IntegrationsBento } from "@/components/sections/integrations-bento";
import { fancyButtonVariants } from "@/components/ui/fancy-button";

export default function Home() {
  return (
    <div className="dark relative isolate flex min-h-screen flex-col bg-background text-foreground">
      <Hero />
      <IntegrationsBento />
      <HowItWorks />
      <FinalCta />
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Link your treasury wallet",
      icon: Plug01Icon,
      body: "Phantom, Solflare, Backpack — any Solana wallet. No new keys, no separate install. Connect and you're ready.",
    },
    {
      n: "02",
      title: "Define your recipients",
      icon: Upload01Icon,
      body: "Add addresses and amounts manually, or drop a CSV roster. Save it once and reuse every cycle without re-uploading.",
    },
    {
      n: "03",
      title: "Execute privately",
      icon: MailSend01Icon,
      body: "Each payment generates a Groth16 proof in your browser. The relay settles on Solana — no amounts, no counterparties on-chain.",
    },
    {
      n: "04",
      title: "Disclose selectively",
      icon: Key01Icon,
      body: "Issue a scoped viewing key to your auditor for a specific date range. They get a structured report. The public ledger sees nothing.",
    },
  ];

  return (
    <section id="how" className="relative mx-auto w-full max-w-[85rem] px-6 py-32 sm:px-10 lg:px-12">
      <div className="mb-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary shadow-sm backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_currentColor]" />
          How it works
        </p>
        <h2 className="mt-6 max-w-lg text-[42px] font-black leading-[1.05] tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40 sm:text-[54px]">
          Private from the
          <br />
          <span className="text-white/20">first transaction.</span>
        </h2>
      </div>

      {/* Grid of bento cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <div
            key={s.n}
            className="group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-6 shadow-xl backdrop-blur-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/5"
          >
            {/* Hover glow overlay */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(ellipse_80%_80%_at_50%_0%,rgba(255,255,255,0.04),transparent)]"
            />
            
            {/* Step circle */}
            <div className="relative mb-8 flex items-start justify-between">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/[0.1] bg-gradient-to-br from-white/[0.08] to-white/[0.02] shadow-sm backdrop-blur-md transition-colors duration-500 group-hover:border-primary/30 group-hover:bg-primary/[0.1]">
                <HugeiconsIcon icon={s.icon} size={20} strokeWidth={1.8} className="text-white/50 transition-colors duration-500 group-hover:text-primary drop-shadow-sm" />
              </div>
              <span className="font-mono text-4xl font-black text-white/5 transition-colors duration-500 group-hover:text-white/10 select-none">
                {s.n}
              </span>
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <h3 className="text-lg font-bold leading-snug tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white/90 to-white/50 transition-all duration-300 group-hover:from-white group-hover:to-white/70">
                {s.title}
              </h3>
              <p className="text-[13.5px] leading-relaxed text-white/40 font-medium">
                {s.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom checks */}
      <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 rounded-3xl border border-white/[0.05] bg-white/[0.01] py-6 px-8 backdrop-blur-md">
        {[
          "Works with wallets you already use",
          "Proofs run fully in your browser",
          "Auditor access revocable at any time",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2.5 text-[13px] font-semibold text-white/50">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} strokeWidth={2} className="shrink-0 text-primary drop-shadow-[0_0_6px_oklch(0.68_0.24_285/0.8)]" />
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  const checks = [
    "Private by default, auditable on demand",
    "No new wallet or infrastructure required",
    "SOL, USDC, and USDT supported",
    "Scoped viewing keys for auditors",
    "ZK proofs generated in your browser",
  ];

  return (
    <section className="relative mx-auto w-full max-w-7xl px-6 pb-28 sm:px-10">
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/60 to-card/30 px-8 py-16 sm:px-14">
        {/* Background radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-primary/15 blur-3xl"
        />
        <div className="relative grid gap-12 sm:grid-cols-[1.2fr_1fr] sm:items-start">
          <div>
            <h2 className="max-w-xl text-[32px] font-black leading-[1.06] tracking-[-0.03em] text-foreground sm:text-[40px]">
              Stop running payroll on a public database.
            </h2>
            <p className="mt-4 max-w-md text-[14.5px] leading-7 text-muted-foreground">
              Onyx is live on Solana mainnet. Connect your treasury wallet and run your first private disbursement in under two minutes.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/payroll"
                className={fancyButtonVariants({ variant: "primary", size: "lg" })}
              >
                Launch app
                <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={2.2} />
              </Link>
            </div>
            <p className="mt-4 font-mono text-[11.5px] text-muted-foreground/60">
              zh1eLd6r…6qRkW · mainnet · audited Q1 2026
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-background/40 p-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
              What you get
            </p>
            {checks.map((c) => (
              <div key={c} className="flex items-start gap-2.5 text-[13px] text-foreground/80">
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={14}
                  strokeWidth={1.8}
                  className="mt-0.5 shrink-0 text-primary"
                />
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
