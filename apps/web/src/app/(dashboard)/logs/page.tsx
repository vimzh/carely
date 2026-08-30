// Full-page conversation history with expandable call details.
import { ConversationLog } from "@/components/conversation-log";
import { auth } from "@/auth";
import { listConversationLogs } from "@/lib/conversations-db";

export default async function LogsPage() {
  const session = await auth();
  const ownerEmail = session?.user?.email?.trim().toLowerCase() ?? session?.user?.name ?? "carely-user";
  const conversations = listConversationLogs(ownerEmail);
  return <ConversationLog fullPage conversations={conversations} />;
}
