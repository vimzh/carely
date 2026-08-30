// Individual family contact card with inline phone and emergency-hour setup.
"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, Phone, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Contact, ContactInput } from "@/lib/contact";

export function ContactCard({
  contact,
  onUpdate,
  onDelete,
}: {
  contact: Contact;
  onUpdate: (contactId: string, updates: Partial<ContactInput>) => Promise<string | null>;
  onDelete: (contactId: string) => Promise<string | null>;
}) {
  const [editingNumber, setEditingNumber] = useState(false);
  const [numberDraft, setNumberDraft] = useState("");
  const [editingAvailability, setEditingAvailability] = useState(false);
  const [availabilityFromDraft, setAvailabilityFromDraft] = useState("");
  const [availabilityUntilDraft, setAvailabilityUntilDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const hasPhone = contact.phone.length > 0;
  const hasAvailability = Boolean(contact.emergencyFrom && contact.emergencyUntil);
  const configured = hasPhone && hasAvailability;

  async function saveNumber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const nextError = await onUpdate(contact.id, { phone: numberDraft });
    setSaving(false);
    if (nextError) {
      setError(nextError);
      return;
    }
    setEditingNumber(false);
    setNumberDraft("");
  }

  async function saveAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const nextError = await onUpdate(contact.id, {
      emergencyFrom: availabilityFromDraft,
      emergencyUntil: availabilityUntilDraft,
    });
    setSaving(false);
    if (nextError) {
      setError(nextError);
      return;
    }
    setEditingAvailability(false);
    setAvailabilityFromDraft("");
    setAvailabilityUntilDraft("");
  }

  async function deleteContact() {
    setDeleting(true);
    setDeleteError("");
    const nextError = await onDelete(contact.id);
    setDeleting(false);
    if (nextError) {
      setDeleteError(nextError);
      return;
    }
    setDeleteOpen(false);
  }

  return (
    <Card className="rounded-md py-0 shadow-none">
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        {configured ? (
          <CircleCheck className="size-5 shrink-0 text-foreground" aria-hidden="true" />
        ) : (
          <CircleAlert className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{contact.name}</p>
          <p className="truncate text-xs text-muted-foreground">{contact.relationship}</p>
        </div>
        {hasPhone ? (
          <a
            href={`tel:${contact.phone}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Phone className="size-3.5" aria-hidden="true" />
            <span>{contact.phone}</span>
          </a>
        ) : editingNumber ? (
          <form onSubmit={saveNumber} className="flex items-center gap-2">
            <Input
              aria-label={`Phone number for ${contact.name}`}
              type="tel"
              name="phone"
              inputMode="tel"
              autoComplete="tel"
              value={numberDraft}
              onChange={(event) => setNumberDraft(event.target.value)}
              placeholder="Phone number"
              className="h-8 w-36"
              required
            />
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <><LoaderCircle className="animate-spin" aria-hidden="true" /> Saving</> : "Save"}
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0 text-muted-foreground"
            onClick={() => {
              setEditingNumber(true);
              setNumberDraft("");
            }}
          >
            Add number
          </Button>
        )}
        {hasPhone && (editingAvailability ? (
          <form onSubmit={saveAvailability} className="flex items-center gap-2">
            <Input
              aria-label={`Emergency start time for ${contact.name}`}
              type="time"
              name="emergencyFrom"
              value={availabilityFromDraft}
              onChange={(event) => setAvailabilityFromDraft(event.target.value)}
              className="h-8 w-36"
              required
            />
            <Input
              aria-label={`Emergency end time for ${contact.name}`}
              type="time"
              name="emergencyUntil"
              value={availabilityUntilDraft}
              onChange={(event) => setAvailabilityUntilDraft(event.target.value)}
              className="h-8 w-36"
              required
            />
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <><LoaderCircle className="animate-spin" aria-hidden="true" /> Saving</> : "Save"}
            </Button>
          </form>
        ) : hasAvailability ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0 text-xs text-muted-foreground"
            onClick={() => {
              setEditingAvailability(true);
              setAvailabilityFromDraft(contact.emergencyFrom);
              setAvailabilityUntilDraft(contact.emergencyUntil);
            }}
          >
            Emergency: {contact.emergencyFrom}–{contact.emergencyUntil}
          </Button>
        ) : (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0 text-muted-foreground"
            onClick={() => {
              setEditingAvailability(true);
              setAvailabilityFromDraft("");
              setAvailabilityUntilDraft("");
            }}
          >
            Set emergency hours
          </Button>
        ))}
        <Dialog
          open={deleteOpen}
          onOpenChange={(nextOpen) => {
            setDeleteOpen(nextOpen);
            if (!nextOpen) setDeleteError("");
          }}
        >
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="text-muted-foreground hover:text-destructive"
              aria-label={`Delete ${contact.name}`}
              title={`Delete ${contact.name}`}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {contact.name}?</DialogTitle>
              <DialogDescription>
                {contact.name} will be removed from the family&apos;s trusted contacts. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {deleteError && <p className="text-sm text-destructive" role="alert">{deleteError}</p>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={deleting}>Cancel</Button>
              </DialogClose>
              <Button type="button" variant="destructive" onClick={deleteContact} disabled={deleting}>
                {deleting ? <><LoaderCircle className="animate-spin" aria-hidden="true" /> Deleting…</> : "Delete contact"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {error && <p className="w-full text-sm text-destructive" role="alert">{error}</p>}
      </CardContent>
    </Card>
  );
}
