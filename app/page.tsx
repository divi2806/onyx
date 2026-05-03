import {
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  MailSend01Icon,
  Plug01Icon,
  Upload01Icon,
  Key01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { Hero } from "@/components/sections/hero";
import { IntegrationsBento } from "@/components/sections/integrations-bento";
import { SiteFooter } from "@/components/sections/site-footer";
import { fancyButtonVariants } from "@/components/ui/fancy-button";

export default function Home() {
  return (
    <div className="dark relative isolate flex min-h-screen flex-col bg-background text-foreground">
      <Hero />
      <TrustStrip />
      <IntegrationsBento />
      <HowItWorks />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

function TrustStrip() {
  const stats: { label: string; value: string }[] = [
    { label: "ZK proof time", value: "~3s" },
    { label: "Merkle tree height", value: "32" },
    { label: "Public signals", value: "9" },
    { label: "Fixed fee per transfer", value: "0.005 SOL" },
    { label: "Variable fee", value: "0.30%" },
  ];
  return (
    <section className="relative border-y border-border bg-background">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 px-6 sm:grid-cols-5 sm:px-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-start gap-1 px-2 py-6 sm:px-4"
          >
            <span className="font-mono text-[20px] tracking-tight text-primary">
              {s.value}
            </span>
            <span className="text-[11.5px] uppercase tracking-[0.14em] text-muted-foreground">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps: {
    n: string;
    title: string;
    body: string;
    icon: typeof Plug01Icon;
  }[] = [
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
      title: "Execute the batch privately",
      icon: MailSend01Icon,
      body: "Each payment generates a Groth16 proof in your browser. The relay settles on Solana. The chain sees a transaction — your amounts stay sealed.",
    },
    {
      n: "04",
      title: "Disclose selectively when asked",
      icon: Key01Icon,
      body: "Issue a scoped viewing key to your auditor for a specific date range. They get a structured report. The public ledger sees nothing.",
    },
  ];

  return (
    <section
      id="how"
      className="relative mx-auto w-full max-w-6xl px-6 py-24 sm:px-8"
    >
      <div className="grid gap-16 lg:grid-cols-[1fr_1.4fr] lg:gap-24">
        {/* Left: sticky header */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
            Private from the first transaction.
          </h2>
          <p className="mt-4 text-[14.5px] leading-7 text-muted-foreground">
            No infrastructure to run. No circuits to compile. Connect your wallet and start moving money privately in minutes.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {[
              "Works with wallets you already use",
              "Proofs run fully in your browser",
              "Auditor access revocable at any time",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-[13.5px] text-foreground/80">
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={15}
                  strokeWidth={1.8}
                  className="shrink-0 text-primary"
                />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Right: vertical timeline */}
        <div className="flex flex-col">
          {steps.map((s, i) => (
            <div key={s.n} className="flex gap-5">
              {/* Step indicator + connector line */}
              <div className="flex flex-col items-center">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
                  <HugeiconsIcon
                    icon={s.icon}
                    size={16}
                    strokeWidth={1.8}
                    className="text-primary"
                  />
                </div>
                {i < steps.length - 1 && (
                  <div className="mt-2 w-px flex-1 bg-gradient-to-b from-border to-transparent" />
                )}
              </div>

              {/* Content */}
              <div className={i < steps.length - 1 ? "pb-10" : ""}>
                <div className="flex items-center gap-2.5 pt-1.5">
                  <span className="font-mono text-[10.5px] tracking-[0.18em] text-muted-foreground/60">
                    {s.n}
                  </span>
                  <h3 className="text-[15.5px] font-semibold tracking-tight text-foreground">
                    {s.title}
                  </h3>
                </div>
                <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>
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
    <section className="relative mx-auto w-full max-w-6xl px-6 pb-24 sm:px-8">
      <div className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/8 via-transparent to-transparent px-8 py-14 sm:px-14">
        <div className="grid gap-10 sm:grid-cols-[1.3fr_1fr] sm:items-start">
          <div>
            <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              Stop running payroll on a public database.
            </h2>
            <p className="mt-4 max-w-md text-[14.5px] leading-7 text-muted-foreground">
              Onyx is live on Solana mainnet. Connect your treasury wallet and run your first private disbursement in under two minutes.
            </p>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href="/payroll"
                className={fancyButtonVariants({ variant: "primary", size: "lg" })}
              >
                Launch app
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={15}
                  strokeWidth={2.2}
                />
              </Link>
            </div>
            <p className="mt-4 font-mono text-[11.5px] text-muted-foreground">
              zh1eLd6r…6qRkW · mainnet · audited Q1 2026
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/40 p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              What you get
            </p>
            {checks.map((c) => (
              <div key={c} className="flex items-start gap-2.5 text-[13.5px] text-foreground/85">
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={15}
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
