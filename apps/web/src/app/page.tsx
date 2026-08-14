import Image from "next/image";
import localFont from "next/font/local";

import CardNav, { type CardNavItem } from "@/components/CardNav";
import { AuthButton } from "@/components/auth-button";
import { CarelyMark } from "@/components/carely-mark";
import heroImage from "../../public/carely-hero.jpg";

const mackinac = localFont({
  src: "./fonts/p22-mackinac-book.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
});

const navItems: CardNavItem[] = [
  {
    label: "How it works",
    bgColor: "var(--primary)",
    textColor: "var(--primary-foreground)",
    links: [
      {
        label: "For grandparents",
        href: "#how-carely-works",
        ariaLabel: "How Carely works for grandparents",
      },
      {
        label: "For families",
        href: "#how-carely-works",
        ariaLabel: "How families set up Carely",
      },
    ],
  },
  {
    label: "Families",
    bgColor: "var(--secondary)",
    textColor: "var(--secondary-foreground)",
    links: [
      { label: "Dashboard", href: "/home", ariaLabel: "Carely family dashboard" },
      { label: "What Carely knows", href: "#", ariaLabel: "What Carely knows" },
    ],
  },
  {
    label: "Carely",
    bgColor: "var(--accent)",
    textColor: "var(--accent-foreground)",
    links: [
      { label: "Our approach", href: "#", ariaLabel: "Our approach" },
      { label: "Contact", href: "#", ariaLabel: "Contact Carely" },
    ],
  },
];

function CarelyLogo() {
  return (
    <div className="relative z-10 flex -translate-y-8 flex-col items-center gap-3 sm:-translate-y-10">
      <CarelyMark
        animated
        framed={false}
        className="size-44 drop-shadow-lg sm:size-52"
      />
      <h1
        className={`${mackinac.className} text-5xl font-normal tracking-tight text-white drop-shadow-md sm:text-6xl`}
      >
        Carely
      </h1>
      <p className="text-base font-medium tracking-wide text-white/90 drop-shadow-sm sm:text-lg">
        Be there, even when you can’t pick up.
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <section className="relative grid min-h-screen place-items-center overflow-hidden">
        <CardNav
          logo="/icon.svg"
          logoAlt="Carely"
          items={navItems}
          baseColor="var(--card)"
          menuColor="var(--foreground)"
          buttonBgColor="var(--primary)"
          buttonTextColor="var(--primary-foreground)"
          buttonLabel="Try now"
          buttonClassName={`${mackinac.className} font-normal`}
          button={<AuthButton className={`${mackinac.className} font-normal`} />}
        />
        <Image
          src={heroImage}
          alt=""
          fill
          preload
          placeholder="blur"
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/10" aria-hidden="true" />
        <CarelyLogo />
      </section>
    </main>
  );
}
