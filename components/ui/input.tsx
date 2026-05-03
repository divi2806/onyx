import * as React from "react";

import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { className, leadingIcon, trailingIcon, invalid, type = "text", ...props },
    ref,
  ) {
    return (
      <div
        data-slot="input-root"
        data-invalid={invalid ? "true" : undefined}
        className={cn(
          "group/input relative flex h-10 w-full items-center gap-2.5 rounded-xl",
          "border border-border bg-secondary/30 px-3.5",
          "transition-all duration-150",
          "focus-within:border-primary/50 focus-within:bg-secondary/50",
          "focus-within:shadow-[0_0_0_3px_oklch(0.68_0.24_285_/_15%)]",
          "data-[invalid=true]:border-destructive/60 data-[invalid=true]:focus-within:border-destructive",
          "data-[invalid=true]:shadow-[0_0_0_3px_oklch(0.62_0.22_28_/_12%)]",
          className,
        )}
      >
        {leadingIcon ? (
          <span className="grid size-4 shrink-0 place-items-center text-muted-foreground/70 group-focus-within/input:text-primary/70 transition-colors">
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          type={type}
          className={cn(
            "h-full w-full min-w-0 bg-transparent text-[13.5px] text-foreground outline-none",
            "placeholder:text-muted-foreground/50",
            "[&::-webkit-search-cancel-button]:hidden",
          )}
          {...props}
        />
        {trailingIcon ? (
          <span className="grid size-4 shrink-0 place-items-center text-muted-foreground/60 transition-colors">
            {trailingIcon}
          </span>
        ) : null}
      </div>
    );
  },
);
