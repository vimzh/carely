// Renders Carely's compact, single-line chat composer.
"use client";

import { CornerDownLeft, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AgentChatComposerProps = {
  busy: boolean;
  hasError: boolean;
  onValueChange: (value: string) => void;
  value: string;
};

export function AgentChatComposer({
  busy,
  hasError,
  onValueChange,
  value,
}: AgentChatComposerProps) {
  return (
    <div className="relative">
      <label className="sr-only" htmlFor="carely-message">
        Message Carely
      </label>
      <Input
        id="carely-message"
        name="message"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="Ask Carely a question…"
        maxLength={4000}
        autoComplete="off"
        aria-describedby={hasError ? "chat-error" : undefined}
        aria-invalid={hasError}
        aria-keyshortcuts="Enter"
        className="h-14 bg-background pl-4 pr-28 text-base shadow-none"
      />
      <Button
        type="submit"
        className="absolute right-1.5 top-1.5 h-11 gap-1.5 px-4"
        disabled={busy}
      >
        {busy && (
          <LoaderCircle
            className="animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        )}
        Send
        {!busy && <CornerDownLeft aria-hidden="true" />}
      </Button>
    </div>
  );
}
