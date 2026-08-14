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

        <div className="relative mt-12 sm:mt-16">
          <div
            aria-hidden="true"
            className="absolute bottom-10 left-6 top-10 border-l-2 border-dashed border-primary/30 lg:left-1/2"
          />
          {steps.map(({ number, title, description, image, alt }, index) => (
            <article
              key={number}
              className="relative grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 gap-y-6 py-8 lg:grid-cols-[1fr_5rem_1fr] lg:items-center lg:gap-x-8 lg:py-14"
            >
              <div
                className={cn(
                  "col-start-2 row-start-1 overflow-hidden rounded-md lg:row-start-1",
                  index % 2 === 0 ? "lg:col-start-1" : "lg:col-start-3",
                )}
              >
                <Image
                  src={image}
                  alt={alt}
                  width={1200}
                  height={800}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="aspect-[3/2] w-full object-cover"
                />
              </div>
              <div className="relative z-10 col-start-1 row-start-1 mt-5 flex size-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground ring-8 ring-background lg:col-start-2 lg:mt-0 lg:self-center lg:justify-self-center">
                {Number(number)}
              </div>
              <div
                className={cn(
                  "col-start-2 row-start-2 lg:row-start-1",
                  index % 2 === 0 ? "lg:col-start-3" : "lg:col-start-1",
                )}
              >
                <h3 className="text-3xl font-semibold tracking-tight">{title}</h3>
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
