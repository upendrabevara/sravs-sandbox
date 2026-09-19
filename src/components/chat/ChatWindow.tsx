import { CodeBlockCard } from "@/components/chat/CodeBlockCard";
import { Button } from "@/components/ui/button";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
import {
  ArrowUp,
  AudioLines,
  Bot,
  Mic,
  MicOff,
  Sparkles,
  VolumeX,
  Waves,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Role = "user" | "assistant";
type ChatMsg = { id: string; role: Role; content: string };

type Segment =
  | { kind: "text"; content: string }
  | { kind: "code"; lang: string; content: string; id: string };

/** Split assistant markdown into prose and fenced code segments. */
function parseSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  const re = /```([a-zA-Z0-9+#-]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) {
      segments.push({ kind: "text", content: content.slice(last, m.index) });
    }
    segments.push({
      kind: "code",
      lang: m[1] || "text",
      content: m[2].replace(/\n$/, ""),
      id: `c${i++}`,
    });
    last = m.index + m[0].length;
  }
  if (last < content.length) {
    segments.push({ kind: "text", content: content.slice(last) });
  }
  return segments;
}

function Prose({ content }: { content: string }) {
  // Light inline formatting: **bold**, `code`, and paragraph breaks.
  const blocks = content.trim().split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => (
        <p key={i} className="whitespace-pre-wrap text-[13.5px] leading-relaxed">
          {b.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={j} className="font-semibold">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith("`") && part.endsWith("`")) {
              return (
                <code
                  key={j}
                  className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[12px] text-primary"
                >
                  {part.slice(1, -1)}
                </code>
              );
            }
            return <span key={j}>{part}</span>;
          })}
        </p>
      ))}
    </div>
  );
}

const SUGGESTIONS = [
  "Write a Python prime sieve and run it",
  "Build a click-counter web page I can preview",
  "Show me a TypeScript debounce function",
  "Explain closures, then demo one in JS",
];

function Orb({ state }: { state: "idle" | "listening" | "speaking" }) {
  return (
    <div className="relative flex size-7 shrink-0 items-center justify-center">
      {state !== "idle" && (
        <span
          className={`absolute inset-0 rounded-full ${
            state === "listening"
              ? "animate-ping bg-blue-400/50"
              : "animate-ping bg-primary/40"
          }`}
        />
      )}
      <div
        className={`relative flex size-7 items-center justify-center rounded-full text-white shadow-sm transition-colors ${
          state === "listening"
            ? "bg-blue-500"
            : state === "speaking"
              ? "bg-gradient-to-br from-primary to-blue-600"
              : "bg-gradient-to-br from-primary to-blue-700"
        }`}
      >
        {state === "idle" ? (
          <Bot className="size-4" />
        ) : state === "listening" ? (
          <Mic className="size-3.5" />
        ) : (
          <AudioLines className="size-3.5" />
        )}
      </div>
    </div>
  );
}

export function ChatWindow({ className }: { className?: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [model, setModel] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sendToAi = useAction(api.ai.chat);
  const speakRef = useRef<((text: string) => void) | null>(null);

  const handleSend = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || thinking) return;
      setInput("");
      setThinking(true);

      const userMsg: ChatMsg = { id: `u${Date.now()}`, role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const res = await sendToAi({ messages: history });
        setModel(res.model);
        const aiMsg: ChatMsg = {
          id: `a${Date.now()}`,
          role: "assistant",
          content: res.text,
        };
        setMessages((prev) => [...prev, aiMsg]);
        speakRef.current?.(res.text);
      } catch (err) {
        const aiMsg: ChatMsg = {
          id: `e${Date.now()}`,
          role: "assistant",
          content: `Something went wrong talking to my brain: ${
            err instanceof Error ? err.message : String(err)
          }.\n\nYou can still run code locally — try the sandbox!`,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } finally {
        setThinking(false);
        inputRef.current?.focus();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input, messages, thinking, sendToAi],
  );

  const voice = useVoiceAssistant((text) => void handleSend(text));
  speakRef.current = voice.speak;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking, voice.interim]);

  const busy = thinking || voice.voiceState === "speaking";

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-blue-200/70 bg-white shadow-[0_8px_40px_-12px_rgba(30,64,175,0.25)] ${className ?? ""}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-blue-100 bg-gradient-to-r from-blue-50/80 to-white px-4 py-3">
        <Orb state={voice.voiceState} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-blue-950">
            Sravs
            <Sparkles className="size-3.5 text-primary" />
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {voice.voiceState === "listening"
              ? "Listening… speak now"
              : voice.voiceState === "speaking"
                ? "Speaking — tap to interrupt"
                : thinking
                  ? "Thinking…"
                  : "Your AI sandbox copilot"}
          </p>
        </div>
        <div className="flex-1" />
        {model && (
          <span className="hidden rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-primary sm:block">
            {model}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={`size-8 ${voice.muted ? "text-muted-foreground" : "text-primary"}`}
          title={voice.muted ? "Unmute Sravs' voice" : "Mute Sravs' voice"}
          onClick={voice.toggleMuted}
        >
          {voice.muted ? <VolumeX className="size-4" /> : <AudioLines className="size-4" />}
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !thinking && (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-white shadow-lg shadow-blue-600/20">
              <Waves className="size-7" />
            </div>
            <div>
              <p className="text-base font-bold text-blue-950">
                Hey, I'm Sravs 👋
              </p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                Ask me to write code — then hit <span className="font-semibold text-primary">Run</span> right
                here. JavaScript, TypeScript, Python and live HTML previews, all in your
                browser.
              </p>
            </div>
            <div className="flex max-w-md flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void handleSend(s)}
                  className="rounded-full border border-blue-200 bg-blue-50/60 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:border-primary/40 hover:bg-blue-100 hover:shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && <Orb state="idle" />}
              <div
                className={
                  msg.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[13.5px] leading-relaxed text-primary-foreground shadow-sm"
                    : "max-w-full min-w-0 flex-1"
                }
              >
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  parseSegments(msg.content).map((seg, idx) =>
                    seg.kind === "text" && seg.content.trim() ? (
                      <Prose key={`t${idx}`} content={seg.content} />
                    ) : seg.kind === "code" ? (
                      <CodeBlockCard key={seg.id} code={seg.content} lang={seg.lang} />
                    ) : null,
                  )
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {thinking && (
          <div className="flex items-center gap-2.5">
            <Orb state="speaking" />
            <div className="flex items-center gap-1 rounded-2xl bg-blue-50 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-bounce rounded-full bg-primary/70"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {voice.interim && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl bg-blue-100 px-4 py-2.5 text-[13.5px] italic text-primary/80">
              {voice.interim}
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-blue-100 bg-gradient-to-t from-blue-50/60 to-white p-3">
        {voice.error && (
          <p className="mb-2 text-center text-[11px] text-red-500">{voice.error}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Ask Sravs to build something… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="max-h-36 min-h-[42px] flex-1 resize-none rounded-xl border border-blue-200 bg-white px-3.5 py-2.5 text-[13.5px] leading-relaxed outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
          {voice.speechSupported && (
            <Button
              size="icon"
              variant={voice.voiceState === "listening" ? "default" : "outline"}
              className={`size-[42px] shrink-0 rounded-xl transition-all ${
                voice.voiceState === "listening"
                  ? "animate-pulse bg-blue-500 hover:bg-blue-600"
                  : "border-blue-200 text-primary hover:bg-blue-50"
              }`}
              title={voice.voiceState === "listening" ? "Stop listening" : "Talk to Sravs"}
              onClick={() =>
                voice.voiceState === "listening"
                  ? voice.stopListening()
                  : voice.startListening()
              }
            >
              {voice.voiceState === "listening" ? (
                <MicOff className="size-4" />
              ) : (
                <Mic className="size-4" />
              )}
            </Button>
          )}
          <Button
            size="icon"
            className="size-[42px] shrink-0 rounded-xl"
            disabled={!input.trim() || thinking}
            onClick={() => void handleSend()}
            title="Send"
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/70">
          Code runs sandboxed in your browser · Sravs can speak replies
          {busy ? " · tap the orb to stop audio" : ""}
        </p>
      </div>
    </div>
  );
}
