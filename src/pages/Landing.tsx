import { ChatWindow } from "@/components/chat/ChatWindow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowRight,
  AudioLines,
  Braces,
  Gauge,
  Globe,
  Mic,
  Play,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Waves,
} from "lucide-react";
import { Link } from "react-router";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: TerminalSquare,
    title: "Run real code",
    desc: "JavaScript, TypeScript and Python execute in isolated Web Workers — nothing touches your machine.",
  },
  {
    icon: Globe,
    title: "Live HTML previews",
    desc: "Generated web pages render instantly in a sandboxed iframe you can open full-size.",
  },
  {
    icon: AudioLines,
    title: "Voice assistant",
    desc: "Talk to Sravs and hear the answers. Voice in, code out — hands free.",
  },
  {
    icon: ShieldCheck,
    title: "Locked-down sandbox",
    desc: "Every run is disposable and isolated. Break things fearlessly — reset with one click.",
  },
  {
    icon: Gauge,
    title: "Zero setup",
    desc: "No installs, no accounts, no waiting. Open the page and start building.",
  },
  {
    icon: Braces,
    title: "AI codegen",
    desc: "Sravs writes runnable snippets on demand — then you tweak and re-run in place.",
  },
];

const STEPS = [
  { icon: Mic, label: "Ask (or type)" },
  { icon: Sparkles, label: "Sravs generates" },
  { icon: Play, label: "Run instantly" },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative flex min-h-screen flex-col overflow-hidden bg-white"
    >
      {/* Backdrop decorations */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -top-32 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute right-[-160px] top-1/3 h-72 w-72 rounded-full bg-sky-300/30 blur-3xl" />
        <div className="absolute bottom-[-120px] left-[-120px] h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(37,99,235,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.045)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-700 text-white shadow-md shadow-blue-600/25">
            <Waves className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-extrabold tracking-tight text-blue-950">
              Sravs Sandbox
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary/70">
              AI Virtual Sandbox
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/dashboard">
            <Button variant="ghost" className="text-sm text-blue-950/80 hover:text-primary">
              Workspace
            </Button>
          </Link>
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button className="rounded-xl shadow-sm shadow-blue-600/20">
                Open sandbox <ArrowRight className="ml-1 size-4" />
              </Button>
            </Link>
          ) : (
            <Link to="/auth?returnTo=/dashboard">
              <Button className="rounded-xl shadow-sm shadow-blue-600/20">
                Sign in <ArrowRight className="ml-1 size-4" />
              </Button>
            </Link>
          )}
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4">
        <section className="grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Badge
              variant="secondary"
              className="mb-5 gap-1.5 border border-blue-200/80 bg-white/70 px-3 py-1 text-[11px] font-semibold text-primary"
            >
              <Sparkles className="size-3" /> Voice-enabled · v1 preview
            </Badge>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-blue-950 sm:text-5xl lg:text-[3.4rem]">
              A virtual sandbox that{" "}
              <span className="bg-gradient-to-r from-primary via-blue-600 to-sky-500 bg-clip-text text-transparent">
                writes, runs & speaks
              </span>{" "}
              code with you.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-slate-600">
              Sravs is your AI copilot inside a browser-native sandbox. Ask for any
              snippet, then run JavaScript, TypeScript, Python or live HTML right in the
              chat — isolated, instant, zero setup.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button size="lg" className="h-12 rounded-xl px-6 text-[15px] font-semibold shadow-lg shadow-blue-600/25">
                    Open your sandbox <ArrowRight className="ml-1.5 size-4" />
                  </Button>
                </Link>
              ) : (
                <Link to="/auth?returnTo=/dashboard">
                  <Button size="lg" className="h-12 rounded-xl px-6 text-[15px] font-semibold shadow-lg shadow-blue-600/25">
                    Start building free <ArrowRight className="ml-1.5 size-4" />
                  </Button>
                </Link>
              )}
              <a href="#try">
                <Button size="lg" variant="outline" className="h-12 rounded-xl border-blue-200 px-6 text-[15px] font-semibold text-primary hover:bg-blue-50">
                  Try it right here <Play className="ml-1.5 size-4" />
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Python via
                WebAssembly
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-blue-500" /> Web Worker isolation
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-sky-400" /> Voice in & out
              </span>
            </div>
          </motion.div>

          {/* Embedded chat window */}
          <motion.section
            id="try"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="scroll-mt-24 lg:-mt-6"
          >
            <ChatWindow className="h-[560px]" />
            <p className="mt-3 text-center text-[11px] text-slate-400">
              Live demo — no signup needed. Sign in to keep a workspace.
            </p>
          </motion.section>
        </section>

        {/* How it works */}
        <section className="py-8">
          <div className="grid gap-3 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white/80 px-5 py-4 shadow-sm"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary">
                  <s.icon className="size-4.5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary/60">
                    Step {i + 1}
                  </p>
                  <p className="text-sm font-semibold text-blue-950">{s.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-10">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-blue-950 sm:text-3xl">
              Everything a sandbox should be
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
              Built for public visitors — nothing to install, nothing to configure.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.08 }}
                className="group rounded-2xl border border-blue-100 bg-white/85 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-blue-600/10"
              >
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-sky-100 text-primary transition-transform group-hover:scale-105">
                  <f.icon className="size-5" />
                </div>
                <h3 className="text-[15px] font-bold text-blue-950">{f.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="pb-16">
          <div className="relative overflow-hidden rounded-3xl border border-blue-200/70 bg-gradient-to-br from-blue-600 via-primary to-blue-800 px-6 py-12 text-center shadow-xl shadow-blue-700/20 sm:px-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_50%)]" />
            <div className="relative">
              <Waves className="mx-auto mb-4 size-8 text-white/90" />
              <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Ready to build with Sravs?
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-blue-100">
                Open the sandbox, ask for anything, and watch it run — right before your
                eyes.
              </p>
              <Link to={isAuthenticated ? "/dashboard" : "/auth?returnTo=/dashboard"} className="mt-6 inline-block">
                <Button size="lg" variant="secondary" className="h-12 rounded-xl bg-white px-8 text-[15px] font-bold text-primary hover:bg-blue-50">
                  {isAuthenticated ? "Open sandbox" : "Get started — it's free"}
                  <ArrowRight className="ml-1.5 size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-blue-100 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-slate-500 sm:flex-row">
          <p className="flex items-center gap-1.5">
            <Waves className="size-3.5 text-primary" />
            <span className="font-semibold text-blue-950">Sravs Sandbox</span> — AI
            virtual sandbox, v1
          </p>
          <p>Code runs locally in your browser. Nothing is stored.</p>
        </div>
      </footer>
    </motion.div>
  );
}
