"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import * as React from "react";

import { ClusterBadge } from "@/components/solana/cluster-badge";
import { ConnectButton } from "@/components/solana/connect-button";
import { SidebarTrigger } from "@/components/ui/sidebar";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/pay": {
    title: "Send",
    subtitle: "ZK-shielded transfer · amount and recipient never touch the ledger",
  },
  "/payroll": {
    title: "Payroll",
    subtitle: "Dispatch your full roster privately from a single CSV",
  },
  "/team": {
    title: "Team",
    subtitle: "Saved recipients and recurring payment schedules",
  },
  "/history": {
    title: "Ledger",
    subtitle: "Your sealed outbound record — chain-verified, privately held",
  },
  "/compliance": {
    title: "Compliance",
    subtitle: "Scoped viewing keys · share exactly what auditors need",
  },
  "/invoice": {
    title: "Invoice",
    subtitle: "Shareable claim links — payer routes funds through the shield pool",
  },
};

export function AppTopbar() {
  const pathname = usePathname();
  const meta =
    TITLES[pathname] ??
    Object.entries(TITLES).find(([k]) => pathname.startsWith(`${k}/`))?.[1] ??
    { title: "Onyx", subtitle: "" };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

      <div className="hidden h-5 w-px bg-border sm:block" />

      <div className="min-w-0 flex-1 overflow-hidden">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col leading-tight"
        >
          <span className="truncate text-[14px] font-medium tracking-tight text-foreground">
            {meta.title}
          </span>
          <span className="hidden truncate text-[12px] text-muted-foreground sm:block">
            {meta.subtitle}
          </span>
        </motion.div>
      </div>

      <ClusterBadge />
      <ConnectButton />
    </header>
  );
}
