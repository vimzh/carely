// Plain-language call summaries for the family dashboard.
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const conversations = [
  {
    time: "Today · 9:00 AM",
    topic: "Morning medicine",
    summary: "Asked which medicine to take first; the blue box was explained.",
  },
  {
    time: "Yesterday · 8:30 PM",
    topic: "TV instructions",
    summary: "Needed help switching back to the regular TV channel.",
  },
  {
    time: "Monday · 11:15 AM",
    topic: "Family question",
    summary: "Asked when the next family visit is planned.",
  },
];

export function ConversationLog() {
  return (
    <section aria-labelledby="conversation-log-title" className="border-t border-border pt-6">
      <h2 id="conversation-log-title" className="text-2xl font-semibold tracking-tight">
        Conversation log
      </h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        A short summary of what your family elder asked about and where they needed help.
      </p>
      <div className="mt-4 rounded-md border">
        <Table className="min-w-[38rem]">
          <TableCaption className="sr-only">Recent Carely conversation summaries</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversations.map((conversation) => (
              <TableRow key={`${conversation.time}-${conversation.topic}`}>
                <TableCell className="align-top text-muted-foreground">{conversation.time}</TableCell>
                <TableCell className="align-top font-medium">{conversation.topic}</TableCell>
                <TableCell className="whitespace-normal align-top leading-6 text-muted-foreground">
                  {conversation.summary}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
