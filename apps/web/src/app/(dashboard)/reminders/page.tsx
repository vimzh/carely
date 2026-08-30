import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RemindersManager } from "@/components/reminders-manager";
import { listCareRecipients, listContacts } from "@/lib/contacts-db";
import { listReminders } from "@/lib/reminders-db";
import { isReminderCallingConfigured } from "@/lib/reminder-scheduler";

export default async function RemindersPage() {
  const session = await auth();
  const ownerEmail = session?.user?.email?.trim().toLowerCase();
  if (!ownerEmail) redirect("/");

  return (
    <RemindersManager
      initialReminders={listReminders(ownerEmail)}
      recipients={listCareRecipients(ownerEmail)}
      contacts={listContacts(ownerEmail)}
      callingConfigured={isReminderCallingConfigured()}
    />
  );
}
