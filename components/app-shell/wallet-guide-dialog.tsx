"use client";

import {
  Calendar03Icon,
  CheckmarkCircle01Icon,
  CoinsSwapIcon,
  EyeIcon,
  InvoiceIcon,
  LockIcon,
  ShieldKeyIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useWallet } from "@solana/wallet-adapter-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSolanaNetwork } from "@/lib/solana/network";

const GUIDE_KEY_PREFIX = "onyx:wallet-guide-seen:v1";
export const WALLET_GUIDE_OPEN_EVENT = "onyx:wallet-guide-open";

export function WalletGuideDialog() {
  const { connected, publicKey } = useWallet();
  const { config, switchCluster } = useSolanaNetwork();
  const [open, setOpen] = React.useState(false);

  const walletAddress = publicKey?.toBase58() ?? null;

  React.useEffect(() => {
    if (!connected || !walletAddress) return;
    const key = guideKey(walletAddress, config.cluster);
    try {
      if (window.localStorage.getItem(key) === "true") return;
    } catch {
      // If storage is blocked, still show the guide for this session.
    }
    setOpen(true);
  }, [config.cluster, connected, walletAddress]);

  React.useEffect(() => {
    function openGuide() {
      setOpen(true);
    }
    window.addEventListener(WALLET_GUIDE_OPEN_EVENT, openGuide);
    return () => {
      window.removeEventListener(WALLET_GUIDE_OPEN_EVENT, openGuide);
    };
  }, []);

  function markSeen() {
    if (walletAddress) {
      try {
        window.localStorage.setItem(guideKey(walletAddress, config.cluster), "true");
      } catch {
        // Non-critical.
      }
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-5 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Before you move funds</DialogTitle>
          <DialogDescription>
            Onyx gives your wallet private Solana workflows through Cloak.
            Review the main actions before signing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-3">
          <GuidePoint
            icon={LockIcon}
            title="Cloak route"
            description="Funds enter the shield pool, then leave through a private payout."
          />
          <GuidePoint
            icon={CheckmarkCircle01Icon}
            title="Wallet approval"
            description="You approve proof authorization and transaction signing in your wallet."
          />
          <GuidePoint
            icon={ShieldKeyIcon}
            title="Scoped audit"
            description="Audit tokens are time-boxed and role-scoped. You choose what to share."
          />
        </div>

        <div className="grid gap-2 rounded-lg border border-border/70 bg-secondary/15 p-3 sm:grid-cols-2">
          <ModulePoint
            icon={LockIcon}
            title="Send"
            description="Create one private transfer. Enter recipient and amount, then sign the shield deposit and payout."
          />
          <ModulePoint
            icon={UserMultipleIcon}
            title="Payroll"
            description="Upload a CSV roster and run private payouts from one batch deposit. Failed rows stay visible."
          />
          <ModulePoint
            icon={Calendar03Icon}
            title="Team"
            description="Save recipients, defaults, and recurring schedules for repeat private payments."
          />
          <ModulePoint
            icon={CoinsSwapIcon}
            title="Treasury"
            description="Privately rebalance shielded SOL into supported stablecoin outputs with a quoted minimum receive."
          />
          <ModulePoint
            icon={EyeIcon}
            title="History"
            description="Review browser-saved outbound receipts and scan for received payments on the selected network."
          />
          <ModulePoint
            icon={ShieldKeyIcon}
            title="Audit Access"
            description="Create an audit token for a date range. The auditor pastes it in the audit portal to scan and export CSV."
          />
          <ModulePoint
            icon={InvoiceIcon}
            title="Invoice"
            description="Create claim links so payers can route a request through the same private payment path."
          />
        </div>

        <div className="rounded-lg border border-border/70 bg-secondary/20 p-3 text-sm text-muted-foreground">
          Current network:{" "}
          <span className="font-medium text-foreground">
            {config.cluster === "devnet" ? "Devnet" : "Mainnet"}
          </span>
          . Use the network badge in the topbar to switch the app between
          devnet testing and mainnet funds.
        </div>

        <DialogFooter className="sm:justify-between">
          {config.cluster === "mainnet-beta" ? (
            <Button type="button" variant="outline" onClick={() => switchCluster("devnet")}>
              Switch to Devnet
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}
          <Button type="button" onClick={markSeen}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GuidePoint({
  icon,
  title,
  description,
}: {
  icon: IconSvgElement;
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-border/70 bg-card/45 p-3">
      <span className="grid size-9 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
        <HugeiconsIcon icon={icon} size={17} strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function ModulePoint({
  icon,
  title,
  description,
}: {
  icon: IconSvgElement;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-md p-2">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border border-border/70 bg-background/50 text-primary">
        <HugeiconsIcon icon={icon} size={15} strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function guideKey(walletAddress: string, cluster: string): string {
  return `${GUIDE_KEY_PREFIX}:${cluster}:${walletAddress}`;
}
