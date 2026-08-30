"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, BookOpenText, Plus } from "lucide-react";

import { createGuide, updateGuide } from "@/app/(dashboard)/guides/actions";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { GuideContentFields } from "@/components/guide-content-fields";
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
import type { Guide } from "@/lib/guides";

const guideDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

function formatGuideDate(value?: string) {
  return value ? guideDateFormatter.format(new Date(value)) : null;
}

function GuideCard({ guide }: { guide: Guide }) {
  const added = formatGuideDate(guide.createdAt);
  const edited = formatGuideDate(guide.updatedAt);
  const metadata =
    added && edited && guide.createdAt !== guide.updatedAt
      ? `Added ${added} · Edited ${edited}`
      : added
        ? `Added ${added}`
        : "Recently added";

  return (
    <Link
      href={`/guides/${encodeURIComponent(guide.id)}`}
      className="rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full rounded-md shadow-none transition-colors hover:bg-muted/30">
        <CardHeader className="gap-2">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl">{guide.title}</CardTitle>
            <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </div>
          <CardDescription className="leading-6">{guide.note}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">{guide.context}</p>
          <p className="text-xs text-muted-foreground">{metadata}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function GuidesManager({
  initialGuides,
  editGuideId,
}: {
  initialGuides: Guide[];
  editGuideId?: string;
}) {
  const guideToEdit = initialGuides.find(({ id }) => id === editGuideId);
  return (
    <GuidesManagerContent
      key={guideToEdit?.id ?? "guides"}
      guides={initialGuides}
      guideToEdit={guideToEdit}
    />
  );
}

function GuidesManagerContent({ guides, guideToEdit }: { guides: Guide[]; guideToEdit?: Guide }) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(guideToEdit));
  const [title, setTitle] = useState(guideToEdit?.title ?? "");
  const [note, setNote] = useState(guideToEdit?.note ?? "");
  const [context, setContext] = useState(guideToEdit?.context ?? "");
  const [editingId, setEditingId] = useState<string | null>(guideToEdit?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setTitle("");
    setNote("");
    setContext("");
    setEditingId(null);
    setError("");
  }

  function startNewGuide() {
    resetForm();
    setOpen(true);
  }

  async function saveGuide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const result = editingId
      ? await updateGuide(editingId, formData)
      : await createGuide(formData);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    resetForm();
    setOpen(false);
    router.replace("/guides");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Guides"
        description="Teach Carely how to help your family elder with the things around their home."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0" onClick={startNewGuide}>
                <Plus aria-hidden="true" />
                New guide
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90svh] gap-6 overflow-y-auto p-6 sm:max-w-2xl sm:p-7">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {editingId ? "Edit guide" : "Add a guide"}
                </DialogTitle>
                <DialogDescription className="leading-6">
                  Add the written steps Carely should explain during the phone call.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={saveGuide} className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium" htmlFor="guide-title">
                  Title
                  <Input
                    id="guide-title"
                    name="title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. How to use the washing machine"
                    maxLength={160}
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium" htmlFor="guide-note">
                  Note
                  <Input
                    id="guide-note"
                    name="note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="A short description for your family"
                    maxLength={500}
                    required
                  />
                </label>
                <GuideContentFields
                  context={context}
                  onContextChange={setContext}
                  guideId={guideToEdit?.id}
                  attachments={guideToEdit?.attachments}
                />
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                <Button type="submit" className="w-fit" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Save changes" : "Add guide"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-6">
        {guides.map((guide) => (
          <GuideCard key={guide.id} guide={guide} />
        ))}
      </div>

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
