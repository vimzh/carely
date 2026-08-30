// Family contact setup form and a small emergency contact list.
"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

import {
  createContact,
  deleteContact as removeContact,
  updateContact as saveContact,
} from "@/app/(dashboard)/contacts/actions";
import { ContactCard } from "@/components/contact-card";
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
import type { Contact, ContactInput } from "@/lib/contact";

export function ContactsManager({ initialContacts }: { initialContacts: Contact[] }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyFrom, setEmergencyFrom] = useState("");
  const [emergencyUntil, setEmergencyUntil] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const result = await createContact({ name, relationship, phone, emergencyFrom, emergencyUntil });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setContacts((current) => [...current, result.contact]);
    setName("");
    setRelationship("");
    setPhone("");
    setEmergencyFrom("");
    setEmergencyUntil("");
    setOpen(false);
  }

  async function updateContact(contactId: string, updates: Partial<ContactInput>) {
    const result = await saveContact(contactId, updates);
    if (!result.ok) return result.error;
    setContacts((current) => current.map((contact) => (contact.id === contactId ? result.contact : contact)));
    return null;
  }

  async function deleteContact(contactId: string) {
    const result = await removeContact(contactId);
    if (!result.ok) return result.error;
    setContacts((current) => current.filter((contact) => contact.id !== contactId));
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <section aria-labelledby="helpers-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="helpers-title" className="text-2xl font-semibold tracking-tight">
              Can provide help
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Family members Carely may call for help in an emergency.
            </p>
          </div>
          <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setError(""); }}>
            <DialogTrigger asChild>
              <Button className="shrink-0">
                <Plus aria-hidden="true" />
                Add helper
              </Button>
            </DialogTrigger>
            <DialogContent className="gap-6 p-6 sm:max-w-lg sm:p-7">
              <DialogHeader>
                <DialogTitle className="text-2xl">Add someone who can help</DialogTitle>
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
                      name="name"
                      autoComplete="name"
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
                      name="relationship"
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
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
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
                        name="emergencyFrom"
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
                        name="emergencyUntil"
                        type="time"
                        value={emergencyUntil}
                        onChange={(event) => setEmergencyUntil(event.target.value)}
                        required
                      />
                    </label>
                  </div>
                </fieldset>
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                <Button type="submit" className="w-fit" disabled={saving}>
                  {saving ? "Adding helper…" : "Add helper"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <ul className="mt-4 grid gap-2" aria-label="People who can provide help">
          {contacts.map((contact) => (
            <li key={contact.id}>
              <ContactCard contact={contact} onUpdate={updateContact} onDelete={deleteContact} />
            </li>
          ))}
        </ul>
        {contacts.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">No emergency contacts added yet.</p>
        )}
      </section>
    </div>
  );
}
