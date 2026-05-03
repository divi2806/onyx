"use client";

import {
  ClockIcon,
  DollarSendIcon,
  FileSecurityIcon,
  InvoiceIcon,
  UserGroupIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { OnyxMark } from "@/components/logos";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { cloakConfig } from "@/lib/cloak/config";
import { solanaConfig } from "@/lib/solana/config";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof DollarSendIcon;
};

const PAYMENTS_NAV: NavItem[] = [
  { href: "/pay", label: "Send", icon: DollarSendIcon },
  { href: "/payroll", label: "Payroll", icon: UserMultipleIcon },
  { href: "/team", label: "Team", icon: UserGroupIcon },
  { href: "/history", label: "Ledger", icon: ClockIcon },
];

const TOOLS_NAV: NavItem[] = [
  { href: "/compliance", label: "Compliance", icon: FileSecurityIcon },
  { href: "/invoice", label: "Invoice", icon: InvoiceIcon },
];

function NavGroup({ items, startDelay = 0 }: { items: NavItem[]; startDelay?: number }) {
  const pathname = usePathname();
  return (
    <SidebarMenu>
      {items.map((item, i) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <SidebarMenuItem key={item.href}>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: startDelay + i * 0.04,
                duration: 0.26,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative"
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  aria-hidden="true"
                  className="absolute inset-0 -z-0 rounded-lg bg-sidebar-accent"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <SidebarMenuButton
                isActive={isActive}
                tooltip={item.label}
                className={cn(
                  "relative z-10 bg-transparent! data-active:bg-transparent!",
                  isActive && "text-sidebar-accent-foreground",
                )}
                render={<Link href={item.href} />}
              >
                <HugeiconsIcon
                  icon={item.icon}
                  size={16}
                  strokeWidth={1.8}
                  className={cn(
                    "transition-colors",
                    isActive ? "text-primary" : "text-sidebar-foreground/60",
                  )}
                />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </motion.div>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const programId = cloakConfig.programId.toBase58();
  const isMainnet = solanaConfig.cluster === "mainnet-beta";
  const shortId = `${programId.slice(0, 8)}…${programId.slice(-5)}`;

  return (
    <Sidebar collapsible="icon" variant="inset" className="border-r-0">
      <SidebarHeader>
        <Link
          href="/"
          className="group/brand flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent/60"
        >
          <motion.span
            className="grid size-7 place-items-center"
            initial={{ rotate: -8, scale: 0.85, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
          >
            <OnyxMark className="size-7" />
          </motion.span>
          <motion.div
            className="flex flex-col group-data-[collapsible=icon]:hidden"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08, duration: 0.25 }}
          >
            <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground leading-none">
              Onyx
            </span>
            <span className="text-[10.5px] text-sidebar-foreground/40 tracking-wide mt-0.5">
              Private Payments
            </span>
          </motion.div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-[0.15em] text-sidebar-foreground/35">
            Payments
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <NavGroup items={PAYMENTS_NAV} startDelay={0.06} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-[0.15em] text-sidebar-foreground/35">
            Finance
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <NavGroup items={TOOLS_NAV} startDelay={0.24} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36, duration: 0.3 }}
          className="rounded-xl border border-sidebar-border/60 bg-sidebar-accent/30 p-3 group-data-[collapsible=icon]:hidden"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
              Network
            </p>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[9.5px] font-medium tracking-wide",
                isMainnet
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-amber-500/10 text-amber-400",
              )}
            >
              {isMainnet ? "mainnet" : "devnet"}
            </span>
          </div>
          <p className="truncate font-mono text-[11px] text-sidebar-foreground/50">
            {shortId}
          </p>
        </motion.div>
      </SidebarFooter>
    </Sidebar>
  );
}
