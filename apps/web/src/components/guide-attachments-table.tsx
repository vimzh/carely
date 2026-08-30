// Shows the files that currently contribute to a guide's agent memory.
"use client";

import { ExternalLink, FileText, Image as ImageIcon, Music2, Trash2, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatGuideFileSize,
  getGuideFileFormat,
  getGuideFileKind,
  type GuideAttachment,
} from "@/lib/guides";

type GuideAttachmentsTableProps = {
  attachments: GuideAttachment[];
  deletingAttachmentId?: string;
  guideId: string;
  onDeleteAttachment?: (attachment: GuideAttachment) => void;
};

function FileKindIcon({ kind }: { kind: ReturnType<typeof getGuideFileKind> }) {
  const className = "size-4 text-muted-foreground";
  if (kind === "Image") return <ImageIcon className={className} aria-hidden="true" />;
  if (kind === "Audio") return <Music2 className={className} aria-hidden="true" />;
  if (kind === "Video") return <Video className={className} aria-hidden="true" />;
  return <FileText className={className} aria-hidden="true" />;
}

function formatUploadedAt(createdAt?: string) {
  if (!createdAt) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(createdAt));
}

export function GuideAttachmentsTable({
  attachments,
  deletingAttachmentId,
  guideId,
  onDeleteAttachment,
}: GuideAttachmentsTableProps) {
  return (
    <section aria-labelledby="guide-files-title" className="mt-3">
      <div>
        <h3 id="guide-files-title" className="text-sm font-semibold">Uploaded files</h3>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          These files are available to Carely when it answers from this guide.
        </p>
      </div>
      <div className="mt-3 rounded-md border bg-card">
        <Table className="min-w-[48rem]">
          <TableCaption className="sr-only">Files uploaded to this guide</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Format</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attachments.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No files uploaded to this guide yet.
                </TableCell>
              </TableRow>
            )}
            {attachments.map((attachment) => {
              const kind = getGuideFileKind(attachment.mimeType);
              const fileUrl = `/api/guides/${encodeURIComponent(guideId)}/attachments/${encodeURIComponent(attachment.id)}`;

              return (
                <TableRow key={attachment.id}>
                  <TableCell className="max-w-[20rem] whitespace-normal font-medium">
                    <span className="flex items-start gap-2">
                      <FileKindIcon kind={kind} />
                      <span className="break-all">{attachment.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{kind}</TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-sm border bg-muted/50 px-2 py-1 text-xs font-medium">
                      {getGuideFileFormat(attachment.name, attachment.mimeType)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatGuideFileSize(attachment.size)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatUploadedAt(attachment.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm" className="h-11 px-3">
                        <a href={fileUrl} target="_blank" rel="noreferrer">
                          <ExternalLink aria-hidden="true" />
                          Open
                        </a>
                      </Button>
                      {onDeleteAttachment && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-11 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={deletingAttachmentId === attachment.id}
                          onClick={() => onDeleteAttachment(attachment)}
                        >
                          <Trash2 aria-hidden="true" />
                          {deletingAttachmentId === attachment.id ? "Removing…" : "Remove"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
