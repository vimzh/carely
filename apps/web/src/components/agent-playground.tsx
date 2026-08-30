// Provides a focused surface for testing Carely through voice and text.
"use client";

import { useRef, useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";

import { sendAgentMessage } from "@/app/(dashboard)/try/actions";
import { AgentChatComposer } from "@/components/agent-chat-composer";
import AgentAvatar from "@/components/smoothui/agent-avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceCall } from "@/components/voice-call";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

export function AgentPlayground() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [answering, setAnswering] = useState(false);
  const [chatError, setChatError] = useState("");
  const sessionId = useRef<string | null>(null);

  async function send(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const cleanMessage = message.trim();
    if (!cleanMessage || answering) return;

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: cleanMessage },
    ]);
    setMessage("");
    setChatError("");
    setAnswering(true);
    sessionId.current ??= crypto.randomUUID();
    const transcript = [
      ...messages.map(({ role, content }) => ({ role, text: content })),
      { role: "user" as const, text: cleanMessage },
    ];
    const result = await sendAgentMessage({ message: cleanMessage, sessionId: sessionId.current, transcript });
    setAnswering(false);

    if (!result.ok) {
      setChatError(result.error);
      return;
    }

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "assistant", content: result.response },
    ]);
  }

  return (
    <Tabs
      defaultValue="text"
      className="flex h-[calc(100svh-3.5rem)] min-h-0 flex-1 flex-col bg-paper-white md:h-svh"
    >
      <h1 className="sr-only">Try Carely</h1>

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
            {chatError && <p id="chat-error" className="mt-2 text-sm text-destructive" role="alert">{chatError}</p>}
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
