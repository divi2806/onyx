"use client";

import { ArrowReloadHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { useSolanaNetwork } from "@/lib/solana/network";
import { cn } from "@/lib/utils";

const STYLES: Record<
  "mainnet-beta" | "devnet",
  { label: string; dot: string; chip: string }
> = {
  "mainnet-beta": {
    label: "Mainnet",
    dot: "bg-emerald-400",
    chip: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  },
  devnet: {
    label: "Devnet",
    dot: "bg-amber-400",
    chip: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  },
};

export function ClusterBadge({ className }: { className?: string }) {
  const { config, switchCluster } = useSolanaNetwork();
  const style = STYLES[config.cluster];
  const nextCluster = config.cluster === "devnet" ? "mainnet-beta" : "devnet";
  const nextLabel = STYLES[nextCluster].label;

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={() => switchCluster(nextCluster)}
      className={cn(
        "gap-2 border px-3 text-[10.5px] font-semibold uppercase tracking-wide",
        style.chip,
        className,
      )}
      aria-label={`Network: ${style.label}. Switch to ${nextLabel}.`}
      title={`Connected to ${style.label}. Click to switch to ${nextLabel}.`}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full animate-pulse", style.dot)}
      />
      {style.label}
      <HugeiconsIcon
        icon={ArrowReloadHorizontalIcon}
        size={13}
        strokeWidth={2}
        aria-hidden="true"
      />
    </Button>
  );
}
