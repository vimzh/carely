import { auth } from "@/auth";
import { CareStats } from "@/components/care-stats";
import { ConversationLog } from "@/components/conversation-log";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { TutorialsCard } from "@/components/tutorials-card";
import { getCareStats } from "@/lib/calls-db";
import { listConversationLogs } from "@/lib/conversations-db";

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.email ?? session?.user?.name ?? "carely-user";
  const ownerEmail = session?.user?.email?.trim().toLowerCase() ?? userId;
  const stats = getCareStats(ownerEmail);
  const conversations = listConversationLogs(ownerEmail, 7);

  return (
    <>
      <DashboardPageHeader
        title="Home"
        description="Your family’s Carely activity and setup at a glance."
      />
      <div className="space-y-4">
        <TutorialsCard userId={userId} />
        <CareStats {...stats} />
        <ConversationLog conversations={conversations} />
      </div>
    </>
  );
}
