import * as React from "react";

import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { PageTransition } from "@/components/app-shell/page-transition";
import { ConnectButton } from "@/components/solana/connect-button";
import { ClusterBadge } from "@/components/solana/cluster-badge";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none fixed right-0 top-0 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 left-[216px] h-[300px] w-[300px] rounded-full bg-primary/4 blur-[100px]"
      />

      <AppSidebar />

      {/* Main content shifted right by sidebar width */}
      <main className="relative min-h-screen flex-1 overflow-x-hidden pl-[216px]">
        {/* Top right header for wallet */}
        <div className="absolute top-6 right-8 z-50 flex items-center gap-3">
          <ClusterBadge />
          <ConnectButton />
        </div>

        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
