// Transparent landing navigation with the static Carely face and authentication action.
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
    <header className="absolute inset-x-0 top-0 z-50">
      <nav className="mx-auto flex h-20 max-w-7xl items-center gap-6 px-5 sm:px-8" aria-label="Main navigation">
        <Link href="#carely-hero" className="flex shrink-0 items-center gap-2.5">
          <Image src="/carely-face.svg" alt="" width={42} height={42} className="size-10" priority />
          <span className={`${mackinac.className} text-2xl font-normal tracking-tight text-foreground`}>
            Carely
          </span>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-8 sm:flex">
          {links.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="ml-auto sm:ml-0">
          <AuthButton className="h-10 px-5" />
        </div>
      </nav>
    </header>
  );
}
