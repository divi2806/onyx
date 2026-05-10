import * as React from "react";

import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { AppTopbar } from "@/components/app-shell/app-topbar";
import { PageTransition } from "@/components/app-shell/page-transition";
import { WalletGuideDialog } from "@/components/app-shell/wallet-guide-dialog";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <AppTopbar />
        <main className="min-h-[calc(100vh-52px)] overflow-x-hidden">
          <PageTransition>{children}</PageTransition>
        </main>
      </SidebarInset>
      <WalletGuideDialog />
    </SidebarProvider>
  );
}
