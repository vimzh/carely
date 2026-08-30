// Clickable care-recipient profile with personalized context for Carely.
"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ChevronRight, LoaderCircle, UserRound } from "lucide-react";

import { LocationPicker } from "@/components/location-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CareRecipient, CareRecipientInput } from "@/lib/contact";

const placesEnabled = process.env.NEXT_PUBLIC_CARELY_PLACES_ENABLED === "true";

function profileInput(recipient: CareRecipient): CareRecipientInput {
  return {
    name: recipient.name,
    relationship: recipient.relationship,
    phone: recipient.phone,
    address: recipient.address,
    latitude: recipient.latitude,
    longitude: recipient.longitude,
    likes: recipient.likes,
    dislikes: recipient.dislikes,
    instructions: recipient.instructions,
  };
}

export function CareRecipientCard({
  recipient,
  onUpdate,
}: {
  recipient: CareRecipient;
  onUpdate: (recipientId: string, input: CareRecipientInput) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CareRecipientInput>(profileInput(recipient));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const personalized = Boolean(recipient.address || recipient.likes || recipient.dislikes || recipient.instructions);

  function change(field: keyof CareRecipientInput, value: CareRecipientInput[typeof field]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const nextError = await onUpdate(recipient.id, draft);
    setSaving(false);
    if (nextError) {
      setError(nextError);
      return;
    }
    setOpen(false);
  }

  function saveWithShortcut(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        setError("");
        if (nextOpen) setDraft(profileInput(recipient));
      }}
    >
      <Card className="rounded-md py-0 shadow-none">
        <DialogTrigger asChild>
          <button
            type="button"
            className="flex min-h-20 w-full items-center gap-3 rounded-md p-4 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
              <UserRound className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{recipient.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {recipient.relationship}{recipient.phone ? ` · ${recipient.phone}` : ""}
              </span>
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {personalized ? "Preferences saved" : "Add preferences"}
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </DialogTrigger>
      </Card>
      <DialogContent className="max-h-[90svh] gap-6 overflow-y-auto p-6 sm:max-w-xl sm:p-7">
        <DialogHeader>
          <DialogTitle className="text-2xl">Personalize help for {recipient.name}</DialogTitle>
          <DialogDescription className="leading-6">
            Add the details Carely should remember when speaking with them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} onKeyDown={saveWithShortcut} className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium" htmlFor={`recipient-name-${recipient.id}`}>
            Name
            <Input
              id={`recipient-name-${recipient.id}`}
              name="name"
              autoComplete="name"
              value={draft.name}
              onChange={(event) => change("name", event.target.value)}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium" htmlFor={`recipient-relationship-${recipient.id}`}>
            Relationship
            <Input
              id={`recipient-relationship-${recipient.id}`}
              name="relationship"
              value={draft.relationship}
              onChange={(event) => change("relationship", event.target.value)}
              placeholder="e.g. Grandfather"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium" htmlFor={`recipient-phone-${recipient.id}`}>
            <span>Phone number <span className="font-normal text-muted-foreground">(optional)</span></span>
            <Input
              id={`recipient-phone-${recipient.id}`}
              name="phone"
              type="tel"
              autoComplete="tel"
              value={draft.phone}
              onChange={(event) => change("phone", event.target.value)}
              placeholder="e.g. +91 98765 43210"
            />
          </label>
          {placesEnabled && (
            <LocationPicker
              value={{ address: draft.address, latitude: draft.latitude, longitude: draft.longitude }}
              onChange={(location) => {
                setDraft((current) => ({ ...current, ...location }));
                setError("");
              }}
            />
          )}
          <label className="grid gap-2 text-sm font-medium" htmlFor={`recipient-likes-${recipient.id}`}>
            <span>What they like <span className="font-normal text-muted-foreground">(optional)</span></span>
            <Textarea
              id={`recipient-likes-${recipient.id}`}
              name="likes"
              value={draft.likes}
              onChange={(event) => change("likes", event.target.value)}
              placeholder="Tea after breakfast, cricket, Hindi films…"
              className="min-h-24 resize-y"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium" htmlFor={`recipient-dislikes-${recipient.id}`}>
            <span>What they do not like <span className="font-normal text-muted-foreground">(optional)</span></span>
            <Textarea
              id={`recipient-dislikes-${recipient.id}`}
              name="dislikes"
              value={draft.dislikes}
              onChange={(event) => change("dislikes", event.target.value)}
              placeholder="Being rushed, loud instructions…"
              className="min-h-24 resize-y"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium" htmlFor={`recipient-instructions-${recipient.id}`}>
            <span>Instructions for Carely <span className="font-normal text-muted-foreground">(optional)</span></span>
            <Textarea
              id={`recipient-instructions-${recipient.id}`}
              name="instructions"
              value={draft.instructions}
              onChange={(event) => change("instructions", event.target.value)}
              placeholder="Speak slowly in Hindi. Repeat medicine names when asked…"
              className="min-h-28 resize-y"
            />
          </label>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="w-fit" disabled={saving}>
            {saving ? (
              <><LoaderCircle className="animate-spin" aria-hidden="true" /> Saving profile…</>
            ) : "Save profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
