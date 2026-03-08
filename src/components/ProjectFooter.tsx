export default function ProjectFooter() {
  return (
    <footer className="border-t border-border px-6 py-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
        <span>Build: <span className="text-foreground/70">v1.0.4-stable</span></span>
        <span className="hidden sm:inline">Framework: <span className="text-foreground/70">PPO-CTDE</span></span>
        <span className="hidden sm:inline">License: <span className="text-foreground/70">MIT</span></span>
      </div>
      <div className="font-mono text-[10px] text-muted-foreground/50">
        © 2026 UrbanFlow AI — Fleet Coordination System
      </div>
    </footer>
  );
}
