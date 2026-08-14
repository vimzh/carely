import localFont from "next/font/local";

import { LandingFaq } from "@/components/landing-faq";
import { LandingInspiration } from "@/components/landing-inspiration";
import { LandingNavbar } from "@/components/landing-navbar";
import { LandingUseCases } from "@/components/landing-use-cases";
import AIOrbFace from "@/components/smoothui/ai-orb-face";

const mackinac = localFont({
  src: "./fonts/p22-mackinac-book.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
});

function HeroContent() {
  return (
    <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-24 text-center sm:pt-28">
      <div className="flex items-center gap-5 sm:gap-7">
        <AIOrbFace
          aria-label="Carely voice companion"
          size="clamp(7rem, 15vw, 10rem)"
          colors={{
            body: "oklch(84% 0.09 151)",
            bodyEdge: "oklch(68% 0.14 151)",
            feature: "oklch(25% 0.04 151)",
          }}
        />
        <p className={`${mackinac.className} text-5xl font-normal text-primary sm:text-7xl`}>
          Carely
        </p>
      </div>
      <h1 className="mt-8 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
        Everyday help for your elderly parents.
      </h1>
      <p className="mt-6 max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
        Add medicine reminders, household guides, and family context once. Your parent or
        grandparent can call Carely from any phone and get patient, real-time help with the
        little things they would normally ask you.
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <section
        id="carely-hero"
        className="carely-hero-background relative grid min-h-screen place-items-center overflow-hidden"
      >
        <LandingNavbar />
        <HeroContent />
      </section>
      <LandingUseCases />
      <LandingInspiration />
      <LandingFaq />
    </main>
  );
}
