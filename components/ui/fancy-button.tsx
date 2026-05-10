import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const fancyButton = cva(
  cn(
    "group/fb relative inline-flex shrink-0 items-center justify-center gap-2",
    "whitespace-nowrap rounded-lg text-sm font-semibold tracking-normal",
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
          "border border-primary/45 bg-primary text-primary-foreground",
          "hover:bg-primary/90 hover:border-primary/65",
        ),
        neutral: cn(
          "text-foreground",
          "bg-transparent hover:bg-secondary/45",
          "border border-border hover:border-border/80",
        ),
        ghost: cn(
          "text-muted-foreground hover:text-foreground",
          "bg-transparent hover:bg-secondary/50",
          "border border-transparent",
        ),
      },
      size: {
        sm: "h-9 px-3 text-[12.5px] gap-1.5",
        md: "h-10 px-4 text-[13.5px]",
        lg: "h-11 px-5 text-[13.5px]",
        xl: "h-12 px-6 text-[14.5px]",
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
