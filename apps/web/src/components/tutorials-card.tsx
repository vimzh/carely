// A compact checklist that introduces the first setup steps for a family.
import localFont from "next/font/local";
import { Circle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const mackinac = localFont({
  src: "../app/fonts/p22-mackinac-book.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
});

const tutorials = [
  "Create a care profile for your family elder",
  "Add medication schedules and reminder details",
  "Save simple instructions for the TV, phone, and home",
  "Add trusted contacts and important family context",
  "Make a test call before they need help",
];

export function TutorialsCard() {
  return (
    <Card className="w-full max-w-5xl rounded-md">
      <CardHeader className="gap-2">
        <CardTitle className={`${mackinac.className} text-3xl font-normal`}>
          Tutorials
        </CardTitle>
        <CardDescription className="text-base leading-6">
          A few simple ways to set Carely up for your family.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        <ul className="space-y-2" aria-label="Carely setup tutorials">
          {tutorials.map((tutorial) => (
            <li key={tutorial} className="flex items-start gap-3 text-sm leading-6">
              <Circle className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>{tutorial}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
