/// <reference lib="webworker" />

/* eslint-disable @typescript-eslint/no-explicit-any */

const PYODIDE_VERSION = "0.27.5";
const CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const ctx = self as unknown as Worker;

let pyodide: any = null;
let loading: Promise<any> | null = null;

async function getPyodide(): Promise<any> {
  if (pyodide) return pyodide;
  if (!loading) {
    loading = (async () => {
      const url = `${CDN}pyodide.mjs`;
      const mod: any = await import(/* @vite-ignore */ url);
      const py = await mod.loadPyodide({ indexURL: CDN });
      py.setStdout({ batched: (s: string) => post("log", { level: "info", text: s }) });
      py.setStderr({ batched: (s: string) => post("log", { level: "error", text: s }) });
      return py;
    })();
    loading = loading.catch((err) => {
      loading = null;
      throw err;
    });
  }
  pyodide = await loading;
  return pyodide;
}

function post(type: string, payload: Record<string, unknown>) {
  ctx.postMessage({ type, ...payload });
}

ctx.onmessage = async (e: MessageEvent) => {
  const { code } = e.data as { code: string };
  const started = Date.now();
  try {
    post("status", { message: "Booting Python (WebAssembly)…" });
    const py = await getPyodide();
    await py.runPythonAsync(code);
    post("done", { durationMs: Date.now() - started });
  } catch (err: any) {
    const message =
      err && err.message ? String(err.message) : String(err ?? "Python error");
    post("error", { message, durationMs: Date.now() - started });
  }
};

export {};
