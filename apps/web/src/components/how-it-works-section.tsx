import { HeartHandshake, MessageCircle, PhoneCall } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
const steps = [
  {
    title: "You add what matters",
    description:
      "Use your dashboard to add medication schedules, family context, and simple instructions for things around the home.",
    icon: MessageCircle,
  },
  {
    title: "They call from any phone",
    description:
      "Your parent or grandparent calls a number they know. No smartphone, app, account, or new technology to learn.",
    icon: PhoneCall,
  },
  {
    title: "Carely talks it through",
    description:
      "The real-time voice agent uses the information you shared to answer patiently, and can help with everyday questions too.",
    icon: HeartHandshake,
  },
];

export function HowItWorksSection() {
  return (
    <section
      className="bg-background px-5 py-20 sm:px-8 sm:py-28"
      aria-labelledby="how-carely-works"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold tracking-[0.16em] text-primary uppercase">
            Made for families like yours
          </p>
          <h2
            id="how-carely-works"
            className="font-heading text-4xl leading-tight font-medium tracking-tight sm:text-5xl"
          >
            When you can’t pick up, Carely can.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
            Give Carely the context your loved one relies on. They get a
            patient, familiar source of help through the phone they already
            know how to use.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map(({ title, description, icon: Icon }, index) => (
            <Card
              key={title}
              className="min-h-64 justify-between rounded-md border-0 px-3 py-3 shadow-none ring-1 ring-border"
            >
              <CardHeader className="gap-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-sm bg-secondary text-secondary-foreground">
                    <Icon aria-hidden="true" className="size-6" />
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">
                    0{index + 1}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-2xl">{title}</CardTitle>
                  <CardDescription className="mt-3 text-base leading-7">
                    {description}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
