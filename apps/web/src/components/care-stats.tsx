// Simple family-facing activity totals for the home page.
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  { label: "Calls answered", value: "0" },
  { label: "Minutes talked", value: "0 min" },
];

export function CareStats() {
  return (
    <div className="grid w-full gap-4 sm:grid-cols-2" aria-label="Carely activity">
      {stats.map(({ label, value }) => (
        <Card key={label} className="rounded-md shadow-none">
          <CardContent className="p-5">
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
