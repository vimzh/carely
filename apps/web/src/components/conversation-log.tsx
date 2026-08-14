// Plain-language call summaries for the family dashboard.
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
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[38rem] text-left text-sm">
          <caption className="sr-only">Recent Carely conversation summaries</caption>
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th scope="col" className="pb-3 pr-6 font-medium">Time</th>
              <th scope="col" className="pb-3 pr-6 font-medium">Topic</th>
              <th scope="col" className="pb-3 font-medium">Summary</th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((conversation) => (
              <tr key={`${conversation.time}-${conversation.topic}`} className="border-b border-border last:border-b-0">
                <td className="py-4 pr-6 align-top text-muted-foreground">{conversation.time}</td>
                <th scope="row" className="py-4 pr-6 align-top font-medium">{conversation.topic}</th>
                <td className="py-4 align-top leading-6 text-muted-foreground">{conversation.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
