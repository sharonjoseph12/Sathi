import { Component, type ReactNode } from "react";

// Catches render crashes (e.g. hook errors) so the whole tree never whitescreens.
export class ErrorBoundary extends Component<{ children: ReactNode }, { err: string }> {
  state = { err: "" };
  static getDerivedStateFromError(e: unknown) { return { err: e instanceof Error ? e.message : "Something broke" }; }
  componentDidCatch(e: unknown) {
    try { console.error("[sathi-error-boundary]", e); } catch { /* noop */ }
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="mx-auto grid max-w-[420px] min-h-screen content-center gap-3 p-6 text-center">
        <p className="text-4xl" aria-hidden="true">🧸💥</p>
        <h1 className="font-extrabold">Sathi hit a snag</h1>
        <p role="alert" className="rounded-2xl bg-muted p-3 text-xs">{this.state.err}</p>
        <button aria-label="Restart app" className="min-h-[44px] rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white"
          onClick={() => { this.setState({ err: "" }); location.hash = "#/home"; location.reload(); }}>Restart app</button>
      </div>
    );
  }
}
