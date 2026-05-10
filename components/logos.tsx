import * as React from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

export type LogoProps = {
  className?: string;
  title?: string;
};

function PublicLogo({
  src,
  className,
  title,
}: {
  src: string;
  className?: string;
  title?: string;
}) {
  return (
    <Image
      src={src}
      alt={title ?? ""}
      width={24}
      height={24}
      aria-hidden={title ? undefined : true}
      className={cn("size-6", className)}
      draggable={false}
      unoptimized
    />
  );
}

// Public assets (from `public/*`).
export function SolanaLogo(props: LogoProps) {
  return <PublicLogo src="/Solana.svg" {...props} />;
}
export function UsdcLogo(props: LogoProps) {
  return <PublicLogo src="/USDC.svg" {...props} />;
}
export function UsdtLogo(props: LogoProps) {
  return <PublicLogo src="/USDT.svg" {...props} />;
}
export function PhantomLogo(props: LogoProps) {
  return <PublicLogo src="/PhantomApp.svg" {...props} />;
}
export function PhantomGhostLogo(props: LogoProps) {
  return <PublicLogo src="/PhantomGhost.svg" {...props} />;
}
export function SolflareLogo(props: LogoProps) {
  return <PublicLogo src="/Solflare.svg" {...props} />;
}
export function BackpackLogo(props: LogoProps) {
  return <PublicLogo src="/Backpack.svg" {...props} />;
}

// Kept inline (not sourced from `public/`).
export function CloakLogo({ className, title, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={cn("size-6", className)}
      xmlns="http://www.w3.org/2000/svg"
      {...(props as React.SVGAttributes<SVGSVGElement>)}
    >
      {title ? <title>{title}</title> : null}
      <rect width="24" height="24" rx="6" fill="var(--background)" />
      <circle
        cx="12"
        cy="12"
        r="6.5"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.4"
      />
      <path d="M12 5.5a6.5 6.5 0 0 0 0 13V5.5Z" fill="var(--primary)" />
    </svg>
  );
}

export function OnyxMark({ className, title, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={cn("size-6", className)}
      xmlns="http://www.w3.org/2000/svg"
      {...(props as React.SVGAttributes<SVGSVGElement>)}
    >
      {title ? <title>{title}</title> : null}
      {/* Shield outer — matches new teal brand */}
      <path
        d="M12 2L20.5 6V13C20.5 17.5 16.8 21.2 12 22.5C7.2 21.2 3.5 17.5 3.5 13V6L12 2Z"
        fill="none"
        stroke="var(--primary)"
        strokeOpacity="0.3"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Shield left half filled */}
      <path
        d="M12 2L3.5 6V13C3.5 17.5 7.2 21.2 12 22.5V2Z"
        fill="var(--primary)"
        fillOpacity="0.9"
      />
    </svg>
  );
}

/** @deprecated use OnyxMark */
export const NoriMark = OnyxMark;

export const PROTOCOL_LOGOS = {
  solana: { name: "Solana", Logo: SolanaLogo },
  usdc: { name: "USDC", Logo: UsdcLogo },
  usdt: { name: "USDT", Logo: UsdtLogo },
  phantom: { name: "Phantom", Logo: PhantomLogo },
  solflare: { name: "Solflare", Logo: SolflareLogo },
  backpack: { name: "Backpack", Logo: BackpackLogo },
  cloak: { name: "Cloak", Logo: CloakLogo },
} as const;

export type ProtocolId = keyof typeof PROTOCOL_LOGOS;
