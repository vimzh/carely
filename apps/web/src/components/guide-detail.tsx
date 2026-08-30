"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Check, MoreVertical, Save, Trash2 } from "lucide-react";

import { deleteGuide, deleteGuideAttachment, updateGuide } from "@/app/(dashboard)/guides/actions";
import { GuideContentFields } from "@/components/guide-content-fields";
import { Button } from "@/components/ui/button";
import type { Guide } from "@/lib/guides";

export function GuideDetail({ guide }: { guide: Guide }) {
  return <GuideEditor guide={guide} />;
}

function GuideEditor({ guide }: { guide: Guide }) {
  const router = useRouter();
  const [title, setTitle] = useState(guide.title);
  const [note, setNote] = useState(guide.note);
  const [context, setContext] = useState(guide.context);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string>();
  const [error, setError] = useState("");

  async function saveGuide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    const result = await updateGuide(guide.id, new FormData(event.currentTarget));
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  async function removeGuide() {
    if (!window.confirm(`Delete “${title}”?`)) return;
    setError("");
    const result = await deleteGuide(guide.id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/guides");
    router.refresh();
  }

  async function removeAttachment(attachment: Guide["attachments"][number]) {
    if (!window.confirm(`Delete “${attachment.name}” from this guide and Carely's memory?`)) return;
    setDeletingAttachmentId(attachment.id);
    setError("");
    const result = await deleteGuideAttachment(guide.id, attachment.id);
    setDeletingAttachmentId(undefined);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={saveGuide} className="space-y-8">
        <div className="pb-2">
          <BackToGuides />
        </div>

        <header className="grid gap-6 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="max-w-3xl space-y-3">
            <label className="block" htmlFor="guide-page-title">
              <span className="sr-only">Guide title</span>
              <input
                id="guide-page-title"
                name="title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setSaved(false);
                }}
                maxLength={160}
                required
                className="w-full rounded-sm border-0 bg-transparent p-0 pb-1 text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 sm:text-4xl"
              />
            </label>
            <label className="block" htmlFor="guide-page-note">
              <span className="sr-only">Guide summary</span>
              <textarea
                id="guide-page-note"
                name="note"
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  setSaved(false);
                }}
                maxLength={500}
                required
                rows={2}
                className="w-full max-w-2xl resize-none rounded-sm border-0 bg-transparent p-0 pb-1 text-base leading-6 text-muted-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
              />
            </label>
          </div>
          <details className="relative justify-self-end lg:pt-1">
            <summary
              className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
              aria-label="Guide actions"
            >
              <MoreVertical className="size-5" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-40 rounded-md border bg-popover p-1 shadow-md">
              <button
                type="button"
                className="flex min-h-10 w-full items-center gap-2 rounded-sm px-3 text-left text-sm text-destructive outline-none hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/30"
                onClick={removeGuide}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Delete guide
              </button>
            </div>
          </details>
        </header>

        <section className="max-w-3xl" aria-label="Guide content">
          <GuideContentFields
            context={context}
            onContextChange={(value) => {
              setContext(value);
              setSaved(false);
            }}
            guideId={guide.id}
            attachments={guide.attachments}
            deletingAttachmentId={deletingAttachmentId}
            onDeleteAttachment={removeAttachment}
            variant="page"
          />
        </section>

        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div className="flex items-center justify-end gap-3 border-t pt-6">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" role="status">
              <Check className="size-4" aria-hidden="true" />
              Saved
            </span>
          )}
          <Button type="submit" disabled={saving}>
            <Save aria-hidden="true" />
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
    </form>
  );
}

function BackToGuides() {
  return (
    <Link
      href="/guides"
      className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <ArrowLeft aria-hidden="true" />
      Back to guides
    </Link>
  );
}
