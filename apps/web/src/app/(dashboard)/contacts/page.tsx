import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CareRecipientsManager } from "@/components/care-recipients-manager";
import { ContactsManager } from "@/components/contacts-manager";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { syncPendingCareRecipientMemory } from "@/lib/care-recipient-memory";
import { listCareRecipients, listContacts } from "@/lib/contacts-db";

export default async function ContactsPage() {
  const session = await auth();
  const ownerEmail = session?.user?.email?.trim().toLowerCase();
  if (!ownerEmail) redirect("/");
  const recipients = listCareRecipients(ownerEmail);
  let memoryWarning: string | undefined;
  try {
    await syncPendingCareRecipientMemory(ownerEmail);
  } catch (error) {
    console.error("Could not synchronize care-recipient memory", error);
    memoryWarning = "Carely could not update agent memory. Your saved profiles are still safe; try again shortly.";
  }

  return (
    <>
      <DashboardPageHeader
        title="Contacts"
        description="Manage the people Carely supports and trusted contacts for family reference."
      />
      <div className="flex flex-col gap-10">
        <CareRecipientsManager initialRecipients={recipients} memoryWarning={memoryWarning} />
        <ContactsManager initialContacts={listContacts(ownerEmail)} />
      </div>
    </>
  );
}
