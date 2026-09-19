import { JS_WORKER_SOURCE } from "./jsWorkerSource";

export type SandboxLog = {
  level: "info" | "warn" | "error" | "system";
  text: string;
};

export type SandboxResult = {
  ok: boolean;
  logs: SandboxLog[];
  durationMs: number;
  error?: string;
};

/** Languages Sravs Sandbox v1 can execute in the browser. */
export const RUNNABLE_LANGS = [
  "javascript",
  "typescript",
  "python",
  "html",
] as const;
export type RunnableLang = (typeof RUNNABLE_LANGS)[number];

export function langLabel(lang: string): string {
  switch (lang) {
    case "javascript":
      return "JavaScript";
    case "typescript":
      return "TypeScript";
    case "python":
      return "Python";
    case "html":
      return "HTML";
    default:
      return lang;
  }
}

export function isRunnable(lang: string): boolean {
  return (RUNNABLE_LANGS as readonly string[]).includes(lang);
}

let jsWorkerUrl: string | null = null;
function getJsWorkerUrl(): string {
  if (!jsWorkerUrl) {
    jsWorkerUrl = URL.createObjectURL(
      new Blob([JS_WORKER_SOURCE], { type: "text/javascript" }),
    );
  }
  return jsWorkerUrl;
}

const JS_TIMEOUT_MS = 15_000;
const PY_FIRST_RUN_TIMEOUT_MS = 180_000; // Pyodide first boot downloads the WASM runtime
const PY_RUN_TIMEOUT_MS = 60_000;

type WorkerOutcome =
  | { kind: "done"; logs: SandboxLog[]; durationMs: number }
  | { kind: "error"; logs: SandboxLog[]; durationMs: number; error: string };

function runInWorker(
  worker: Worker,
  code: string,
  timeoutMs: number,
  terminateOnFinish = true,
): Promise<WorkerOutcome> {
  return new Promise<WorkerOutcome>((resolve) => {
    const logs: SandboxLog[] = [];
    let settled = false;

    const finish = (outcome: WorkerOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.onmessage = null;
      worker.onerror = null;
      if (terminateOnFinish) worker.terminate();
      resolve(outcome);
    };

    const timer = setTimeout(() => {
      finish({
        kind: "error",
        logs,
        durationMs: timeoutMs,
        error: `Execution timed out after ${Math.round(timeoutMs / 1000)}s`,
      });
    }, timeoutMs);

    worker.onerror = (e) => {
      finish({
        kind: "error",
        logs,
        durationMs: Date.now() - started,
        error: e.message || "Worker crashed",
      });
    };

    const started = Date.now();

    worker.onmessage = (e: MessageEvent) => {
      const { type, level, text, message, durationMs } = e.data;
      if (type === "log") {
        logs.push({ level: level === "warn" || level === "error" ? level : "info", text });
      } else if (type === "done") {
        finish({ kind: "done", logs, durationMs: Date.now() - started });
      } else if (type === "error") {
        finish({
          kind: "error",
          logs,
          durationMs: durationMs ?? Date.now() - started,
          error: message,
        });
      }
    };

    worker.postMessage({ code });
  });
}

/** Run JavaScript or TypeScript in a fresh Web Worker. TypeScript is transpiled first. */
export async function runJsLike(
  code: string,
  lang: "javascript" | "typescript",
): Promise<SandboxResult> {
  let source = code;
  if (lang === "typescript") {
    try {
      const { transform } = await import("sucrase");
      source = transform(code, {
        transforms: ["typescript", "imports"],
        disableESTransforms: true,
        production: true,
      }).code;
    } catch (err) {
      return {
        ok: false,
        logs: [],
        durationMs: 0,
        error: `TypeScript error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // Strip import/export statements — v1 runs single-file snippets, not modules.
  source = source
    .replace(/^\s*import\s.+;?\s*$/gm, "")
    .replace(/^\s*export\s+(?=(const|let|var|function|class|async|default))/gm, "");

  const worker = new Worker(getJsWorkerUrl());
  const outcome = await runInWorker(worker, source, JS_TIMEOUT_MS);

  if (outcome.kind === "done") {
    return { ok: true, logs: outcome.logs, durationMs: outcome.durationMs };
  }
  return {
    ok: false,
    logs: outcome.logs,
    durationMs: outcome.durationMs,
    error: outcome.error,
  };
}

let pyWorker: Worker | null = null;
let pyBusy = false;

function getPyWorker(): Worker {
  if (!pyWorker) {
    pyWorker = new Worker(new URL("./pyodide.worker.ts", import.meta.url), {
      type: "module",
    });
  }
  return pyWorker;
}

/** Run Python in a persistent Pyodide worker (state persists across runs in-session). */
export async function runPython(code: string): Promise<SandboxResult> {
  const worker = getPyWorker();
  if (pyBusy) {
    return {
      ok: false,
      logs: [],
      durationMs: 0,
      error: "A Python run is already in progress — try again in a moment.",
    };
  }
  pyBusy = true;

  try {
    const outcome = await runInWorker(worker, code, PY_FIRST_RUN_TIMEOUT_MS, false);
    if (outcome.kind === "done") {
      return { ok: true, logs: outcome.logs, durationMs: outcome.durationMs };
    }
    return {
      ok: false,
      logs: outcome.logs,
      durationMs: outcome.durationMs,
      error: outcome.error,
    };
  } finally {
    pyBusy = false;
  }
}

export function resetPythonRuntime(): void {
  if (pyWorker) {
    pyWorker.terminate();
    pyWorker = null;
  }
}

/** Build an isolated, sandboxed iframe document for HTML previews. */
export function buildPreviewDoc(code: string): string {
  const inject = `<base target="_blank"><style>
    ::-webkit-scrollbar{width:10px;height:10px}
    ::-webkit-scrollbar-thumb{background:#c3d8f5;border-radius:8px}
  </style>`;
  if (/<head[^>]*>/i.test(code)) {
    return code.replace(/<head([^>]*)>/i, `<head$1>${inject}`);
  }
  return inject + code;
}

export function makePreviewSrcdoc(code: string): string {
  return buildPreviewDoc(code);
}

const HTML_TIMEOUT_MS = 10_000;

/**
 * Smoke-test an HTML snippet's inline scripts in a JS worker before showing the
 * preview, so crashes surface as console output instead of a silent white iframe.
 */
export async function probeHtmlScripts(code: string): Promise<SandboxResult> {
  const scripts: string[] = [];
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m[1] && m[1].trim()) scripts.push(m[1]);
  }
  if (scripts.length === 0) {
    return {
      ok: true,
      logs: [
        { level: "system", text: "Preview ready — static HTML, no scripts to test." },
      ],
      durationMs: 0,
    };
  }

  const worker = new Worker(getJsWorkerUrl());
  const outcome = await runInWorker(worker, scripts.join("\n;\n"), HTML_TIMEOUT_MS);
  const logs: SandboxLog[] = [
    { level: "system", text: "Preview ready — scripts smoke-tested in an isolated worker." },
    ...outcome.logs,
  ];
  if (outcome.kind === "done") {
    return { ok: true, logs, durationMs: outcome.durationMs };
  }
  return {
    ok: false,
    logs,
    durationMs: outcome.durationMs,
    error: `Script error in preview: ${outcome.error}`,
  };
}
