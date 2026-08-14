import { RemindersManager } from "@/components/reminders-manager";

export default function RemindersPage() {
  return (
    <main className="flex min-h-[calc(100svh-3.5rem)] items-start justify-center p-6 sm:p-10">
      <RemindersManager />
    </main>
  );
}
