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
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof DollarSendIcon;
};

const NAV_PRIMARY: NavItem[] = [
  { href: "/pay", label: "Send", icon: DollarSendIcon },
  { href: "/payroll", label: "Payroll", icon: UserMultipleIcon },
  { href: "/team", label: "Team", icon: UserGroupIcon },
  { href: "/history", label: "Ledger", icon: ClockIcon },
];

const NAV_TOOLS: NavItem[] = [
  { href: "/compliance", label: "Compliance", icon: FileSecurityIcon },
  { href: "/invoice", label: "Invoice", icon: InvoiceIcon },
];

function SidebarNavItem({ href, label, icon, delay }: NavItem & { delay: number }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={href}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
          isActive
            ? "text-primary"
            : "text-white/35 hover:text-white/70 hover:bg-white/[0.04]",
        )}
      >
        {/* Active left accent bar */}
        {isActive && (
          <motion.span
            layoutId="sidebar-accent"
            aria-hidden
            className="absolute inset-y-[6px] left-0 w-[3px] rounded-full bg-primary"
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
          />
        )}

        {/* Active bg fill */}
        {isActive && (
          <motion.span
            layoutId="sidebar-bg"
            aria-hidden
            className="absolute inset-0 rounded-lg bg-primary/10"
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
          />
        )}

        <HugeiconsIcon
          icon={icon}
          size={15}
          strokeWidth={isActive ? 2 : 1.6}
          className={cn(
            "relative z-10 shrink-0 transition-all",
            isActive ? "text-primary" : "text-white/30 group-hover:text-white/55",
          )}
        />
        <span className="relative z-10">{label}</span>
      </Link>
    </motion.div>
  );
}

export function AppSidebar() {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex w-[216px] flex-col"
      style={{ background: "oklch(0.055 0.007 280)" }}
    >
      {/* Right border */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/[0.06]" />

      {/* Logo */}
      <div className="px-5 pb-4 pt-6">
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-white/[0.04]"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="grid size-8 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/12"
          >
            <OnyxMark className="size-4" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.07, duration: 0.2 }}
            className="flex flex-col"
          >
            <span className="text-[14px] font-bold leading-none tracking-[-0.02em] text-white/90">
              Onyx
            </span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-primary/50">
              Shield Pool
            </span>
          </motion.div>
        </Link>
      </div>

      {/* Thin divider */}
      <div className="mx-4 h-px bg-white/[0.05]" />

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
        {/* Payments */}
        <p className="mb-1.5 px-3 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-white/18">
          Payments
        </p>
        {NAV_PRIMARY.map((item, i) => (
          <SidebarNavItem key={item.href} {...item} delay={0.05 + i * 0.04} />
        ))}

        <div className="my-3 h-px bg-white/[0.05]" />

        {/* Finance */}
        <p className="mb-1.5 px-3 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-white/18">
          Finance
        </p>
        {NAV_TOOLS.map((item, i) => (
          <SidebarNavItem key={item.href} {...item} delay={0.22 + i * 0.04} />
        ))}
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t border-white/[0.05] p-4">
        <p className="text-[10px] text-white/30 text-center font-medium">Onyx dApp</p>
      </div>
    </aside>
  );
}
