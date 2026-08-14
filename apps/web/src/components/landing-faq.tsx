// Common questions about setting up and using Carely.
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Does my parent need a smartphone?",
    answer:
      "No. Carely is designed for ordinary button phones. Your parent calls a familiar number and speaks naturally without installing an app or learning a new interface.",
  },
  {
    question: "What can my parents ask Carely?",
    answer:
      "They can ask about medicine instructions, household devices, family details, reminders, or everyday questions. You decide what personal context Carely should know.",
  },
  {
    question: "How does Carely learn about our family?",
    answer:
      "You add guides, reminders, contacts, and useful family context from the dashboard. Carely uses that information to give answers that are specific to your parents and their home.",
  },
  {
    question: "Can Carely remind someone to take medicine?",
    answer:
      "Yes. You can schedule a call and include details such as which medicine to take, where it is kept, and what Carely should explain if your parent asks again.",
  },
  {
    question: "Can Carely speak Hindi?",
    answer:
      "Carely is designed to speak in the language your family is comfortable with, including Hindi, so they do not need to understand English instructions.",
  },
  {
    question: "Is Carely an emergency service?",
    answer:
      "No. Carely can use the emergency contacts and calling hours you configure, but it is not a replacement for local emergency services or medical care.",
  },
];

export function LandingFaq() {
  return (
    <section id="faq" className="border-t border-border bg-background px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <p className="text-sm font-semibold text-primary">FAQ</p>
          <h2 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            A few things families usually ask.
          </h2>
        </div>

        <Accordion type="single" collapsible className="border-t border-border">
          {faqs.map(({ question, answer }) => (
            <AccordionItem key={question} value={question}>
              <AccordionTrigger className="py-5 text-base hover:no-underline">
                {question}
              </AccordionTrigger>
              <AccordionContent className="max-w-2xl pb-5 text-base leading-7 text-muted-foreground">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
