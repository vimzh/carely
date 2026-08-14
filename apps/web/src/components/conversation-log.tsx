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
    experience: "Helpful",
  },
  {
    time: "Yesterday · 8:30 PM",
    topic: "TV instructions",
    summary: "Needed help switching back to the regular TV channel.",
    experience: "Needs follow-up",
  },
  {
    time: "Monday · 11:15 AM",
    topic: "Family question",
    summary: "Asked when the next family visit is planned.",
    experience: "Helpful",
  },
  {
    time: "Sunday · 7:45 PM",
    topic: "Evening medicine",
    summary: "Needed a second explanation of the small white tablet.",
    experience: "Needs follow-up",
  },
  {
    time: "Saturday · 10:00 AM",
    topic: "Weather",
    summary: "Asked whether it was safe to go for a walk outside.",
    experience: "Helpful",
  },
  {
    time: "Friday · 6:20 PM",
    topic: "Phone help",
    summary: "Asked how to turn the ringer back on after missing a call.",
    experience: "Helpful",
  },
  {
    time: "Thursday · 8:10 AM",
    topic: "Appointment reminder",
    summary: "Asked for the clinic address and appointment time again.",
    experience: "Needs follow-up",
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
              <TableHead className="text-right">Experience</TableHead>
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
                <TableCell className="text-right align-top">
                  <span className="inline-flex rounded-full border border-border px-2.5 py-1 text-xs font-medium">
                    {conversation.experience}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
