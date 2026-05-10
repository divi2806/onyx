"use client";

import { ArrowRight01Icon, LockPasswordIcon, ShieldKeyIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import * as React from "react";

import {
  OnyxMark,
  UsdcLogo,
  UsdtLogo,
  SolanaLogo,
} from "@/components/logos";
import { ConnectButton } from "@/components/solana/connect-button";
import { fancyButtonVariants } from "@/components/ui/fancy-button";

function TopBar() {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 pt-6 sm:px-10">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="grid size-7 place-items-center rounded-lg border border-primary/30 bg-primary/12">
          <OnyxMark className="size-3.5" />
        </div>
        <span className="text-[14px] font-bold tracking-[-0.02em] text-foreground">Onyx</span>
      </Link>

      <nav className="hidden items-center gap-6 text-[13px] text-muted-foreground sm:flex">
        <a href="#features" className="transition-colors hover:text-foreground">Features</a>
        <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
      </nav>

      <div className="flex items-center gap-2">
        <ConnectButton />
      </div>
    </header>
  );
}

function MockTransactionCard() {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    let v = 0;
    const id = setInterval(() => {
      v = v >= 100 ? 0 : v + 1.4;
      setProgress(v);
    }, 38);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full max-w-[360px]">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute inset-[-20px] rounded-3xl bg-primary/20 blur-3xl"
      />

      {/* Outer ring */}
      <div className="relative rounded-2xl border border-primary/20 bg-card/70 shadow-2xl backdrop-blur-md">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded-md bg-primary/15">
              <HugeiconsIcon icon={LockPasswordIcon} size={12} strokeWidth={2} className="text-primary" />
            </div>
            <span className="text-[12.5px] font-semibold text-foreground">Private Transfer</span>
          </div>
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-widest text-primary">
            ZK Proof
          </span>
        </div>

        <div className="p-5">
          {/* Recipient row */}
          <div className="mb-3 rounded-xl bg-secondary/40 px-3.5 py-3">
            <p className="mb-1 text-[9.5px] font-medium uppercase tracking-widest text-muted-foreground/60">
              Recipient
            </p>
            <p className="font-mono text-[12px] text-foreground/80">
              7xKX4…W3mPq
            </p>
          </div>

          {/* Amount row */}
          <div className="mb-4 rounded-xl bg-secondary/40 px-3.5 py-3">
            <p className="mb-1 text-[9.5px] font-medium uppercase tracking-widest text-muted-foreground/60">
              Amount
            </p>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[22px] font-bold tracking-tight text-foreground">
                1,500
              </span>
              <div className="flex items-center gap-1.5">
                <UsdcLogo className="size-4" />
                <span className="text-[12.5px] font-medium text-foreground/70">USDC</span>
              </div>
            </div>
          </div>

          {/* ZK progress */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                {progress < 45 ? "Generating deposit proof…" : progress < 90 ? "Submitting to pool…" : "Finalising…"}
              </span>
              <span className="font-mono tabular-nums text-primary">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Privacy tags */}
          <div className="flex flex-wrap gap-2">
            {["Amount hidden", "Sender hidden", "Recipient hidden"].map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-0.5 text-[10px] font-medium text-primary/70"
              >
                <span className="size-1 rounded-full bg-primary/60" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -right-4 -top-3 rounded-xl border border-primary/25 bg-card/80 px-3 py-1.5 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          <span className="text-[10.5px] font-semibold text-primary">Solana mainnet</span>
        </div>
      </div>

      {/* Bottom floating card */}
      <div className="absolute -bottom-5 -left-4 flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/80 px-3.5 py-2.5 shadow-lg backdrop-blur-sm">
        <HugeiconsIcon icon={ShieldKeyIcon} size={14} strokeWidth={1.8} className="text-primary" />
        <div>
          <p className="text-[9.5px] text-muted-foreground/70">Verified on-chain</p>
          <p className="font-mono text-[10.5px] font-medium text-foreground">zh1eL…6qRkW</p>
        </div>
      </div>
    </div>
  );
}

const STATS = [
  { value: "~3s", label: "ZK proof time" },
  { value: "0.30%", label: "Variable fee" },
  { value: "32", label: "Merkle height" },
  { value: "1 sig", label: "Batch payroll" },
];

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-background">
      {/* Background effects */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-[600px] w-[600px] rounded-full bg-primary/8 blur-[140px]" />
        <div className="absolute -right-32 top-1/3 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(circle, var(--color-foreground) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 80%)",
          }}
        />
      </div>

      <div className="relative z-10">
        <TopBar />
      </div>

      {/* Hero body */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 pt-20 pb-24 sm:px-10 lg:grid-cols-[1fr_440px] lg:gap-16 lg:pt-28 xl:pt-32">
        {/* LEFT — text */}
        <div>
          {/* Eyebrow badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Private · ZK-shielded · Auditable
          </div>

          <h1 className="max-w-[580px] text-[46px] font-black leading-[1.02] tracking-[-0.04em] text-foreground sm:text-[58px] lg:text-[62px]">
            Payroll that leaves
            <br />
            no trace on the
            <br />
            <span
              className="text-primary"
              style={{
                textShadow: "0 0 60px color-mix(in oklch, var(--primary) 45%, transparent)",
              }}
            >
              public ledger.
            </span>
          </h1>

          <p className="mt-6 max-w-[480px] text-[15.5px] leading-7 text-muted-foreground">
            Move payroll, vendor payments, and treasury transfers through a ZK shielded pool on Solana. Your amounts stay sealed. Audit access stays ready.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/payroll"
              className={fancyButtonVariants({ variant: "primary", size: "lg" })}
            >
              Open app
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2.2} />
            </Link>
            <a
              href="#features"
              className={fancyButtonVariants({ variant: "neutral", size: "lg" })}
            >
              See features
            </a>
          </div>

          {/* Stats strip */}
          <div className="mt-10 flex flex-wrap items-start gap-x-8 gap-y-4 border-t border-border/40 pt-8">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-mono text-[20px] font-bold tracking-tight text-primary">{s.value}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.13em] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Asset strip */}
          <div className="mt-7 flex items-center gap-4">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground/50">Works with</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground/70">
                <SolanaLogo className="size-4" /> SOL
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground/70">
                <UsdcLogo className="size-4" /> USDC
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground/70">
                <UsdtLogo className="size-4" /> USDT
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — mock UI card */}
        <div className="flex justify-center lg:justify-end">
          <MockTransactionCard />
        </div>
      </div>

      {/* Bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background"
      />
    </section>
  );
}
