// Provides a focused surface for testing Carely through voice and text.
"use client";

import { useRef, useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";

import { sendAgentMessage } from "@/app/(dashboard)/try/actions";
import { AgentChatComposer } from "@/components/agent-chat-composer";
import AgentAvatar from "@/components/smoothui/agent-avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceCall } from "@/components/voice-call";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type PendingChatRequest = {
  message: string;
  transcript: Array<{ role: "assistant" | "user"; text: string }>;
};

export function AgentPlayground() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [answering, setAnswering] = useState(false);
  const [chatError, setChatError] = useState("");
  const [failedRequest, setFailedRequest] = useState<PendingChatRequest | null>(null);
  const sessionId = useRef<string | null>(null);

  async function requestAnswer(request: PendingChatRequest, appendUserMessage: boolean) {
    if (appendUserMessage) {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "user", content: request.message },
      ]);
    }
    setMessage("");
    setChatError("");
    setFailedRequest(null);
    setAnswering(true);
    sessionId.current ??= crypto.randomUUID();
    let result;
    try {
      result = await sendAgentMessage({
        message: request.message,
        sessionId: sessionId.current,
        transcript: request.transcript,
      });
    } catch {
      setAnswering(false);
      setChatError("Carely could not answer. Check your connection, then retry the same question.");
      setFailedRequest(request);
      return;
    }
    setAnswering(false);

    if (!result.ok) {
      setChatError(result.error);
      setFailedRequest(request);
      return;
    }

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "assistant", content: result.response },
    ]);
  }

  function send(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const cleanMessage = message.trim();
    if (!cleanMessage || answering) return;

    const request: PendingChatRequest = {
      message: cleanMessage,
      transcript: [
        ...messages.map(({ role, content }) => ({ role, text: content })),
        { role: "user", text: cleanMessage },
      ],
    };
    void requestAnswer(request, true);
  }

  return (
    <Tabs
      defaultValue="text"
      className="flex h-[calc(100svh-3.5rem)] min-h-0 flex-1 flex-col bg-paper-white md:h-svh"
    >
      <h1 className="sr-only">Test Carely</h1>

      <div className="flex shrink-0 justify-center px-5 pt-5 sm:pt-7">
        <TabsList aria-label="Choose how to test Carely" className="w-60">
          <TabsTrigger value="text">Text mode</TabsTrigger>
          <TabsTrigger value="voice">Voice mode</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent
        value="text"
        className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
      >
        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 sm:px-10"
          aria-live="polite"
          aria-busy={answering}
        >
          {!messages.length && !answering && (
            <div className="flex flex-1 items-center justify-center py-8">
              <AgentAvatar seed="carely-demo-agent" size={144} aria-label="Carely agent" />
            </div>
          )}
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 py-6">
            {messages.map((item) => (
              <div
                key={item.id}
                className={item.role === "user" ? "ml-auto max-w-[85%] rounded-md bg-muted px-4 py-3" : "max-w-[75ch]"}
              >
                <p className="whitespace-pre-wrap text-sm leading-6">{item.content}</p>
              </div>
            ))}
            {answering && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Checking saved context…
              </p>
            )}
          </div>
        </div>

        <form className="shrink-0 px-5 pb-4 sm:px-10 sm:pb-6" onSubmit={send}>
          <div className="mx-auto w-full max-w-4xl">
            <AgentChatComposer
              busy={answering}
              hasError={Boolean(chatError)}
              value={message}
              onValueChange={setMessage}
            />
            {chatError && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p id="chat-error" className="text-sm text-destructive" role="alert">{chatError}</p>
                {failedRequest && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={answering}
                    onClick={() => void requestAnswer(failedRequest, false)}
                  >
                    Retry question
                  </Button>
                )}
              </div>
            )}
          </div>
        </form>
      </TabsContent>

      <TabsContent
        value="voice"
        className="mt-0 flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-5 pb-16 data-[state=inactive]:hidden sm:pb-24"
      >
        <AgentAvatar seed="carely-demo-agent" size={144} aria-label="Carely voice agent" />
        <VoiceCall />
      </TabsContent>
    </Tabs>
  );
}
