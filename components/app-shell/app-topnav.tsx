"use client";

import {
  ClockIcon,
  DollarSendIcon,
  FileSecurityIcon,
  InvoiceIcon,
  BankIcon,
  UserGroupIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { OnyxMark } from "@/components/logos";
import { ClusterBadge } from "@/components/solana/cluster-badge";
import { ConnectButton } from "@/components/solana/connect-button";
import { cn } from "@/lib/utils";

const NAV_MAIN = [
  { href: "/pay", label: "Send", icon: DollarSendIcon },
  { href: "/payroll", label: "Payroll", icon: UserMultipleIcon },
  { href: "/team", label: "Team", icon: UserGroupIcon },
  { href: "/history", label: "Ledger", icon: ClockIcon },
];

const NAV_TOOLS = [
  { href: "/treasury", label: "Treasury", icon: BankIcon },
  { href: "/compliance", label: "Audit Access", icon: FileSecurityIcon },
  { href: "/invoice", label: "Invoice", icon: InvoiceIcon },
];

function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: typeof DollarSendIcon;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "relative flex h-10 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive
          ? "text-foreground after:absolute after:inset-x-2.5 after:bottom-1 after:h-px after:bg-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <HugeiconsIcon
        icon={icon}
        size={15}
        strokeWidth={1.8}
        className={cn("relative z-10", isActive ? "text-primary" : "text-muted-foreground")}
        aria-hidden="true"
      />
      <span className="relative z-10">{label}</span>
    </Link>
  );
}

export function AppTopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link
          href="/"
          className="group flex h-10 shrink-0 items-center gap-2.5 rounded-md px-1.5 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="grid size-6 place-items-center rounded-md border border-primary/25 bg-primary/10 transition-colors group-hover:border-primary/45">
            <OnyxMark className="size-3" />
          </div>
          <span className="text-[13.5px] font-bold tracking-normal text-foreground">
            Onyx
          </span>
        </Link>

        {/* Navigation */}
        <nav
          className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex"
          aria-label="Main"
        >
          {NAV_MAIN.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
          <div className="mx-1 h-5 w-px bg-border/70" />
          {NAV_TOOLS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        {/* Right */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ClusterBadge />
          <ConnectButton />
        </div>
      </div>
      <nav
        className="flex gap-1 overflow-x-auto border-t border-border/45 px-4 py-1.5 md:hidden"
        aria-label="Mobile main"
      >
        {[...NAV_MAIN, ...NAV_TOOLS].map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>
    </header>
  );
}
