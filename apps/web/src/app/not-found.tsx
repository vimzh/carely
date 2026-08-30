import Link from "next/link";

import { CarelyMark } from "@/components/carely-mark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center px-6 py-12 text-center">
      <div className="flex max-w-md flex-col items-center">
        <CarelyMark className="size-20" />
        <p className="mt-8 text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-4 text-pretty leading-7 text-muted-foreground">
          The page you’re looking for doesn’t exist or may have moved.
        </p>
        <Button asChild className="mt-8" size="lg">
          <Link href="/">Back to Carely</Link>
        </Button>
      </div>
    </main>
  );
}
