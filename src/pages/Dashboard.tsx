import { ChatWindow } from "@/components/chat/ChatWindow";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { resetPythonRuntime } from "@/sandbox/sandboxClient";
import { LogOut, RotateCcw, ShieldCheck, Waves } from "lucide-react";
import { Link } from "react-router";

export default function Dashboard() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <main className="flex h-screen flex-col bg-gradient-to-b from-blue-50/70 via-white to-white">
      {/* Top bar */}
      <header className="z-10 flex items-center gap-3 border-b border-blue-100 bg-white/80 px-4 py-3 backdrop-blur">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-700 text-white shadow-md shadow-blue-600/25">
            <Waves className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-extrabold tracking-tight text-blue-950">
              Sravs Sandbox
            </p>
            <p className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-primary/70 sm:block">
              Workspace
            </p>
          </div>
        </Link>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-lg border-blue-200 text-primary hover:bg-blue-50"
          onClick={() => resetPythonRuntime()}
          title="Terminate the Python (Pyodide) runtime and free its memory"
        >
          <RotateCcw className="size-3.5" /> Reset Python
        </Button>
        <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground sm:block">
          {user?.name ?? user?.email ?? "Signed in"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 rounded-lg text-muted-foreground hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="size-3.5" /> Sign out
        </Button>
      </header>

      {/* Sandbox body */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-3 p-4 sm:p-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-emerald-500" />
          Sandboxed local runtime — code never leaves your browser. Ask, generate, run,
          repeat.
        </div>
        <ChatWindow className="min-h-0 flex-1" />
      </div>
    </main>
  );
}
