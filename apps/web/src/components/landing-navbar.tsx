// Floating landing navigation with the Carely mark, section links, and authentication action.
import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";

import { AuthButton } from "@/components/auth-button";

const mackinac = localFont({
  src: "../app/fonts/p22-mackinac-book.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
});

const links = [
  { label: "Home", href: "#carely-hero" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "Guide", href: "/guides" },
];

export function LandingNavbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <nav
        className="mx-auto flex h-16 max-w-6xl items-center gap-3 rounded-md border border-border/80 bg-[#fbfaf6]/95 px-3 shadow-sm sm:gap-6 sm:px-5"
        aria-label="Main navigation"
      >
        <Link href="#carely-hero" className="flex shrink-0 items-center gap-2">
          <Image src="/carely-face.svg" alt="" width={38} height={38} className="size-9" priority />
          <span className={`${mackinac.className} hidden text-2xl font-normal tracking-tight text-foreground sm:inline`}>
            Carely
          </span>
        </Link>

        <div className="flex flex-1 items-center justify-center gap-3 sm:gap-8">
          {links.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="whitespace-nowrap text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:text-sm"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="shrink-0">
          <AuthButton className="h-9 px-3 sm:h-10 sm:px-5" />
        </div>
      </nav>
    </header>
  );
}
