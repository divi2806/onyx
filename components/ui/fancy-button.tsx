import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const fancyButton = cva(
  cn(
    "group/fb relative inline-flex shrink-0 items-center justify-center gap-2",
    "whitespace-nowrap rounded-xl text-sm font-semibold tracking-tight",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.98]",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        primary: cn(
          "bg-gradient-to-b from-[oklch(0.72_0.24_285)] to-[oklch(0.62_0.24_285)]",
          "text-primary-foreground",
          "border border-[oklch(0.68_0.24_285_/_35%)]",
          "shadow-[0_0_0_1px_oklch(0.82_0.20_285_/_20%)_inset,0_6px_24px_-4px_oklch(0.68_0.24_285_/_55%)]",
          "hover:from-[oklch(0.74_0.24_285)] hover:to-[oklch(0.65_0.24_285)]",
          "hover:shadow-[0_0_0_1px_oklch(0.82_0.20_285_/_28%)_inset,0_8px_32px_-4px_oklch(0.68_0.24_285_/_70%)]",
          "hover:border-[oklch(0.68_0.24_285_/_55%)]",
        ),
        neutral: cn(
          "text-foreground",
          "bg-secondary/50 hover:bg-secondary",
          "border border-border hover:border-border/80",
          "shadow-[0_1px_2px_oklch(0_0_0_/_20%)]",
        ),
        ghost: cn(
          "text-muted-foreground hover:text-foreground",
          "bg-transparent hover:bg-secondary/50",
          "border border-transparent",
        ),
      },
      size: {
        sm: "h-8 px-3 text-[12.5px] gap-1.5",
        md: "h-9 px-4 text-[13.5px]",
        lg: "h-10 px-5 text-[13.5px]",
        xl: "h-11 px-6 text-[14.5px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type FancyButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof fancyButton> & {
    asChild?: boolean;
  };

export const FancyButton = React.forwardRef<HTMLButtonElement, FancyButtonProps>(
  function FancyButton({ className, variant, size, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(fancyButton({ variant, size }), className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);

export { fancyButton as fancyButtonVariants };
