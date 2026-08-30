// Interactive conversation summaries shared by the dashboard home and logs pages.
"use client";

import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { Fragment, useState } from "react";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ConversationLogRecord } from "@/lib/conversations-db";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ConversationLogProps = {
  fullPage?: boolean;
  conversations: ConversationLogRecord[];
};

function formatConversationTime(createdAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(createdAt));
}

const qualificationCopy = {
  qualified: "Qualified",
  review: "Review",
  needs_context: "Needs context",
} as const;

const channelCopy = {
  browser_voice: "Voice test",
  demo: "Demo",
  phone: "Phone call",
  text: "Text test",
} as const;

export function ConversationLog({ fullPage = false, conversations }: ConversationLogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const transcriptConversation = conversations.find(({ id }) => id === transcriptId) ?? null;

  return (
    <section
      aria-labelledby="conversation-log-title"
      className={fullPage ? "w-full" : "border-t border-border pt-6"}
    >
      {fullPage ? (
        <DashboardPageHeader
          title="Conversation log"
          titleId="conversation-log-title"
          description="See what your family elder asked and where Carely can improve."
        />
      ) : (
        <>
          <h2 id="conversation-log-title" className="text-2xl font-semibold tracking-tight">
            Conversation log
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            See what your family elder asked and where Carely can improve.
          </p>
        </>
      )}
      <div className={fullPage ? "mt-6 rounded-md border bg-card" : "mt-4 rounded-md border bg-card"}>
        <Table className="min-w-[44rem]">
          <TableCaption className="sr-only">Recent Carely conversation summaries</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead className="text-right">Transcript</TableHead>
              <TableHead className="text-right">Experience</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversations.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No scored conversations yet. Try a message in the testing space to create the first log.
                </TableCell>
              </TableRow>
            )}
            {conversations.map((conversation) => {
              const id = conversation.id;
              const isSelected = selectedId === id;
              const toggleSelected = () => {
                setSelectedId(isSelected ? null : id);
                if (isSelected) setTranscriptId(null);
              };

              return (
                <Fragment key={id}>
                  <TableRow
                    tabIndex={0}
                    role="button"
                    aria-expanded={isSelected}
                    data-state={isSelected ? "selected" : undefined}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    onClick={toggleSelected}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleSelected();
                      }
                    }}
                  >
                    <TableCell className="align-top text-muted-foreground">
                      {formatConversationTime(conversation.createdAt)}
                      <span className="mt-1 block text-xs">{channelCopy[conversation.channel]}</span>
                    </TableCell>
                    <TableCell className="align-top font-medium">
                      <span className="flex items-center gap-2">
                        <ChevronRight
                          aria-hidden="true"
                          className={`size-4 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${
                            isSelected ? "rotate-90" : ""
                          }`}
                        />
                        {conversation.topic}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-normal break-words align-top leading-6 text-muted-foreground">
                      {conversation.summary}
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-11"
                        aria-label={
                          transcriptId === conversation.id ? "Hide transcript" : "View transcript"
                        }
                        title={transcriptId === conversation.id ? "Hide transcript" : "View transcript"}
                        aria-expanded={transcriptId === conversation.id}
                        aria-controls={`conversation-transcript-${conversation.id}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setTranscriptId(conversation.id);
                        }}
                      >
                        <FileText aria-hidden="true" className="size-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium text-foreground ${
                          conversation.experience === "Helpful"
                            ? "border-green/30 bg-green/15"
                            : conversation.experience === "Needs follow-up"
                              ? "border-amber/30 bg-amber/15"
                              : "border-border bg-muted/40"
                        }`}
                      >
                        {conversation.experience}
                      </span>
                    </TableCell>
                  </TableRow>
                  <TableRow
                    aria-hidden={!isSelected}
                    className="border-0 bg-muted/20 hover:bg-muted/20"
                  >
                    <TableCell colSpan={5} className="whitespace-normal p-0">
                      <div
                        className={`grid overflow-hidden transition-[grid-template-rows,opacity] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                          isSelected
                            ? "grid-rows-[1fr] opacity-100 duration-300"
                            : "pointer-events-none grid-rows-[0fr] opacity-0 duration-200"
                        }`}
                      >
                        <div className="min-h-0 overflow-hidden" inert={!isSelected}>
                          <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_12rem]">
                            <div>
                              <p className="text-sm font-semibold">Family brief</p>
                              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                                {conversation.summary}
                              </p>
                              <p className="mt-4 text-sm font-semibold">Where they struggled</p>
                              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                                {conversation.struggle}
                              </p>
                              <p className="mt-4 text-sm font-semibold">What they talked about</p>
                              <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium leading-6">
                                {conversation.question}
                              </p>
                              {conversation.score?.contextSuggestion && (
                                <div className="mt-4 border-l-2 border-amber/50 pl-3">
                                  <p className="text-sm font-semibold">Make the next call more helpful</p>
                                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {conversation.score.contextSuggestion}
                                  </p>
                                  <Link
                                    href="/guides"
                                    className="mt-2 inline-flex text-sm font-medium text-foreground underline underline-offset-4"
                                  >
                                    Add context in Guides
                                  </Link>
                                </div>
                              )}
                            </div>
                            <div className="md:border-l md:border-border md:pl-5">
                              <p className="text-sm font-semibold">Quality score</p>
                              {conversation.score ? (
                                <>
                                  <p className="mt-1 text-3xl font-semibold tracking-tight">
                                    {conversation.score.total}
                                    <span className="text-base font-normal text-muted-foreground">/100</span>
                                  </p>
                                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                                    <div
                                      className={
                                        conversation.score.total >= 80
                                          ? "h-full rounded-full bg-green"
                                          : "h-full rounded-full bg-amber"
                                      }
                                      style={{ width: `${conversation.score.total}%` }}
                                    />
                                  </div>
                                  <p className="mt-2 text-xs font-medium text-foreground">
                                    {qualificationCopy[conversation.score.qualification]}
                                  </p>
                                </>
                              ) : (
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                  Review unavailable. The transcript was still saved.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Sheet
        open={transcriptConversation !== null}
        onOpenChange={(open) => {
          if (!open) setTranscriptId(null);
        }}
      >
        {transcriptConversation && (
          <SheetContent
            id={`conversation-transcript-${transcriptConversation.id}`}
            side="right"
            className="w-full overflow-y-auto sm:max-w-lg"
          >
            <SheetHeader className="border-b border-border">
              <SheetTitle>{transcriptConversation.topic}</SheetTitle>
              <SheetDescription>
                {formatConversationTime(transcriptConversation.createdAt)} · {channelCopy[transcriptConversation.channel]}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-6 sm:px-6">
              <div>
                <p className="text-sm font-semibold">Family brief</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                  {transcriptConversation.summary}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold">Where they struggled</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                  {transcriptConversation.struggle}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold">What they talked about</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                  {transcriptConversation.question}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold">Conversation transcript</p>
                <div className="mt-3 space-y-3">
                  {transcriptConversation.transcript.map((entry, index) => (
                    <div
                      key={`${entry.role}-${index}`}
                      className={entry.role === "user" ? "rounded-md bg-muted/60 p-3" : "rounded-md border border-border bg-background p-3"}
                    >
                      <p className="text-xs font-medium text-muted-foreground">
                        {entry.role === "user" ? "Parent" : "Carely"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{entry.text}</p>
                    </div>
                  ))}
                </div>
              </div>
              {transcriptConversation.sources.length > 0 && (
                <div>
                  <p className="text-sm font-semibold">Grounded in</p>
                  <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
                    {transcriptConversation.sources.map((source) => <li key={source}>{source}</li>)}
                  </ul>
                </div>
              )}
              {transcriptConversation.actions.length > 0 && (
                <div>
                  <p className="text-sm font-semibold">Confirmed actions</p>
                  <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
                    {transcriptConversation.actions.map((action) => <li key={action.summary}>{action.summary}</li>)}
                  </ul>
                </div>
              )}
              {transcriptConversation.score?.contextSuggestion && (
                <div className="border-l-2 border-amber/50 pl-3">
                  <p className="text-sm font-semibold">Make the next call more helpful</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {transcriptConversation.score.contextSuggestion}
                  </p>
                </div>
              )}
            </div>
          </SheetContent>
        )}
      </Sheet>
    </section>
  );
}
