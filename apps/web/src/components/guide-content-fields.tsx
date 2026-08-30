// Collects the written call instructions available when creating or editing a guide.
"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Upload } from "lucide-react";

import { GuideAttachmentsTable } from "@/components/guide-attachments-table";
import { Button } from "@/components/ui/button";
import type { GuideAttachment } from "@/lib/guides";
import { cn } from "@/lib/utils";

export function GuideContentFields({
  context,
  onContextChange,
  guideId,
  attachments = [],
  deletingAttachmentId,
  onDeleteAttachment,
  variant = "dialog",
}: {
  context: string;
  onContextChange: (value: string) => void;
  guideId?: string;
  attachments?: GuideAttachment[];
  deletingAttachmentId?: string;
  onDeleteAttachment?: (attachment: GuideAttachment) => void;
  variant?: "dialog" | "page";
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(Array.from(event.target.files ?? []));
  }

  return (
    <fieldset className={cn("grid gap-5", variant === "dialog" && "rounded-md border p-4")}>
      <legend className={cn("text-lg font-semibold", variant === "dialog" && "px-1 text-sm")}>Guide content</legend>
      <p id="guide-content-help" className="text-sm leading-6 text-muted-foreground">
        Add the written steps Carely should explain out loud during a phone call.
      </p>

      <label className="grid gap-2 text-sm font-medium" htmlFor="guide-context">
        <span>
          Written instructions <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <textarea
          id="guide-context"
          name="context"
          value={context}
          onChange={(event) => onContextChange(event.target.value)}
          placeholder="Write the steps Carely should explain out loud."
          rows={5}
          aria-describedby="guide-content-help"
          className="w-full resize-y rounded-lg border border-input bg-transparent px-3.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
      </label>

      <div className="grid gap-3 border-t pt-5">
        <div>
          <p className="text-sm font-medium">Upload files</p>
          <p id="guide-upload-help" className="mt-1 text-sm leading-5 text-muted-foreground">
            Add PDFs, notes, images, or audio—or one video up to 30 seconds.
          </p>
        </div>
        <input
          ref={fileInputRef}
          id="guide-context-files"
          name="attachments"
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,audio/*,.pdf,.txt,.md,.doc,.docx,application/pdf,text/plain,text/markdown"
          multiple
          className="sr-only"
          onChange={selectFiles}
          aria-describedby="guide-upload-help"
        />
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload aria-hidden="true" />
          Upload files
        </Button>
        {selectedFiles.length > 0 && (
          <ul className="grid gap-1 text-sm text-muted-foreground" aria-label="Selected files">
            {selectedFiles.map((file) => (
              <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
            ))}
          </ul>
        )}
        {guideId && (
          <GuideAttachmentsTable
            guideId={guideId}
            attachments={attachments}
            deletingAttachmentId={deletingAttachmentId}
            onDeleteAttachment={onDeleteAttachment}
          />
        )}
      </div>
    </fieldset>
  );
}
