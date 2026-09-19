"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const SYSTEM_PROMPT = `You are Sravs, the AI assistant inside "Sravs Sandbox" — a virtual coding sandbox where visitors chat with you and run code instantly.

Rules:
- Be friendly, concise and practical. Default to working code over long explanations.
- ALWAYS put code in fenced blocks with a language tag: js, ts, javascript, typescript, python, html, or css. Visitors can run js/ts/python/html blocks directly in the sandbox.
- For web demos, prefer a single self-contained html block (inline CSS/JS) so it can be previewed.
- Python runs in the browser via Pyodide: standard library is available, browser APIs and pip are not (micropip excepted).
- JS/TS run in a Web Worker: use console.log for output; DOM APIs are not available.
- When asked who you are: you are Sravs, the voice-enabled AI assistant of Sravs Sandbox.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

/** Deterministic offline demo so the sandbox still works before an API key is added. */
function fallbackResponse(messages: ChatMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const q = (last?.content ?? "").toLowerCase();

  if (/python|py\b/.test(q)) {
    return `Here's a quick Python demo — hit **Run** on the block below:

\`\`\`python
import math

def primes_below(n):
    sieve = [True] * n
    sieve[0] = sieve[1] = False
    for i in range(2, int(math.isqrt(n)) + 1):
        if sieve[i]:
            for j in range(i * i, n, i):
                sieve[j] = False
    return [i for i, is_p in enumerate(sieve) if is_p]

p = primes_below(50)
print(f"Primes below 50: {p}")
print(f"Count: {len(p)}")
\`\`\`

Sravs runs Python right in your browser via WebAssembly — no server, no setup.`;
  }

  if (/html|web|page|website|ui|button|css/.test(q)) {
    return `Here's a tiny interactive web page — **Run** it to see the live preview:

\`\`\`html
<!doctype html>
<html>
  <body style="font-family: system-ui; display: grid; place-items: center; height: 100vh; margin: 0; background: #f0f7ff;">
    <div style="text-align: center;">
      <h1 style="color: #1d4ed8;">Hello from Sravs Sandbox 👋</h1>
      <button onclick="count()" style="background: #1d4ed8; color: white; border: 0; padding: 10px 22px; border-radius: 10px; font-size: 16px; cursor: pointer;">
        Clicked <span id="n">0</span> times
      </button>
    </div>
    <script>
      let n = 0;
      function count() {
        n++;
        document.getElementById("n").textContent = n;
      }
    </script>
  </body>
</html>
\`\`\`

The preview renders in a sandboxed iframe — fully isolated from this page.`;
  }

  return `Welcome to **Sravs Sandbox**! I'm Sravs, your AI assistant — ask me to write code and run it right here.

Try **Run** on this block:

\`\`\`js
const sandbox = { name: "Sravs", runtime: "Web Worker", languages: ["js", "ts", "python", "html"] };
console.log("Sandbox online 🚀", sandbox);

for (let i = 1; i <= 5; i++) {
  console.log(\`\${i} × \${i} = \${i * i}\`);
}
\`\`\`

> Demo mode: add an \`OPENAI_API_KEY\` in the project's Keys panel to unlock full conversational answers.`;
}

export const chat = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
  },
  handler: async (_ctx, args): Promise<{ text: string; model: string }> => {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return { text: fallbackResponse(args.messages), model: "sravs-demo" };
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...args.messages.slice(-20),
        ],
        max_tokens: 1500,
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `OpenAI request failed (${res.status}): ${detail.slice(0, 300)}`,
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    return { text, model: "gpt-4o-mini" };
  },
});
