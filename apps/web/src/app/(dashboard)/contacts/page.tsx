import { ContactsManager } from "@/components/contacts-manager";

export default function ContactsPage() {
  return (
    <main className="flex min-h-[calc(100svh-3.5rem)] items-start justify-center p-6 sm:p-10">
      <ContactsManager />
    </main>
  );
}
