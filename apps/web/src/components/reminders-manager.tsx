// Manages the persisted reminders Carely will call about.
"use client";

import { useState, type FormEvent } from "react";
import { BellRing, Clock3, PhoneCall, Plus, Trash2 } from "lucide-react";

import { createReminder, deleteReminder } from "@/app/(dashboard)/reminders/actions";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CareRecipient, Contact } from "@/lib/contact";
import { TimePicker } from "@/components/time-picker";
import type { Reminder } from "@/lib/reminder";

export function RemindersManager({
  initialReminders,
  recipients,
  contacts,
  callingConfigured,
}: {
  initialReminders: Reminder[];
  recipients: CareRecipient[];
  contacts: Contact[];
  callingConfigured: boolean;
}) {
  const [reminders, setReminders] = useState(initialReminders);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("9:00 AM");
  const [context, setContext] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [timeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [listError, setListError] = useState("");

  async function addReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const result = await createReminder({ title, time, context, contactId: "", recipientId, timeZone });
    setSaving(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setReminders((current) => [...current, result.reminder]);
    setTitle("");
    setTime("9:00 AM");
    setContext("");
    setRecipientId("");
    setOpen(false);
  }

  async function removeReminder(reminderId: string) {
    setDeletingId(reminderId);
    setListError("");
    const result = await deleteReminder(reminderId);
    setDeletingId(null);

    if (!result.ok) {
      setListError(result.error);
      return;
    }

    setReminders((current) => current.filter(({ id }) => id !== reminderId));
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardPageHeader
        title="Reminders"
        description="Daily calls that help your family member stay on track."
        action={
          <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (nextOpen) setFormError("");
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus aria-hidden="true" />
                New reminder
              </Button>
            </DialogTrigger>
            <DialogContent className="gap-6 p-6 sm:max-w-lg sm:p-7">
              <DialogHeader>
                <DialogTitle className="text-2xl">Add a reminder</DialogTitle>
                <DialogDescription className="leading-6">
                  Carely will call at this time and explain the reminder in simple words.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={addReminder} className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium" htmlFor="reminder-title">
                  Reminder
                  <Input
                    id="reminder-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Evening medicine"
                    maxLength={160}
                    aria-invalid={formError ? true : undefined}
                    aria-describedby={formError ? "reminder-form-error" : undefined}
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium" htmlFor="reminder-time">
                  Call time
                  <TimePicker
                    id="reminder-time"
                    value={time}
                    onChange={setTime}
                    invalid={Boolean(formError)}
                    ariaDescribedBy={formError ? "reminder-form-error" : undefined}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium" htmlFor="reminder-context">
                  What should Carely say?
                  <textarea
                    id="reminder-context"
                    value={context}
                    onChange={(event) => setContext(event.target.value)}
                    placeholder="e.g. Take the blue medicine in the box."
                    maxLength={2000}
                    aria-invalid={formError ? true : undefined}
                    aria-describedby={formError ? "reminder-form-error" : undefined}
                    required
                    rows={3}
                    className="w-full resize-y rounded-lg border border-input bg-transparent px-3.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium" htmlFor="reminder-recipient">
                  Who should Carely call?
                  <select
                    id="reminder-recipient"
                    value={recipientId}
                    onChange={(event) => setRecipientId(event.target.value)}
                    required
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">Choose a family elder</option>
                    {recipients.map((recipient) => (
                      <option key={recipient.id} value={recipient.id}>
                        {recipient.name}{recipient.phone ? ` · ${recipient.phone}` : " · add a phone in Contacts"}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs font-normal text-muted-foreground">
                    This reminder repeats daily at {time} in your local time.
                  </span>
                </label>
                {formError && (
                  <p id="reminder-form-error" className="text-sm text-destructive" role="alert">
                    {formError}
                  </p>
                )}
                <Button type="submit" className="w-fit" disabled={saving}>
                  {saving ? "Adding…" : "Add reminder"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <section className="flex items-start gap-3 rounded-md border border-border bg-card p-4" aria-live="polite">
        <PhoneCall className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="grid gap-1 text-sm">
          <p className="font-medium">
            {callingConfigured ? "Automatic calls are connected." : "Automatic calls are not connected yet."}
          </p>
          <p className="leading-6 text-muted-foreground">
            {callingConfigured
              ? "Carely will call each selected contact at the saved time."
              : "Reminders save now. Add Twilio settings and a phone number in Contacts before placing calls."}
          </p>
        </div>
      </section>

      <section aria-labelledby="configured-reminders-title">
        <h2 id="configured-reminders-title" className="sr-only">Configured reminders</h2>
        {listError && <p className="mt-3 text-sm text-destructive" role="alert">{listError}</p>}
        <ul className="grid gap-2" aria-label="Configured reminders">
          {reminders.map((reminder) => (
            <li
              key={reminder.id}
              className="flex items-start gap-3 border-b border-border py-4 last:border-b-0"
            >
              <BellRing className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-medium">{reminder.title}</p>
                  <span className="rounded-sm border border-border px-1.5 py-0.5 text-[11px] leading-4 text-muted-foreground">
                    Added by {reminder.createdBy}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock3 className="size-4" aria-hidden="true" />
                  {reminder.time}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{reminder.context}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {recipients.find(({ id }) => id === reminder.recipientId)?.name
                    ?? contacts.find(({ id }) => id === reminder.contactId)?.name
                    ?? "No call target selected"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${reminder.title}`}
                disabled={deletingId === reminder.id}
                onClick={() => removeReminder(reminder.id)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
