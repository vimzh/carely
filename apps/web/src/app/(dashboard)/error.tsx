// Recovers dashboard route rendering without discarding the authenticated shell.
"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route failed", error);
  }, [error]);

  return (
    <section className="grid min-h-[60svh] place-items-center p-6 text-center" role="alert" aria-live="assertive">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">This page did not load</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Carely could not load this part of the dashboard. Check your connection and retry.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-muted-foreground">Error reference: {error.digest}</p>
        )}
        <Button type="button" className="mt-5 min-h-11" onClick={() => retry()}>
          <RotateCcw aria-hidden="true" />
          Retry page
        </Button>
      </div>
    </section>
  );
}
