// Three-stage explanation of configuring, using, and improving Carely.
import Image from "next/image";

import { cn } from "@/lib/utils";

const steps = [
  {
    number: "01",
    title: "Teach Carely what matters",
    description:
      "From the dashboard, you add reminders, household guides, family context, dos and don’ts, and the language your parents are comfortable speaking. Carely’s RAG pipeline retrieves the relevant details when a question is asked.",
    image: "/workflow/configure-carely.jpg",
    alt: "A student configuring Carely from a family dashboard",
  },
  {
    number: "02",
    title: "Your parents call from any phone",
    description:
      "They only need a phone that can dial a number. They call Carely, speak naturally in Hindi or another configured language, and ask for help without using a smartphone or learning an app.",
    image: "/workflow/parents-call.jpg",
    alt: "Elderly parents calling Carely from a basic mobile phone",
  },
  {
    number: "03",
    title: "Review the calls and make Carely better",
    description:
      "You receive conversation logs showing what they asked, where they struggled, and whether the answer helped. If Carely performs poorly, you can refine the prompt, add context, update guides, and use your parents’ feedback to improve the next call.",
    image: "/workflow/review-improve.jpg",
    alt: "A student reviewing conversation logs and improving Carely from feedback",
  },
];

export function LandingWorkflow() {
  return (
    <section id="how-it-works" className="border-t border-border bg-background px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold text-primary">How Carely works</p>
          <h2 className="mt-5 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            You configure it. They call it. Together, you make it better.
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Carely keeps the technical work with you while giving your parents one familiar action:
            calling a phone number and asking for help.
          </p>
        </div>

        <div className="mt-16 divide-y divide-border border-y border-border">
          {steps.map(({ number, title, description, image, alt }, index) => (
            <article key={number} className="grid items-center gap-8 py-10 lg:grid-cols-2 lg:gap-16 lg:py-14">
              <div className={cn("overflow-hidden rounded-md border border-border", index % 2 === 1 && "lg:order-2")}>
                <Image
                  src={image}
                  alt={alt}
                  width={1200}
                  height={800}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="aspect-[3/2] w-full object-cover"
                />
              </div>
              <div className={cn(index % 2 === 1 && "lg:order-1")}>
                <p className="text-sm font-semibold text-primary">{number}</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h3>
                <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
