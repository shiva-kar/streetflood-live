import { useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";

export default function SafetyBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <aside
      aria-label="Demo Prototype Notice"
      className="bg-amber-500/15 border-b border-amber-500/30 text-amber-950 dark:text-amber-200 px-3 py-1.5 text-xs flex items-center justify-between gap-2 transition-all"
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="truncate">
          <strong className="font-semibold">Hackathon Prototype:</strong> Uses simulated rainfall &
          sensor telemetry for Sion–Kurla corridor.{" "}
          <span className="hidden sm:inline">
            Not for real emergency navigation. In urgent life-threatening situations, dial{" "}
            <span className="font-bold underline">112</span>.
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-amber-500/20 rounded text-amber-900 dark:text-amber-300 transition-colors shrink-0"
        aria-label="Dismiss disclaimer banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </aside>
  );
}
