"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { OnyxMark } from "@/components/logos";
import { ClusterBadge } from "@/components/solana/cluster-badge";
import { ConnectButton } from "@/components/solana/connect-button";
import { cn } from "@/lib/utils";

const NAV_MAIN = [
  { href: "/pay", label: "Send" },
  { href: "/payroll", label: "Payroll" },
  { href: "/team", label: "Team" },
  { href: "/history", label: "Ledger" },
];

const NAV_TOOLS = [
  { href: "/compliance", label: "Compliance" },
  { href: "/invoice", label: "Invoice" },
];

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "relative flex h-8 items-center rounded-lg px-3 text-[13px] font-medium transition-all duration-150",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5",
      )}
    >
      {isActive && (
        <motion.span
          layoutId="topnav-pill"
          aria-hidden="true"
          className="absolute inset-0 rounded-lg bg-primary/12 border border-primary/22"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <span className="relative z-10">{label}</span>
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute inset-x-3 -bottom-[1px] h-px rounded-full bg-primary/60"
        />
      )}
    </Link>
  );
}

export function AppTopNav() {
  return (
    <header className="sticky top-0 z-40 h-[52px] border-b border-border/40 bg-background/88 backdrop-blur-2xl">
      <div className="mx-auto flex h-full max-w-screen-xl items-center gap-4 px-5">

        {/* Logo */}
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/5"
        >
          <div className="grid size-6 place-items-center rounded-lg border border-primary/30 bg-primary/12 transition-colors group-hover:bg-primary/18">
            <OnyxMark className="size-3" />
          </div>
          <span className="text-[13.5px] font-bold tracking-[-0.02em] text-foreground">
            Onyx
          </span>
        </Link>

        <div className="h-4 w-px bg-border/60" />

        {/* Navigation */}
        <nav className="flex items-center gap-0.5" aria-label="Main">
          {NAV_MAIN.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
          <div className="mx-1.5 h-3.5 w-px bg-border/50" />
          {NAV_TOOLS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        {/* Right */}
        <div className="ml-auto flex items-center gap-2.5">
          <ClusterBadge />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
