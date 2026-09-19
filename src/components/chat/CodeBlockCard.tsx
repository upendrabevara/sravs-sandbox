import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  langLabel,
  probeHtmlScripts,
  runJsLike,
  runPython,
  makePreviewSrcdoc,
  type RunnableLang,
  type SandboxResult,
} from "@/sandbox/sandboxClient";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  SquareTerminal,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const ALIASES: Record<string, string> = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  py: "python",
  python: "python",
  html: "html",
};

const CONSOLE_COLORS: Record<string, string> = {
  info: "text-foreground/85",
  warn: "text-amber-600 dark:text-amber-400",
  error: "text-red-500",
  system: "text-primary/80",
};

export function CodeBlockCard({ code, lang }: { code: string; lang: string }) {
  const normalized = ALIASES[lang.toLowerCase()] ?? null;
  const [selected, setSelected] = useState<RunnableLang>(
    (normalized as RunnableLang | null) ?? "javascript",
  );
  const [codeOverride, setCodeOverride] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [outputOpen, setOutputOpen] = useState(true);
  const consoleRef = useRef<HTMLDivElement>(null);

  const effectiveCode = codeOverride ?? code;
  const runnable = normalized !== null;

  // Open editable state resets when the block's source changes
  useEffect(() => {
    setCodeOverride(null);
    setResult(null);
  }, [code]);

  useEffect(() => {
    consoleRef.current?.scrollTo({ top: consoleRef.current.scrollHeight });
  }, [result]);

  const srcdoc = useMemo(
    () => (selected === "html" ? makePreviewSrcdoc(effectiveCode) : ""),
    [selected, effectiveCode],
  );

  const run = async () => {
    if (running) return;
    setRunning(true);
    setResult(null);
    setOutputOpen(true);
    try {
      let res: SandboxResult;
      if (selected === "python") {
        res = await runPython(effectiveCode);
      } else if (selected === "html") {
        res = await probeHtmlScripts(effectiveCode);
      } else {
        res = await runJsLike(effectiveCode, selected);
      }
      setResult(res);
    } catch (err) {
      setResult({
        ok: false,
        logs: [],
        durationMs: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRunning(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(effectiveCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-primary/15 bg-slate-50/80 shadow-sm dark:bg-slate-900/60">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 bg-white/70 px-3 py-2 dark:bg-slate-900/80">
        <SquareTerminal className="size-3.5 shrink-0 text-primary" />
        {runnable ? (
          <div className="relative">
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value as RunnableLang);
                setResult(null);
              }}
              className="appearance-none rounded-md border border-primary/20 bg-background py-0.5 pl-2 pr-6 text-xs font-semibold text-primary/90 outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="html">HTML</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-primary/60" />
          </div>
        ) : (
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {langLabel(lang)}
          </Badge>
        )}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={copy}
          title="Copy code"
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-600" />
          ) : (
            <Copy className="size-3.5 text-muted-foreground" />
          )}
        </Button>
        {runnable && (
          <Button
            size="sm"
            className="h-7 gap-1.5 rounded-md px-3 text-xs font-semibold"
            onClick={run}
            disabled={running}
          >
            {running ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Play className="size-3" />
            )}
            {running ? "Running…" : "Run"}
          </Button>
        )}
      </div>

      {/* Editable code area */}
      <textarea
        value={effectiveCode}
        onChange={(e) => setCodeOverride(e.target.value)}
        spellCheck={false}
        rows={Math.min(20, Math.max(3, effectiveCode.split("\n").length))}
        className="block w-full resize-y bg-white/95 px-4 py-3 font-mono text-[13px] leading-relaxed text-slate-800 outline-none placeholder:text-muted-foreground dark:bg-slate-950/70 dark:text-slate-200"
      />

      {/* Output */}
      {result && (
        <div className="border-t border-primary/10 bg-white dark:bg-slate-950/80">
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
            onClick={() => setOutputOpen((v) => !v)}
          >
            <Badge
              variant="secondary"
              className={`gap-1 text-[10px] font-semibold ${
                result.ok
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300"
              }`}
            >
              {result.ok ? "✓ Done" : "✕ Error"}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {result.durationMs > 0 && `${(result.durationMs / 1000).toFixed(2)}s`}
            </span>
            <div className="flex-1" />
            <ChevronDown
              className={`size-3.5 text-muted-foreground transition-transform ${outputOpen ? "" : "-rotate-90"}`}
            />
          </button>

          {outputOpen && (
            <div className="px-3 pb-3">
              {selected === "html" ? (
                <div className="overflow-hidden rounded-lg border border-primary/15 bg-white">
                  <iframe
                    title="Sravs Sandbox preview"
                    srcDoc={srcdoc}
                    sandbox="allow-scripts allow-popups"
                    className="h-64 w-full bg-white"
                  />
                </div>
              ) : (
                <div
                  ref={consoleRef}
                  className="max-h-64 overflow-auto rounded-lg border border-primary/15 bg-slate-950 px-3 py-2.5 font-mono text-xs leading-relaxed"
                >
                  {result.logs.length === 0 && !result.error && (
                    <p className="text-slate-500">// no output</p>
                  )}
                  {result.logs.map((log, i) => (
                    <pre
                      key={i}
                      className={`whitespace-pre-wrap break-words ${
                        log.level === "error"
                          ? "text-red-400"
                          : log.level === "warn"
                            ? "text-amber-300"
                            : "text-slate-200"
                      }`}
                    >
                      {log.text}
                    </pre>
                  ))}
                  {result.error && (
                    <pre className="mt-1 whitespace-pre-wrap break-words text-red-400">
                      ⨯ {result.error}
                    </pre>
                  )}
                </div>
              )}
              {selected === "html" && result.error && (
                <p className="mt-1.5 text-xs text-red-500">{result.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-2 bg-white/70 px-3 py-1.5 dark:bg-slate-900/80">
        {result && selected === "html" && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
              onClick={() => {
                const w = window.open("", "_blank");
                if (w) {
                  w.document.open();
                  w.document.write(effectiveCode);
                  w.document.close();
                }
              }}
            >
              <ExternalLink className="size-3" /> Open in tab
            </Button>
            <Separator orientation="vertical" className="h-3.5" />
          </>
        )}
        {result && selected !== "html" && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
              onClick={() => {
                setResult(null);
                void run();
              }}
            >
              <RefreshCw className="size-3" /> Run again
            </Button>
            <Separator orientation="vertical" className="h-3.5" />
          </>
        )}
        <span className="text-[10px] text-muted-foreground/70">
          {runnable ? "Runs in-browser · sandboxed" : "Snippet"}
        </span>
      </div>
    </div>
  );
}
