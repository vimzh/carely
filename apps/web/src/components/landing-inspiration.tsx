// First-person founder story explaining why Carely exists.
export function LandingInspiration() {
  return (
    <section id="inspiration" className="border-t border-border bg-[#fbfaf6] px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <p className="text-sm font-semibold text-primary">The inspiration</p>
          <h2 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            I wanted my parents to get help even when I could not answer.
          </h2>
        </div>

        <div className="space-y-6 text-base leading-8 text-muted-foreground sm:text-lg">
          <p>
            I live in India, and my parents live in a rural area. They use a basic button phone,
            not a smartphone. Sometimes they forget to take their medicine. Sometimes they need
            help using the AC or another device at home.
          </p>
          <p>
            Last summer, I gave them a digital oven so they could cook good food for themselves.
            I can only visit every six or seven months, and when I returned, it was still unused.
            The controls were difficult to understand, they do not read English, and they had no
            simple way to ask what each button did.
          </p>
          <p>
            That experience became Carely. My parents can call from the ordinary phone they already
            know and ask questions in a familiar way. From my dashboard, I can add medicine details,
            household instructions, and the context the agent needs. Once Carely knows those things,
            it can patiently guide them through a call.
          </p>
          <p className="border-l-2 border-primary pl-5 text-foreground">
            I am in college, attending classes, and working at my internship. I cannot be available
            every hour of the day—but Carely can still be there when they need help.
          </p>
        </div>
      </div>
    </section>
  );
}
