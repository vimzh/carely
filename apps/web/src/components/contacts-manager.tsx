// Family contact setup form and a small emergency contact list.
"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, CircleCheck, Phone, Plus } from "lucide-react";

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

type Contact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  emergencyFrom: string;
  emergencyUntil: string;
};

const initialContacts: Contact[] = [
  {
    id: "vansh",
    name: "Vansh",
    relationship: "Primary contact",
    phone: "7982538137",
    emergencyFrom: "09:00",
    emergencyUntil: "21:00",
  },
  {
    id: "mom",
    name: "Mom",
    relationship: "Parent",
    phone: "",
    emergencyFrom: "",
    emergencyUntil: "",
  },
  {
    id: "uncle-raj",
    name: "Uncle Raj",
    relationship: "Family",
    phone: "",
    emergencyFrom: "",
    emergencyUntil: "",
  },
];

export function ContactsManager() {
  const [contacts, setContacts] = useState(initialContacts);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyFrom, setEmergencyFrom] = useState("");
  const [emergencyUntil, setEmergencyUntil] = useState("");
  const [editingNumberId, setEditingNumberId] = useState<string | null>(null);
  const [numberDraft, setNumberDraft] = useState("");
  const [editingAvailabilityId, setEditingAvailabilityId] = useState<string | null>(null);
  const [availabilityFromDraft, setAvailabilityFromDraft] = useState("");
  const [availabilityUntilDraft, setAvailabilityUntilDraft] = useState("");
  const [open, setOpen] = useState(false);

  function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContacts((current) => [
      ...current,
      {
        id: `${name}-${phone}`,
        name: name.trim(),
        relationship: relationship.trim() || "Family",
        phone: phone.trim(),
        emergencyFrom,
        emergencyUntil,
      },
    ]);
    setName("");
    setRelationship("");
    setPhone("");
    setEmergencyFrom("");
    setEmergencyUntil("");
    setOpen(false);
  }

  function saveNumber(event: FormEvent<HTMLFormElement>, contactId: string) {
    event.preventDefault();
    setContacts((current) =>
      current.map((contact) =>
        contact.id === contactId ? { ...contact, phone: numberDraft.trim() } : contact,
      ),
    );
    setEditingNumberId(null);
    setNumberDraft("");
  }

  function saveAvailability(event: FormEvent<HTMLFormElement>, contactId: string) {
    event.preventDefault();
    setContacts((current) =>
      current.map((contact) =>
        contact.id === contactId
          ? {
              ...contact,
              emergencyFrom: availabilityFromDraft,
              emergencyUntil: availabilityUntilDraft,
            }
          : contact,
      ),
    );
    setEditingAvailabilityId(null);
    setAvailabilityFromDraft("");
    setAvailabilityUntilDraft("");
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <section aria-labelledby="family-contacts-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="family-contacts-title" className="text-2xl font-semibold tracking-tight">
              Family contacts
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              People Carely can call when they are configured.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0">
                <Plus aria-hidden="true" />
                Add contact
              </Button>
            </DialogTrigger>
            <DialogContent className="gap-6 p-6 sm:max-w-lg sm:p-7">
              <DialogHeader>
                <DialogTitle className="text-2xl">Add a family contact</DialogTitle>
                <DialogDescription className="leading-6">
                  Carely can reach these people in an emergency during the hours you choose.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={addContact} className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium" htmlFor="contact-name">
                    Name
                    <Input
                      id="contact-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="e.g. Vansh"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium" htmlFor="contact-relationship">
                    Relationship
                    <Input
                      id="contact-relationship"
                      value={relationship}
                      onChange={(event) => setRelationship(event.target.value)}
                      placeholder="e.g. Son"
                    />
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-medium" htmlFor="contact-phone">
                  Phone number
                  <Input
                    id="contact-phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="e.g. 7982538137"
                    required
                  />
                </label>
                <fieldset className="grid gap-2">
                  <legend className="text-sm font-medium">Emergency calling hours</legend>
                  <p className="text-xs text-muted-foreground">
                    Choose when Carely may call this person in an emergency.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium" htmlFor="contact-emergency-from">
                      From
                      <Input
                        id="contact-emergency-from"
                        type="time"
                        value={emergencyFrom}
                        onChange={(event) => setEmergencyFrom(event.target.value)}
                        required
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium" htmlFor="contact-emergency-until">
                      Until
                      <Input
                        id="contact-emergency-until"
                        type="time"
                        value={emergencyUntil}
                        onChange={(event) => setEmergencyUntil(event.target.value)}
                        required
                      />
                    </label>
                  </div>
                </fieldset>
                <Button type="submit" className="w-fit">
                  Add contact
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <ul className="mt-4 grid gap-2" aria-label="Configured family contacts">
          {contacts.map((contact) => {
            const hasPhone = contact.phone.length > 0;
            const hasAvailability = Boolean(contact.emergencyFrom && contact.emergencyUntil);
            const configured = hasPhone && hasAvailability;
            const editingNumber = editingNumberId === contact.id;
            const editingAvailability = editingAvailabilityId === contact.id;
            return (
              <li
                key={contact.id}
                className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-b-0"
              >
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
                  <form
                    onSubmit={(event) => saveNumber(event, contact.id)}
                    className="flex items-center gap-2"
                  >
                    <Input
                      aria-label={`Phone number for ${contact.name}`}
                      type="tel"
                      value={numberDraft}
                      onChange={(event) => setNumberDraft(event.target.value)}
                      placeholder="Phone number"
                      className="h-8 w-36"
                      required
                    />
                    <Button type="submit" size="sm">
                      Save
                    </Button>
                  </form>
                ) : (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto px-0 text-muted-foreground"
                    onClick={() => {
                      setEditingNumberId(contact.id);
                      setNumberDraft("");
                    }}
                  >
                    Add number
                  </Button>
                )}
                {hasPhone && (editingAvailability ? (
                  <form
                    onSubmit={(event) => saveAvailability(event, contact.id)}
                    className="flex items-center gap-2"
                  >
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
                    <Button type="submit" size="sm">
                      Save
                    </Button>
                  </form>
                ) : hasAvailability ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto px-0 text-xs text-muted-foreground"
                    onClick={() => {
                      setEditingAvailabilityId(contact.id);
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
                      setEditingAvailabilityId(contact.id);
                      setAvailabilityFromDraft("");
                      setAvailabilityUntilDraft("");
                    }}
                  >
                    Set emergency hours
                  </Button>
                ))}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
