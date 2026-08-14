// Session-only reminder setup for the family member Carely will call.
"use client";

import { useState, type FormEvent } from "react";
import { BellRing, Clock3, Plus, Trash2 } from "lucide-react";

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

type Reminder = {
  id: string;
  title: string;
  time: string;
  context: string;
};

const initialReminders: Reminder[] = [
  {
    id: "morning-medicine",
    title: "Morning medicine",
    time: "09:00",
    context: "Take the blue medicine in the box, then take the small white medicine beside it.",
  },
];

export function RemindersManager() {
  const [reminders, setReminders] = useState(initialReminders);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [context, setContext] = useState("");

  function addReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReminders((current) => [
      ...current,
      {
        id: `${title}-${time}-${Date.now()}`,
        title: title.trim(),
        time,
        context: context.trim(),
      },
    ]);
    setTitle("");
    setTime("");
    setContext("");
    setOpen(false);
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus aria-hidden="true" />
              New Reminders
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
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium" htmlFor="reminder-time">
                Call time
                <Input
                  id="reminder-time"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium" htmlFor="reminder-context">
                What should Carely say?
                <textarea
                  id="reminder-context"
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="e.g. Take the blue medicine in the box."
                  required
                  rows={3}
                  className="w-full resize-y rounded-lg border border-input bg-transparent px-3.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                />
              </label>
              <Button type="submit" className="w-fit">
                Add reminder
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <section aria-labelledby="configured-reminders-title">
        <h2 id="configured-reminders-title" className="text-2xl font-semibold tracking-tight">
          Reminders
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Calls Carely will make for your family member.
        </p>
        <ul className="mt-4 grid gap-2" aria-label="Configured reminders">
          {reminders.map((reminder) => (
            <li
              key={reminder.id}
              className="flex items-start gap-3 border-b border-border py-4 last:border-b-0"
            >
              <BellRing className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-medium">{reminder.title}</p>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock3 className="size-4" aria-hidden="true" />
                  {reminder.time}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{reminder.context}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${reminder.title}`}
                onClick={() => setReminders((current) => current.filter(({ id }) => id !== reminder.id))}
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
