// Runs a live microphone conversation with Carely.
"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, PhoneOff } from "lucide-react";

import { finishVoiceCall, startVoiceCall } from "@/app/(dashboard)/try/actions";
import { Button } from "@/components/ui/button";
import type { ConversationAction, TranscriptEntry } from "@/lib/conversation-data";
import { createCallAudio, type CallAudio } from "@/lib/voice-audio";

type CallState = "connecting" | "error" | "idle" | "listening" | "speaking";

type ServerEvent =
  | { type: "error"; message: string }
  | { type: "action"; action: ConversationAction }
  | { type: "sources"; sources: string[] }
  | { type: "transcript"; entry: TranscriptEntry }
  | { type: "interrupted" | "ready" | "turn_complete" };

const STATUS_COPY: Record<CallState, string> = {
  connecting: "Connecting…",
  error: "Call stopped",
  idle: "Ready for a voice test",
  listening: "Listening",
  speaking: "Carely is speaking",
};

export function VoiceCall() {
  const [state, setState] = useState<CallState>("idle");
  const [error, setError] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<CallAudio | null>(null);
  const callIdRef = useRef<string | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const sourcesRef = useRef<string[]>([]);
  const actionsRef = useRef<ConversationAction[]>([]);
  const intentionalClose = useRef(false);

  async function endCall(nextState: CallState = "idle") {
    intentionalClose.current = true;
    const callId = callIdRef.current;
    callIdRef.current = null;
    socketRef.current?.close(1000, "Call ended");
    socketRef.current = null;
    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) await audio.close();
    if (callId) await finishVoiceCall(callId, {
      transcript: transcriptRef.current,
      sources: sourcesRef.current,
      actions: actionsRef.current,
    });
    setState(nextState);
  }

  async function startCall() {
    setState("connecting");
    setError("");
    intentionalClose.current = false;
    transcriptRef.current = [];
    sourcesRef.current = [];
    actionsRef.current = [];

    try {
      const result = await startVoiceCall();
      if (!result.ok) throw new Error(result.error);
      callIdRef.current = result.callId;

      let socket: WebSocket | null = null;
      audioRef.current = await createCallAudio(
        (pcm) => {
          if (socket?.readyState === WebSocket.OPEN) socket.send(pcm);
        },
        () => setState("listening"),
      );

      socket = new WebSocket(result.websocketUrl);
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;

      socket.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          setState("speaking");
          audioRef.current?.play(event.data);
          return;
        }

        const message = JSON.parse(event.data) as ServerEvent;
        if (message.type === "transcript") transcriptRef.current.push(message.entry);
        if (message.type === "sources") sourcesRef.current = message.sources;
        if (message.type === "action") actionsRef.current.push(message.action);
        if (message.type === "ready") setState("listening");
        if (message.type === "turn_complete") setState("listening");
        if (message.type === "interrupted") {
          audioRef.current?.stopPlayback();
          setState("listening");
        }
        if (message.type === "error") {
          setError(message.message);
          void endCall("error");
        }
      };
      socket.onerror = () => {
        setError("Could not connect to the voice agent.");
        void endCall("error");
      };
      socket.onclose = (event) => {
        if (event.code !== 1000 && !intentionalClose.current) {
          setError("The voice call ended unexpectedly.");
          void endCall("error");
        }
      };
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start the voice call.");
      await endCall("error");
    }
  }

  useEffect(() => {
    return () => {
      socketRef.current?.close(1000, "Page closed");
      const callId = callIdRef.current;
      callIdRef.current = null;
      if (callId) void finishVoiceCall(callId, {
        transcript: transcriptRef.current,
        sources: sourcesRef.current,
        actions: actionsRef.current,
      });
      void audioRef.current?.close();
    };
  }, []);

  const active = state !== "idle" && state !== "error";

  return (
    <div className="grid justify-items-center gap-4 text-center" aria-labelledby="voice-test-title">
      <h3 id="voice-test-title" className="sr-only">Voice test</h3>
      <p className="text-sm text-muted-foreground" aria-live="polite">{STATUS_COPY[state]}</p>
      {active ? (
        <Button type="button" variant="outline" className="min-h-11" onClick={() => void endCall()}>
          <PhoneOff aria-hidden="true" />
          End call
        </Button>
      ) : (
        <Button type="button" className="min-h-11" onClick={() => void startCall()}>
          <Mic aria-hidden="true" />
          Start voice test
        </Button>
      )}
      {error && <p className="max-w-sm text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
