"use client";

import { solanaConfig } from "@/lib/solana/config";
import { cn } from "@/lib/utils";

const STYLES: Record<
  typeof solanaConfig.cluster,
  { label: string; dot: string; chip: string } | null
> = {
  "mainnet-beta": null,
  devnet: {
    label: "Devnet",
    dot: "bg-primary",
    chip: "border-primary/25 bg-primary/10 text-primary/80",
  },
  testnet: {
    label: "Testnet",
    dot: "bg-sky-400",
    chip: "border-sky-400/25 bg-sky-400/10 text-sky-400/80",
  },
  localnet: {
    label: "Localnet",
    dot: "bg-violet-400",
    chip: "border-violet-400/25 bg-violet-400/10 text-violet-400/80",
  },
};

export function ClusterBadge({ className }: { className?: string }) {
  const style = STYLES[solanaConfig.cluster];
  if (!style) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-[10.5px] font-semibold tracking-wide uppercase",
        style.chip,
        className,
      )}
      title={`Connected to ${style.label}`}
      aria-label={`Cluster: ${style.label}`}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full animate-pulse", style.dot)}
      />
      {style.label}
    </span>
  );
}
