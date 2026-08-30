// Interactive, per-user setup checklist persisted in the browser.
"use client";

import { CheckCircle2, Circle, X } from "lucide-react";
import { useEffect, useState } from "react";

import { CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const tutorials = [
  {
    id: "care-profile",
    label: "Create a care profile for your family elder",
    description: "Give Carely the basics it needs to speak about your family elder with care.",
    steps: [
      "Add their preferred name, phone number, language, and any accessibility needs.",
      "Write a short note about routines, preferences, and topics Carely should understand.",
      "Keep health details limited to what is useful for reminders and conversations, and update them when something changes.",
      "Save the profile and review it once with another trusted family member.",
    ],
  },
  {
    id: "medication-schedules",
    label: "Add medication schedules and reminder details",
    description: "Make medication reminders clear enough for a calm, ordinary phone call.",
    steps: [
      "Add the medicine name, dose, and the time of day it should be taken.",
      "Include simple instructions such as whether it should be taken with food or water.",
      "Add who to contact if a dose is missed or the person has a question.",
      "Ask a clinician or pharmacist to confirm the details. Carely reminders do not replace medical advice.",
    ],
  },
  {
    id: "home-instructions",
    label: "Save simple instructions for the TV, phone, and home",
    description: "Turn the small instructions you repeat most often into short, reliable guides.",
    steps: [
      "Create one guide for each task, such as changing the TV input or turning on speakerphone.",
      "Write the steps in the order they should happen, using the exact button or object names they see.",
      "Add what success looks like, and what to do if the first attempt does not work.",
      "Read the guide aloud once and remove anything that sounds confusing or unnecessary.",
    ],
  },
  {
    id: "trusted-contacts",
    label: "Add trusted contacts and important family context",
    description: "Help Carely know who is safe to contact and what context matters to your family.",
    steps: [
      "Add each trusted contact's name, relationship, and best phone number.",
      "Note when they are usually available and whether they prefer calls or messages.",
      "Add useful context such as nicknames, important routines, or family relationships.",
      "Check every number and remove anyone who should no longer be contacted.",
    ],
  },
  {
    id: "test-call",
    label: "Make a test call before they need help",
    description: "A short test call shows whether Carely has enough context to be genuinely useful.",
    steps: [
      "Call Carely from the phone your family elder will use.",
      "Ask a common question, such as how to use the TV or when the next reminder is scheduled.",
      "Listen for anything that sounds too vague, too fast, or factually wrong.",
      "Review the call, improve the relevant profile or guide, and call again until the answer feels clear.",
    ],
  },
] as const;

type Tutorial = (typeof tutorials)[number];

const getStorageKey = (userId: string) => `carely:tutorials:${userId}`;

export function HideTutorialsButton() {
  return (
    <button
      type="button"
      aria-label="Hide tutorials"
      aria-controls="tutorials-card"
      onClick={() => document.getElementById("tutorials-card")?.setAttribute("hidden", "")}
      className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );
}

export function TutorialsChecklist({ userId }: { userId: string }) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(getStorageKey(userId));
        if (!stored) return;

        const saved = JSON.parse(stored);
        if (Array.isArray(saved)) {
          setCompleted(saved.filter((id): id is string =>
            typeof id === "string" && tutorials.some((tutorial) => tutorial.id === id),
          ));
        }
      } catch (error) {
        console.error("Could not read Carely tutorial progress", error);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [userId]);

  function toggleTutorial(id: string) {
    const next = completed.includes(id)
      ? completed.filter((tutorialId) => tutorialId !== id)
      : [...completed, id];

    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(next));
    setCompleted(next);
  }

  return (
    <CardContent className="pt-3">
      <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
        {completed.length} of {tutorials.length} complete
      </p>
      <ul className="divide-y" aria-label="Carely setup tutorials">
        {tutorials.map((tutorial) => {
          const { id, label } = tutorial;
          const isComplete = completed.includes(id);

          return (
            <li key={id} className="flex items-center">
              <button
                type="button"
                role="checkbox"
                aria-checked={isComplete}
                aria-label={`${isComplete ? "Mark incomplete" : "Mark complete"}: ${label}`}
                onClick={() => toggleTutorial(id)}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                {isComplete ? (
                  <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTutorial(tutorial)}
                className="min-h-11 flex-1 py-2 pr-3 text-left text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span className={isComplete ? "text-muted-foreground line-through" : undefined}>
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={activeTutorial !== null}
        onOpenChange={(open) => {
          if (!open) setActiveTutorial(null);
        }}
      >
        <DialogContent className="max-h-[90svh] gap-5 overflow-y-auto p-6 sm:max-w-lg sm:p-7">
          {activeTutorial && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{activeTutorial.label}</DialogTitle>
                <DialogDescription className="leading-6">
                  {activeTutorial.description}
                </DialogDescription>
              </DialogHeader>
              <ol className="grid gap-3" aria-label={`${activeTutorial.label} steps`}>
                {activeTutorial.steps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm leading-6">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </DialogContent>
      </Dialog>
    </CardContent>
  );
}
