// Manages the people receiving care and their personalized profiles.
"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

import {
  createCareRecipient,
  updateCareRecipient,
} from "@/app/(dashboard)/contacts/actions";
import { CareRecipientCard } from "@/components/care-recipient-card";
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
import type { CareRecipient, CareRecipientInput } from "@/lib/contact";

export function CareRecipientsManager({
  initialRecipients,
  memoryWarning,
}: {
  initialRecipients: CareRecipient[];
  memoryWarning?: string;
}) {
  const [recipients, setRecipients] = useState(initialRecipients);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function addRecipient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const result = await createCareRecipient({
      name,
      relationship,
      phone,
      address: "",
      latitude: null,
      longitude: null,
      likes: "",
      dislikes: "",
      instructions: "",
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRecipients((current) => [...current, result.recipient]);
    setName("");
    setRelationship("");
    setPhone("");
    setOpen(false);
  }

  async function saveRecipient(recipientId: string, input: CareRecipientInput) {
    const result = await updateCareRecipient(recipientId, input);
    if (!result.ok) return result.error;
    setRecipients((current) => current.map((recipient) => (
      recipient.id === recipientId ? result.recipient : recipient
    )));
    return null;
  }

  return (
    <section aria-labelledby="care-recipients-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="care-recipients-title" className="text-2xl font-semibold tracking-tight">
            Care is for
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            The parents or grandparents Carely should know personally.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) setError("");
          }}
        >
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus aria-hidden="true" />
              Add person
            </Button>
          </DialogTrigger>
          <DialogContent className="gap-6 p-6 sm:max-w-lg sm:p-7">
            <DialogHeader>
              <DialogTitle className="text-2xl">Add someone Carely supports</DialogTitle>
              <DialogDescription className="leading-6">
                You can add their preferences and personal instructions after creating the profile.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={addRecipient} className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium" htmlFor="care-recipient-name">
                Name
                <Input
                  id="care-recipient-name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Dadaji"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium" htmlFor="care-recipient-relationship">
                Relationship
                <Input
                  id="care-recipient-relationship"
                  name="relationship"
                  value={relationship}
                  onChange={(event) => setRelationship(event.target.value)}
                  placeholder="e.g. Grandfather"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium" htmlFor="care-recipient-phone">
                <span>Phone number <span className="font-normal text-muted-foreground">(optional)</span></span>
                <Input
                  id="care-recipient-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="e.g. +91 98765 43210"
                />
              </label>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <Button type="submit" className="w-fit" disabled={saving}>
                {saving ? "Adding person…" : "Add person"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {memoryWarning && (
        <p className="mt-3 text-sm text-amber-700" role="status">
          {memoryWarning}
        </p>
      )}
      <ul className="mt-4 grid gap-2" aria-label="People receiving care">
        {recipients.map((recipient) => (
          <li key={recipient.id}>
            <CareRecipientCard recipient={recipient} onUpdate={saveRecipient} />
          </li>
        ))}
      </ul>
    </section>
  );
}
