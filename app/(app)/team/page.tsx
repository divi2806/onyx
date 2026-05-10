"use client";

import {
  Add01Icon,
  Calendar03Icon,
  Delete02Icon,
  PencilEdit02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";

import { SolanaLogo, UsdcLogo, UsdtLogo } from "@/components/logos";
import { DueBanner } from "@/components/team/due-banner";
import { DueRunDialog } from "@/components/team/due-run-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FancyButton } from "@/components/ui/fancy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EmptyWorkbench,
  FieldStack,
  InlineNotice,
  WorkbenchPage,
  WorkbenchPanel,
} from "@/components/ui/workbench";
import {
  getShieldToken,
  getShieldTokenByMint,
  isShieldTokenSupported,
  type ShieldTokenId,
} from "@/lib/cloak/tokens";
import { solanaConfig } from "@/lib/solana/config";
import {
  addMember,
  clearSchedule,
  deleteMember,
  setSchedule,
  updateMember,
} from "@/lib/team/storage";
import {
  WEEKDAY_LABELS,
  biweeklyIndex,
  describeSchedule,
  isDue,
  nextBiweeklyIndexForDow,
} from "@/lib/team/schedule";
import { useDueMembers } from "@/lib/team/use-due-members";
import { useTeam } from "@/lib/team/use-team";
import {
  hasErrors,
  validateMemberDraft,
  type MemberDraftErrors,
} from "@/lib/team/validate-member";
import {
  hasScheduleErrors,
  validateScheduleDraft,
  type ScheduleDraftErrors,
} from "@/lib/team/validate-schedule";
import type {
  ScheduleCadence,
  TeamMember,
  TeamMemberDraft,
} from "@/lib/team/types";
import { cn } from "@/lib/utils";

const TOKEN_OPTIONS: {
  id: ShieldTokenId;
  label: string;
  Logo: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "USDC", label: "USDC", Logo: UsdcLogo },
  { id: "USDT", label: "USDT", Logo: UsdtLogo },
  { id: "SOL", label: "SOL", Logo: SolanaLogo },
];

type DialogState =
  | { kind: "closed" }
  | { kind: "add" }
  | { kind: "edit"; member: TeamMember }
  | { kind: "delete"; member: TeamMember };

export default function TeamPage() {
  const { members, ready } = useTeam();
  const due = useDueMembers();
  const [query, setQuery] = React.useState("");
  const [dialog, setDialog] = React.useState<DialogState>({ kind: "closed" });
  const [runOpen, setRunOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(q) ||
        member.wallet.toLowerCase().includes(q) ||
        member.note?.toLowerCase().includes(q),
    );
  }, [members, query]);

  const scheduled = members.filter((m) => m.schedule).length;
  const dueNow = members.filter((m) => m.schedule && isDue(m.schedule)).length;
  const closeDialog = () => setDialog({ kind: "closed" });

  return (
    <>
      <WorkbenchPage
        kicker="Team module"
        title="Recipient registry"
        description="Manage saved wallets, default amounts, and recurring schedules without leaving the private payment workflow."
        actions={
          <FancyButton type="button" variant="primary" size="lg" onClick={() => setDialog({ kind: "add" })}>
            <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={2.2} aria-hidden="true" />
            Add member
          </FancyButton>
        }
        stats={[
          { label: "Members", value: members.length, hint: ready ? "loaded locally" : "loading" },
          { label: "Scheduled", value: scheduled, hint: "recurring rules" },
          { label: "Due now", value: dueNow, tone: dueNow > 0 ? "warning" : "default" },
          { label: "Cluster", value: solanaConfig.cluster, tone: solanaConfig.cluster === "devnet" ? "warning" : "default" },
        ]}
      >
        <div className="grid gap-4">
          <DueBanner total={due.total} groups={due.groups} onRunNow={() => setRunOpen(true)} />

          <WorkbenchPanel
            title="Saved recipients"
            eyebrow="Registry"
            description="Search, edit, schedule, or remove team members. Data is stored locally for this cluster."
            action={
              <div className="w-full min-w-[220px] sm:w-72">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search registry"
                  type="search"
                  leadingIcon={<HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={2} aria-hidden="true" />}
                />
              </div>
            }
          >
            {!ready ? (
              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary/35" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <EmptyWorkbench
                title="No members yet"
                description="Add a recipient once, then reuse them in recurring and batch payment flows."
                action={
                  <FancyButton type="button" variant="primary" size="md" onClick={() => setDialog({ kind: "add" })}>
                    Add first member
                  </FancyButton>
                }
              />
            ) : filtered.length === 0 ? (
              <EmptyWorkbench
                title="No matching members"
                description="Clear search or try a wallet fragment, name, or note."
              />
            ) : (
              <div className="overflow-hidden rounded-lg border border-border/80">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-secondary/35 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Member</th>
                      <th className="px-4 py-3 font-medium">Wallet</th>
                      <th className="px-4 py-3 font-medium">Default</th>
                      <th className="px-4 py-3 font-medium">Schedule</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {filtered.map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        onEdit={() => setDialog({ kind: "edit", member })}
                        onDelete={() => setDialog({ kind: "delete", member })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </WorkbenchPanel>
        </div>
      </WorkbenchPage>

      <MemberDialog
        open={dialog.kind === "add" || dialog.kind === "edit"}
        mode={dialog.kind === "edit" ? "edit" : "add"}
        member={dialog.kind === "edit" ? dialog.member : undefined}
        existing={members}
        onClose={closeDialog}
      />

      <DeleteDialog
        open={dialog.kind === "delete"}
        member={dialog.kind === "delete" ? dialog.member : undefined}
        onClose={closeDialog}
      />

      <DueRunDialog
        open={runOpen}
        groups={due.groups}
        onClose={() => setRunOpen(false)}
      />
    </>
  );
}

function MemberRow({
  member,
  onEdit,
  onDelete,
}: {
  member: TeamMember;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const due = member.schedule ? isDue(member.schedule) : false;
  return (
    <tr className="bg-background/20">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg border border-border/80 bg-secondary/40 text-xs font-semibold text-foreground">
            {initialsOf(member.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{member.name}</p>
            {member.note ? <p className="truncate text-xs text-muted-foreground">{member.note}</p> : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{shortAddr(member.wallet)}</td>
      <td className="px-4 py-3">
        <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-secondary/30 px-2.5 py-1">
          <TokenIcon id={member.token} className="size-4" />
          <span className="font-mono text-sm text-foreground">{member.amount}</span>
          <span className="text-xs text-muted-foreground">{member.token}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        {member.schedule ? (
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs",
              due
                ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
                : "border-border/70 bg-secondary/30 text-muted-foreground",
            )}
          >
            <HugeiconsIcon icon={Calendar03Icon} size={13} strokeWidth={2} aria-hidden="true" />
            {describeSchedule(member.schedule)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">On demand</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="icon" onClick={onEdit} aria-label={`Edit ${member.name}`}>
            <HugeiconsIcon icon={PencilEdit02Icon} size={15} strokeWidth={2} aria-hidden="true" />
          </Button>
          <Button type="button" variant="destructive" size="icon" onClick={onDelete} aria-label={`Remove ${member.name}`}>
            <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={2} aria-hidden="true" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function MemberDialog({
  open,
  mode,
  member,
  existing,
  onClose,
}: {
  open: boolean;
  mode: "add" | "edit";
  member?: TeamMember;
  existing: TeamMember[];
  onClose: () => void;
}) {
  const formKey = `${mode}:${member?.id ?? "new"}`;
  return (
    <Dialog open={open} onOpenChange={(value) => (value ? null : onClose())}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add member" : "Edit member"}</DialogTitle>
          <DialogDescription>
            Save wallet, default payout settings, and an optional recurring schedule.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <MemberForm
            key={formKey}
            mode={mode}
            member={member}
            existing={existing}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type ScheduleFormState = {
  on: boolean;
  cadence: ScheduleCadence;
  dayOfCycle: number;
  amount: string;
  tokenId: ShieldTokenId;
  intervalSec: number;
  runsRemaining: number;
};

const TEST_DEFAULTS = { intervalSec: 30, runsRemaining: 2 };
const CADENCES: { id: ScheduleCadence; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Biweekly" },
  { id: "monthly", label: "Monthly" },
  { id: "test", label: "Test" },
];

function MemberForm({
  mode,
  member,
  existing,
  onClose,
}: {
  mode: "add" | "edit";
  member?: TeamMember;
  existing: TeamMember[];
  onClose: () => void;
}) {
  const [draft, setDraft] = React.useState<TeamMemberDraft>(() => initialDraft(member));
  const [errors, setErrors] = React.useState<MemberDraftErrors>({});
  const [schedule, setScheduleState] = React.useState<ScheduleFormState>(() =>
    initialSchedule(member, draft),
  );
  const [scheduleErrors, setScheduleErrors] = React.useState<ScheduleDraftErrors>({});
  const [submitted, setSubmitted] = React.useState(false);

  function setField<K extends keyof TeamMemberDraft>(key: K, value: TeamMemberDraft[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (submitted) {
        setErrors(validateMemberDraft(next, { existing, editingId: member?.id }));
      }
      return next;
    });
  }

  function setScheduleField<K extends keyof ScheduleFormState>(
    key: K,
    value: ScheduleFormState[K],
  ) {
    setScheduleState((current) => {
      const next = { ...current, [key]: value };
      if (submitted && next.on) validateSchedule(next);
      return next;
    });
  }

  function validateSchedule(value: ScheduleFormState) {
    const errs = validateScheduleDraft({
      cadence: value.cadence,
      dayOfCycle: value.dayOfCycle,
      amount: value.amount,
      mint: mintForTokenId(value.tokenId),
      intervalSec: value.intervalSec,
      runsRemaining: value.runsRemaining,
    });
    setScheduleErrors(errs);
    return errs;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const memberErrors = validateMemberDraft(draft, {
      existing,
      editingId: member?.id,
    });
    const scheduleErrs = schedule.on ? validateSchedule(schedule) : {};
    setErrors(memberErrors);
    if (!schedule.on) setScheduleErrors({});
    if (hasErrors(memberErrors) || hasScheduleErrors(scheduleErrs)) return;

    let memberId: string | undefined;
    if (mode === "add") {
      memberId = addMember(solanaConfig.cluster, draft).id;
    } else if (member) {
      memberId = member.id;
      updateMember(solanaConfig.cluster, member.id, draft);
    }

    if (memberId) {
      if (schedule.on) {
        setSchedule(solanaConfig.cluster, memberId, {
          cadence: schedule.cadence,
          dayOfCycle: schedule.dayOfCycle,
          amount: schedule.amount,
          mint: mintForTokenId(schedule.tokenId),
          ...(schedule.cadence === "test"
            ? {
                intervalSec: schedule.intervalSec,
                runsRemaining: schedule.runsRemaining,
              }
            : null),
        });
      } else if (member?.schedule) {
        clearSchedule(solanaConfig.cluster, memberId);
      }
    }

    onClose();
  }

  return (
    <form className="grid gap-5" onSubmit={onSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" error={errors.name} required>
          <Input
            value={draft.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Ada Lovelace"
            autoComplete="name"
            invalid={Boolean(errors.name)}
          />
        </FormField>
        <FormField label="Wallet" error={errors.wallet} required>
          <Input
            value={draft.wallet}
            onChange={(e) => setField("wallet", e.target.value)}
            placeholder="Solana address"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            invalid={Boolean(errors.wallet)}
          />
        </FormField>
        <FormField label="Amount" error={errors.amount} required>
          <Input
            value={draft.amount}
            onChange={(e) => setField("amount", e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            className="font-mono"
            invalid={Boolean(errors.amount)}
          />
        </FormField>
        <FormField label="Token" error={errors.token}>
          <TokenPicker value={draft.token} onChange={(value) => setField("token", value)} />
        </FormField>
        <FormField label="Note" className="sm:col-span-2">
          <Input
            value={draft.note ?? ""}
            onChange={(e) => setField("note", e.target.value)}
            placeholder="Optional internal label"
            maxLength={140}
          />
        </FormField>
      </div>

      <ScheduleEditor
        state={schedule}
        errors={scheduleErrors}
        defaultAmount={draft.amount}
        defaultToken={draft.token}
        onToggle={(on) =>
          setScheduleState((current) => ({
            ...current,
            on,
            ...(on && !current.amount ? { amount: draft.amount, tokenId: draft.token } : null),
          }))
        }
        onSetField={setScheduleField}
      />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <FancyButton type="submit" variant="primary" size="md">
          {mode === "add" ? "Save member" : "Save changes"}
        </FancyButton>
      </DialogFooter>
    </form>
  );
}

function ScheduleEditor({
  state,
  errors,
  defaultAmount,
  defaultToken,
  onToggle,
  onSetField,
}: {
  state: ScheduleFormState;
  errors: ScheduleDraftErrors;
  defaultAmount: string;
  defaultToken: ShieldTokenId;
  onToggle: (on: boolean) => void;
  onSetField: <K extends keyof ScheduleFormState>(
    key: K,
    value: ScheduleFormState[K],
  ) => void;
}) {
  function onCadenceChange(next: ScheduleCadence) {
    onSetField("cadence", next);
    onSetField("dayOfCycle", defaultDayForCadence(next));
    if (next === "test") {
      onSetField("intervalSec", TEST_DEFAULTS.intervalSec);
      onSetField("runsRemaining", TEST_DEFAULTS.runsRemaining);
    }
  }

  return (
    <div className="rounded-lg border border-border/80 bg-secondary/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Recurring schedule</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {state.on
              ? describeSchedule({
                  cadence: state.cadence,
                  dayOfCycle: state.dayOfCycle,
                  amount: state.amount,
                  mint: mintForTokenId(state.tokenId),
                  intervalSec: state.intervalSec,
                  runsRemaining: state.runsRemaining,
                })
              : "Off. This member stays available for manual payments."}
          </p>
        </div>
        <Button
          type="button"
          variant={state.on ? "outline" : "secondary"}
          onClick={() => onToggle(!state.on)}
        >
          {state.on ? "Remove schedule" : "Add schedule"}
        </Button>
      </div>

      {state.on ? (
        <div className="mt-5 grid gap-4">
          <FieldStack>
            <Label>Cadence</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {CADENCES.map((cadence) => (
                <button
                  key={cadence.id}
                  type="button"
                  onClick={() => onCadenceChange(cadence.id)}
                  className={cn(
                    "h-10 rounded-lg border border-border/80 bg-background/40 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    state.cadence === cadence.id && "border-primary/40 bg-primary/12 text-primary",
                  )}
                >
                  {cadence.label}
                </button>
              ))}
            </div>
          </FieldStack>

          {(state.cadence === "weekly" || state.cadence === "biweekly") ? (
            <FormField label={state.cadence === "weekly" ? "Pay on" : "Every other"} error={errors.dayOfCycle}>
              <select
                value={state.dayOfCycle % 7}
                onChange={(e) => {
                  const dow = Number(e.target.value);
                  onSetField(
                    "dayOfCycle",
                    state.cadence === "weekly" ? dow : nextBiweeklyIndexForDow(dow),
                  );
                }}
                className="h-11 rounded-lg border border-border bg-secondary/30 px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {WEEKDAY_LABELS.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}

          {state.cadence === "monthly" ? (
            <FormField label="Day of month" error={errors.dayOfCycle}>
              <Input
                value={String(state.dayOfCycle)}
                onChange={(e) => onSetField("dayOfCycle", Number(e.target.value))}
                inputMode="numeric"
                pattern="[0-9]*"
                invalid={Boolean(errors.dayOfCycle)}
              />
            </FormField>
          ) : null}

          {state.cadence === "test" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Interval seconds" error={errors.intervalSec}>
                <Input
                  value={String(state.intervalSec)}
                  onChange={(e) => onSetField("intervalSec", Number(e.target.value))}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  invalid={Boolean(errors.intervalSec)}
                />
              </FormField>
              <FormField label="Total runs" error={errors.runsRemaining}>
                <Input
                  value={String(state.runsRemaining)}
                  onChange={(e) => onSetField("runsRemaining", Number(e.target.value))}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  invalid={Boolean(errors.runsRemaining)}
                />
              </FormField>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Scheduled amount" error={errors.amount} required>
              <Input
                value={state.amount}
                onChange={(e) => onSetField("amount", e.target.value)}
                placeholder={defaultAmount || "0.00"}
                inputMode="decimal"
                className="font-mono"
                invalid={Boolean(errors.amount)}
              />
            </FormField>
            <FormField label="Scheduled token" error={errors.mint}>
              <TokenPicker
                value={state.tokenId || defaultToken}
                onChange={(value) => onSetField("tokenId", value)}
              />
            </FormField>
          </div>

          {Object.values(errors).some(Boolean) ? (
            <InlineNotice tone="danger" title="Schedule needs attention">
              Fix the highlighted schedule fields before saving.
            </InlineNotice>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FormField({
  label,
  error,
  required,
  children,
  className,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const id = React.useId();
  return (
    <FieldStack className={className}>
      <Label htmlFor={id} required={required}>{label}</Label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string; "aria-invalid"?: string; "aria-describedby"?: string }>, {
            id,
            "aria-invalid": error ? "true" : undefined,
            "aria-describedby": error ? `${id}-error` : undefined,
          })
        : children}
      {error ? <p id={`${id}-error`} className="text-xs text-destructive">{error}</p> : null}
    </FieldStack>
  );
}

function TokenPicker({
  value,
  onChange,
}: {
  value: ShieldTokenId;
  onChange: (id: ShieldTokenId) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-secondary/30 p-1">
      {TOKEN_OPTIONS.map((token) => {
        const active = value === token.id;
        const supported = isShieldTokenSupported(token.id);
        return (
          <button
            key={token.id}
            type="button"
            disabled={!supported}
            title={supported ? token.label : `${token.label} unavailable on ${solanaConfig.cluster}`}
            onClick={() => onChange(token.id)}
            className={cn(
              "flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
              active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <token.Logo className="size-3.5" />
            {token.label}
          </button>
        );
      })}
    </div>
  );
}

function DeleteDialog({
  open,
  member,
  onClose,
}: {
  open: boolean;
  member?: TeamMember;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(value) => (value ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove member</DialogTitle>
          <DialogDescription>
            {member ? `${member.name} will be removed from this local registry. Past ledger rows remain.` : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (member) deleteMember(solanaConfig.cluster, member.id);
              onClose();
            }}
          >
            <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={2} aria-hidden="true" />
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TokenIcon({ id, className }: { id: ShieldTokenId; className?: string }) {
  switch (id) {
    case "SOL":
      return <SolanaLogo className={className} />;
    case "USDT":
      return <UsdtLogo className={className} />;
    case "USDC":
    default:
      return <UsdcLogo className={className} />;
  }
}

function mintForTokenId(id: ShieldTokenId): string {
  return getShieldToken(id)?.mint.toBase58() ?? "";
}

function defaultDayForCadence(cadence: ScheduleCadence): number {
  if (cadence === "daily" || cadence === "test") return 0;
  const now = new Date();
  if (cadence === "weekly") return now.getDay();
  if (cadence === "biweekly") return biweeklyIndex(now);
  return now.getDate();
}

function initialSchedule(
  member: TeamMember | undefined,
  draft: TeamMemberDraft,
): ScheduleFormState {
  if (member?.schedule) {
    const token = getShieldTokenByMint(member.schedule.mint);
    return {
      on: true,
      cadence: member.schedule.cadence,
      dayOfCycle: member.schedule.dayOfCycle,
      amount: member.schedule.amount,
      tokenId: token?.id ?? draft.token,
      intervalSec: member.schedule.intervalSec ?? TEST_DEFAULTS.intervalSec,
      runsRemaining: member.schedule.runsRemaining ?? TEST_DEFAULTS.runsRemaining,
    };
  }
  return {
    on: false,
    cadence: "monthly",
    dayOfCycle: defaultDayForCadence("monthly"),
    amount: "",
    tokenId: draft.token,
    intervalSec: TEST_DEFAULTS.intervalSec,
    runsRemaining: TEST_DEFAULTS.runsRemaining,
  };
}

function defaultToken(): ShieldTokenId {
  if (isShieldTokenSupported("USDC")) return "USDC";
  if (isShieldTokenSupported("USDT")) return "USDT";
  return "SOL";
}

function initialDraft(member?: TeamMember): TeamMemberDraft {
  if (member) {
    return {
      name: member.name,
      wallet: member.wallet,
      token: member.token,
      amount: member.amount,
      note: member.note ?? "",
    };
  }
  return {
    name: "",
    wallet: "",
    token: defaultToken(),
    amount: "",
    note: "",
  };
}

function shortAddr(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
