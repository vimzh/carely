// Individual family contact card with inline phone and emergency-hour setup.
"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, CircleCheck, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type Contact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  emergencyFrom: string;
  emergencyUntil: string;
};

export function ContactCard({
  contact,
  onUpdate,
}: {
  contact: Contact;
  onUpdate: (contactId: string, updates: Partial<Contact>) => void;
}) {
  const [editingNumber, setEditingNumber] = useState(false);
  const [numberDraft, setNumberDraft] = useState("");
  const [editingAvailability, setEditingAvailability] = useState(false);
  const [availabilityFromDraft, setAvailabilityFromDraft] = useState("");
  const [availabilityUntilDraft, setAvailabilityUntilDraft] = useState("");
  const hasPhone = contact.phone.length > 0;
  const hasAvailability = Boolean(contact.emergencyFrom && contact.emergencyUntil);
  const configured = hasPhone && hasAvailability;

  function saveNumber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onUpdate(contact.id, { phone: numberDraft.trim() });
    setEditingNumber(false);
    setNumberDraft("");
  }

  function saveAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onUpdate(contact.id, {
      emergencyFrom: availabilityFromDraft,
      emergencyUntil: availabilityUntilDraft,
    });
    setEditingAvailability(false);
    setAvailabilityFromDraft("");
    setAvailabilityUntilDraft("");
  }

  return (
    <Card className="rounded-md shadow-none">
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
              value={numberDraft}
              onChange={(event) => setNumberDraft(event.target.value)}
              placeholder="Phone number"
              className="h-8 w-36"
              required
            />
            <Button type="submit" size="sm">Save</Button>
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
              value={availabilityFromDraft}
              onChange={(event) => setAvailabilityFromDraft(event.target.value)}
              className="h-8 w-36"
              required
            />
            <Input
              aria-label={`Emergency end time for ${contact.name}`}
              type="time"
              value={availabilityUntilDraft}
              onChange={(event) => setAvailabilityUntilDraft(event.target.value)}
              className="h-8 w-36"
              required
            />
            <Button type="submit" size="sm">Save</Button>
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
      </CardContent>
    </Card>
  );
}
