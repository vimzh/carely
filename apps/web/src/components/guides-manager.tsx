// Session-only visual guides that Carely can explain during a phone call.
"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { BookOpenText, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Guide = {
  id: string;
  title: string;
  note: string;
  context: string;
  contextAsset: string;
  contextAssetKind: "image" | "pdf";
};

const initialGuides: Guide[] = [
  {
    id: "air-conditioner",
    title: "How to configure the AC",
    note: "A simple way to cool the room without changing the wrong setting.",
    context:
      "Tell them to press the power button, choose Cool, and set the temperature to 24 degrees. If the remote shows a fan icon, press Mode until the snowflake appears.",
    contextAsset: "/card-backgrounds/add-what-matters.png",
    contextAssetKind: "image",
  },
  {
    id: "oven",
    title: "How to use the oven",
    note: "Step-by-step help for warming food safely.",
    context:
      "Explain which knob turns the oven on, how to choose 180 degrees, and how to check that the red heating light has turned off before opening the door.",
    contextAsset: "/card-backgrounds/call-from-any-phone.png",
    contextAssetKind: "image",
  },
  {
    id: "tv-remote",
    title: "How to use the TV remote",
    note: "Help finding the right channel and returning to normal TV.",
    context:
      "Start with the large power button, use the channel up and down buttons, and press Input if the screen says No signal. Remind them which button changes the volume.",
    contextAsset: "/card-backgrounds/talk-it-through.png",
    contextAssetKind: "image",
  },
];

function GuideCard({ guide, onOpen }: { guide: Guide; onOpen: () => void }) {
  return (
    <Card
      className="cursor-pointer rounded-md shadow-none transition-colors hover:bg-muted/30 focus-visible:ring-3 focus-visible:ring-ring/50"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen();
      }}
    >
      <CardHeader className="gap-2">
        <CardTitle className="text-xl">{guide.title}</CardTitle>
        <CardDescription className="leading-6">{guide.note}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{guide.context}</p>
      </CardContent>
    </Card>
  );
}

export function GuidesManager() {
  const [guides, setGuides] = useState(initialGuides);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [context, setContext] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);

  const selectedGuide = guides.find(({ id }) => id === selectedGuideId) ?? null;

  function resetForm() {
    setTitle("");
    setNote("");
    setContext("");
    setImageFile(null);
    setEditingId(null);
  }

  function startNewGuide() {
    resetForm();
    setOpen(true);
  }

  function editGuide(guide: Guide) {
    setEditingId(guide.id);
    setTitle(guide.title);
    setNote(guide.note);
    setContext(guide.context);
    setImageFile(null);
    setOpen(true);
  }

  function saveGuide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuides((current) => {
      if (!editingId) {
        return [
          ...current,
          {
            id: `${title}-${Date.now()}`,
            title: title.trim(),
            note: note.trim(),
            context: context.trim(),
            contextAsset: imageFile
              ? URL.createObjectURL(imageFile)
              : "/card-backgrounds/add-what-matters.png",
            contextAssetKind: imageFile?.type === "application/pdf" ? "pdf" : "image",
          },
        ];
      }

      return current.map((guide) =>
        guide.id === editingId
          ? {
              ...guide,
              title: title.trim(),
              note: note.trim(),
              context: context.trim(),
              contextAsset: imageFile ? URL.createObjectURL(imageFile) : guide.contextAsset,
              contextAssetKind: imageFile
                ? imageFile.type === "application/pdf"
                  ? "pdf"
                  : "image"
                : guide.contextAssetKind,
            }
          : guide,
      );
    });
    resetForm();
    setOpen(false);
  }

  function removeGuide(guideId: string) {
    setGuides((current) => current.filter(({ id }) => id !== guideId));
    setSelectedGuideId(null);
  }

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Guides</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Teach Carely how to help your family elder with the things around their home.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0" onClick={startNewGuide}>
              <Plus aria-hidden="true" />
              New Guide
            </Button>
          </DialogTrigger>
          <DialogContent className="gap-6 p-6 sm:max-w-lg sm:p-7">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingId ? "Edit guide" : "Add a guide"}
              </DialogTitle>
              <DialogDescription className="leading-6">
                Add the details Carely should explain when your parent asks for help.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={saveGuide} className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium" htmlFor="guide-title">
                Title
                <Input
                  id="guide-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. How to use the washing machine"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium" htmlFor="guide-note">
                Note
                <Input
                  id="guide-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="A short description for your family"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium" htmlFor="guide-context">
                Context
                <textarea
                  id="guide-context"
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="Write the steps Carely should explain out loud."
                  required
                  rows={5}
                  className="w-full resize-y rounded-lg border border-input bg-transparent px-3.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium" htmlFor="guide-image">
                Context image or PDF <span className="font-normal text-muted-foreground">(optional)</span>
                <Input
                  id="guide-image"
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <Button type="submit" className="w-fit">
                {editingId ? "Save changes" : "Add guide"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {guides.map((guide) => (
          <GuideCard
            key={guide.id}
            guide={guide}
            onOpen={() => setSelectedGuideId(guide.id)}
          />
        ))}
      </div>

      <Dialog
        open={selectedGuide !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedGuideId(null);
        }}
      >
        <DialogContent className="gap-6 p-6 sm:max-w-4xl sm:p-8">
          {selectedGuide && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedGuide.title}</DialogTitle>
                <DialogDescription className="leading-6">{selectedGuide.note}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
                <div className="relative min-h-64 overflow-hidden rounded-md border bg-muted">
                  {selectedGuide.contextAssetKind === "pdf" ? (
                    <iframe
                      src={selectedGuide.contextAsset}
                      title={`${selectedGuide.title} context PDF`}
                      className="absolute inset-0 size-full"
                    />
                  ) : (
                    <Image
                      src={selectedGuide.contextAsset}
                      alt=""
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="grid content-start gap-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Context</p>
                  <p className="text-sm leading-6">{selectedGuide.context}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        editGuide(selectedGuide);
                        setSelectedGuideId(null);
                      }}
                    >
                      <Pencil aria-hidden="true" />
                      Edit guide
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => removeGuide(selectedGuide.id)}
                    >
                      <Trash2 aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {!guides.length && (
        <div className="flex flex-col items-center gap-2 border border-dashed border-border p-10 text-center">
          <BookOpenText className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">No guides yet</p>
          <p className="text-sm text-muted-foreground">Add a guide to teach Carely something useful.</p>
        </div>
      )}
    </div>
  );
}
