"use client";

import { motion } from "motion/react";
import * as React from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-5 pt-9 pb-1", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-3"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/22 bg-primary/8 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-primary/75">
                <span className="size-1.5 rounded-full bg-primary/70" />
                {eyebrow}
              </span>
            </motion.div>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.04 }}
            className="text-[26px] font-bold leading-tight tracking-[-0.03em] text-foreground sm:text-[32px]"
          >
            {title}
          </motion.h1>
          {description && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.08 }}
              className="mt-2 max-w-xl text-[13.5px] leading-[1.65] text-muted-foreground"
            >
              {description}
            </motion.p>
          )}
        </div>

        {actions && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="flex shrink-0 items-center gap-2"
          >
            {actions}
          </motion.div>
        )}
      </div>

      {/* Gradient accent line — fades right, different from Nori's full border-b */}
      <div className="mt-6 h-px bg-gradient-to-r from-primary/40 via-border/50 to-transparent" />
    </div>
  );
}
