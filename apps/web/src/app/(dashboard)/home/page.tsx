import { Plus } from "lucide-react";

import { CareStats } from "@/components/care-stats";
import { ConversationLog } from "@/components/conversation-log";
import { TutorialsCard } from "@/components/tutorials-card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-[calc(100svh-3.5rem)] items-start justify-center p-6 sm:p-10">
      <div className="w-full max-w-5xl space-y-4">
        <div className="flex justify-end">
          <Button>
            <Plus aria-hidden="true" />
            New
          </Button>
        </div>
        <TutorialsCard />
        <CareStats />
        <ConversationLog />
      </div>
    </main>
  );
}
