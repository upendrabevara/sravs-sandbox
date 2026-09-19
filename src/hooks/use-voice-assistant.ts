import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings for the (still unstandardized) Web Speech API */
interface SpeechRecognitionResultItem {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionResultItem;
  length: number;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean {
  return getRecognitionCtor() !== null;
}

function stripMarkdownForSpeech(text: string): string {
  const hasCode = /```/.test(text);
  // Don't read code aloud — summarize instead.
  let spoken = hasCode ? text.split("```")[0] : text;
  spoken = spoken
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .trim();

  if (hasCode) {
    spoken =
      (spoken ? spoken + " " : "") +
      "I've added a runnable code block to the chat — press Run to try it.";
  }
  return spoken || "Done.";
}

/** Strip markdown for TTS and speak it. Returns a cancel function. */
export function speakText(text: string, onEnd?: () => void): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return () => {};
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(stripMarkdownForSpeech(text));
  utter.rate = 1.02;
  utter.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => /en[-_]/i.test(v.lang) && /female|samantha|zira|aria/i.test(v.name)) ??
    voices.find((v) => /^en/i.test(v.lang));
  if (preferred) utter.voice = preferred;
  utter.onend = () => onEnd?.();
  utter.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utter);
  return () => {
    window.speechSynthesis.cancel();
    onEnd?.();
  };
}

export type VoiceState = "idle" | "listening" | "speaking";

/**
 * Voice assistant plumbing for Sravs: speech-to-text (auto-send) and
 * text-to-speech replies with a global mute.
 */
export function useVoiceAssistant(onFinalTranscript: (text: string) => void) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [interim, setInterim] = useState("");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const cancelSpeechRef = useRef<(() => void) | null>(null);
  const transcriptCbRef = useRef(onFinalTranscript);
  transcriptCbRef.current = onFinalTranscript;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      cancelSpeechRef.current?.();
    };
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Voice input isn't supported in this browser — try Chrome or Edge.");
      return;
    }
    setError(null);
    cancelSpeechRef.current?.(); // stop TTS before listening

    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.lang = navigator.language || "en-US";
    rec.continuous = false;
    rec.interimResults = true;

    let finalText = "";
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim(interimText);
    };
    rec.onerror = (e) => {
      const code = e.error ?? "unknown";
      setError(
        code === "not-allowed"
          ? "Microphone permission denied."
          : code === "no-speech"
            ? "Didn't catch that — try again."
            : `Voice error: ${code}`,
      );
    };
    rec.onend = () => {
      setVoiceState("idle");
      setInterim("");
      recognitionRef.current = null;
      const text = finalText.trim();
      if (text) transcriptCbRef.current(text);
    };

    try {
      rec.start();
      setVoiceState("listening");
    } catch {
      setError("Couldn't start the microphone.");
    }
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (mutedRef.current) return;
      cancelSpeechRef.current?.();
      setVoiceState("speaking");
      cancelSpeechRef.current = speakText(text, () => {
        setVoiceState((s) => (s === "speaking" ? "idle" : s));
        cancelSpeechRef.current = null;
      });
    },
    [],
  );

  const stopSpeaking = useCallback(() => {
    cancelSpeechRef.current?.();
    setVoiceState((s) => (s === "speaking" ? "idle" : s));
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((m) => {
      if (!m) cancelSpeechRef.current?.();
      return !m;
    });
  }, []);

  return {
    voiceState,
    interim,
    error,
    muted,
    speechSupported: speechSupported(),
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleMuted,
  };
}
