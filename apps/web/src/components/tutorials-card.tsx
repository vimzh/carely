// A compact checklist that introduces the first setup steps for a family.
import localFont from "next/font/local";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HideTutorialsButton, TutorialsChecklist } from "@/components/tutorials-checklist";

const mackinac = localFont({
  src: "../app/fonts/p22-mackinac-book.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
});

export function TutorialsCard({ userId }: { userId: string }) {
  return (
    <Card id="tutorials-card" size="sm" className="w-full max-w-5xl rounded-md">
      <CardHeader className="relative gap-1">
        <CardTitle className={`${mackinac.className} text-2xl font-normal`}>
          Tutorials
        </CardTitle>
        <CardDescription className="text-sm leading-5">
          A few simple ways to set Carely up for your family.
        </CardDescription>
        <HideTutorialsButton />
      </CardHeader>
      <TutorialsChecklist key={userId} userId={userId} />
    </Card>
  );
}
