// Editorial three-card overview of how families use Carely.
import Image from "next/image";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const useCases = [
  {
    title: "Help from any phone",
    description:
      "Your parent calls a familiar number and asks for help in their own words. No smartphone, app, or new interface to learn.",
    image: "/use-cases/everyday-phone-help.jpg",
    alt: "An older adult speaking with Carely from a simple mobile phone",
  },
  {
    title: "Reminders that explain",
    description:
      "Carely calls at the right time and includes the details you added, such as which medicine to take and where to find it.",
    image: "/use-cases/medicine-reminders.jpg",
    alt: "Medicine, a clock, and a simple phone arranged as a reminder",
  },
  {
    title: "Guidance for things at home",
    description:
      "Add clear instructions for the TV, AC, oven, or anything else they may need help using when you are unavailable.",
    image: "/use-cases/household-guides.jpg",
    alt: "A phone guiding household remote controls and an oven dial",
  },
];

export function LandingUseCases() {
  return (
    <section id="use-cases" className="border-t border-border bg-background px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold text-primary">Built for the everyday questions</p>
          <h2 className="mt-5 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Patient help when your elderly parents need you and you cannot pick up.
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            You add the family knowledge once. Carely uses it to guide each conversation calmly,
            explain the details again, and let your parents keep using the phone they already know.
          </p>
        </div>

        <div className="mt-12 grid auto-rows-fr gap-5 md:grid-cols-3">
          {useCases.map(({ title, description, image, alt }) => (
            <Card key={title} className="grid h-full grid-rows-[auto_1fr] gap-0 rounded-md p-2 shadow-none">
              <div className="overflow-hidden rounded-sm bg-muted">
                <Image
                  src={image}
                  alt={alt}
                  width={1200}
                  height={800}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="aspect-[3/2] w-full object-cover"
                />
              </div>
              <CardHeader className="content-start gap-2 p-4 pb-5">
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription className="leading-6">{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
