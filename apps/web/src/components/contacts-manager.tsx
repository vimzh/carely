// Family contact setup form and a small emergency contact list.
"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { ContactCard, type Contact } from "@/components/contact-card";
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

  function updateContact(contactId: string, updates: Partial<Contact>) {
    setContacts((current) =>
      current.map((contact) => (contact.id === contactId ? { ...contact, ...updates } : contact)),
    );
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
          {contacts.map((contact) => (
            <li key={contact.id}>
              <ContactCard contact={contact} onUpdate={updateContact} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
