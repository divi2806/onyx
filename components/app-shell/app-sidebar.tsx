"use client";

import {
  BankIcon,
  ClockIcon,
  DollarSendIcon,
  FileSecurityIcon,
  InvoiceIcon,
  UserGroupIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { OnyxMark } from "@/components/logos";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
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
  { href: "/treasury", label: "Treasury", icon: BankIcon },
  { href: "/compliance", label: "Compliance", icon: FileSecurityIcon },
  { href: "/invoice", label: "Invoice", icon: InvoiceIcon },
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border/80">
      <SidebarHeader className="border-b border-sidebar-border/70 p-4">
        <Link
          href="/"
          className="group flex h-11 items-center gap-3 rounded-lg px-2 transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 transition-colors group-hover:border-primary/45">
            <OnyxMark className="size-4" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-bold leading-none text-sidebar-foreground">
              Onyx
            </p>
            <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/65">
              Shield Pool
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarSection title="Payments" items={NAV_PRIMARY} />
        <div className="my-2 h-px bg-sidebar-border/70" />
        <SidebarSection title="Finance" items={NAV_TOOLS} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 p-4">
        <div className="rounded-lg border border-sidebar-border/70 bg-sidebar-accent/35 px-3 py-2.5 group-data-[collapsible=icon]:hidden">
          <p className="text-xs font-medium text-sidebar-foreground">
            Private ops
          </p>
          <p className="mt-1 text-xs leading-5 text-sidebar-foreground/60">
            Payroll, invoices, audit, and treasury flows through Cloak.
          </p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function SidebarSection({
  title,
  items,
}: {
  title: string;
  items: NavItem[];
}) {
  return (
    <nav className="grid gap-1" aria-label={title}>
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45 group-data-[collapsible=icon]:sr-only">
        {title}
      </p>
      {items.map((item) => (
        <SidebarNavItem key={item.href} {...item} />
      ))}
    </nav>
  );
}

function SidebarNavItem({ href, label, icon }: NavItem) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={() => {
        if (isMobile) setOpenMobile(false);
      }}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/62 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
      )}
      title={label}
    >
      {isActive ? (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary group-data-[collapsible=icon]:hidden"
        />
      ) : null}
      <HugeiconsIcon
        icon={icon}
        size={17}
        strokeWidth={isActive ? 2.2 : 1.8}
        className={cn(
          "shrink-0",
          isActive ? "text-primary" : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/70",
        )}
        aria-hidden="true"
      />
      <span className="truncate group-data-[collapsible=icon]:sr-only">{label}</span>
    </Link>
  );
}
