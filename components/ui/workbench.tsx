import * as React from "react";

import { cn } from "@/lib/utils";

type WorkbenchStat = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
};

export function WorkbenchPage({
  kicker,
  title,
  description,
  actions,
  stats,
  children,
  aside,
  className,
}: {
  kicker: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  stats?: WorkbenchStat[];
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8", className)}>
      <header className="border-b border-border/60 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {kicker}
            </p>
            <h1 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight tracking-normal text-foreground sm:text-[2rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        {stats?.length ? (
          <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-t border-border/50 pt-4">
            {stats.map((stat) => (
              <MetricTile key={stat.label} {...stat} />
            ))}
          </dl>
        ) : null}
      </header>

      <div
        className={cn(
          "grid min-w-0 gap-6",
          aside ? "xl:grid-cols-[minmax(0,1fr)_300px]" : "",
        )}
      >
        <div className="min-w-0">{children}</div>
        {aside ? <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">{aside}</aside> : null}
      </div>
    </div>
  );
}

export function WorkbenchPanel({
  title,
  eyebrow,
  description,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border/60 bg-card/30", className)}>
      {(title || eyebrow || description || action) && (
        <div className="flex flex-col gap-3 border-b border-border/55 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="mt-1 text-sm font-semibold tracking-normal text-foreground">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function MetricTile({
  label,
  value,
  hint,
  tone = "default",
}: WorkbenchStat) {
  return (
    <div
      data-tone={tone}
      className={cn(
        "min-w-[7.5rem]",
        tone === "primary" && "[&_dd]:text-primary",
        tone === "success" && "[&_dd]:text-emerald-300",
        tone === "warning" && "[&_dd]:text-amber-300",
        tone === "danger" && "[&_dd]:text-destructive",
      )}
    >
      <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
        {value}
      </dd>
      {hint ? <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}

export function FieldStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col gap-2", className)}>{children}</div>;
}

export function InlineNotice({
  tone = "default",
  title,
  children,
  action,
  className,
}: {
  tone?: "default" | "primary" | "success" | "warning" | "danger";
  title?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border/60 bg-secondary/15 px-3.5 py-3 text-sm sm:flex-row sm:items-start sm:justify-between",
        tone === "primary" && "border-primary/25 bg-primary/10",
        tone === "success" && "border-emerald-500/20 bg-emerald-500/10",
        tone === "warning" && "border-amber-500/20 bg-amber-500/10",
        tone === "danger" && "border-destructive/30 bg-destructive/10",
        className,
      )}
    >
      <div className="min-w-0">
        {title ? <p className="font-medium text-foreground">{title}</p> : null}
        <div className={cn("text-muted-foreground", title && "mt-1")}>{children}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyWorkbench({
  title,
  description,
  action,
}: {
  title: React.ReactNode;
  description: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-52 place-items-center rounded-lg border border-dashed border-border/60 bg-secondary/10 p-8 text-center">
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
