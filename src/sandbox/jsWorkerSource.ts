/**
 * Source for the classic Web Worker that executes user JS/TS inside an
 * isolated realm. Created from a Blob URL at runtime; terminated after
 * every run so nothing persists between executions.
 */
export const JS_WORKER_SOURCE = String.raw`
self.onmessage = async (e) => {
  const { code } = e.data;
  const post = (type, payload) => self.postMessage(Object.assign({ type }, payload));

  const fmt = (v) => {
    if (typeof v === "string") return v;
    if (v instanceof Error) return v.name + ": " + v.message;
    if (typeof v === "function") return "[Function " + (v.name || "anonymous") + "]";
    if (typeof v === "bigint") return String(v) + "n";
    try {
      const s = JSON.stringify(v, null, 2);
      return s === undefined ? String(v) : s;
    } catch (_) {
      return String(v);
    }
  };

  const mkLog = (level) => (...args) =>
    post("log", { level, text: args.map(fmt).join(" ") });

  const sandboxConsole = {
    log: mkLog("info"),
    info: mkLog("info"),
    debug: mkLog("info"),
    table: mkLog("info"),
    trace: mkLog("info"),
    warn: mkLog("warn"),
    error: mkLog("error"),
  };

  const started = Date.now();
  try {
    const fn = new Function(
      "console",
      '"use strict"; return (async () => {\n' + code + "\n})();"
    );
    const result = await fn(sandboxConsole);
    if (result !== undefined) {
      post("log", { level: "info", text: "-> " + fmt(result) });
    }
    post("done", { durationMs: Date.now() - started });
  } catch (err) {
    let message = String(err);
    if (err && typeof err === "object") {
      message = err.name ? err.name + ": " + err.message : String(err.message || err);
    }
    post("error", { message, durationMs: Date.now() - started });
  }
};
`;
