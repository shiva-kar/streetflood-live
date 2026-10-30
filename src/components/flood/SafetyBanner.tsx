import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function SafetyBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <aside
      aria-label="National Hackathon Prototype Notice"
      className="bg-amber-100 dark:bg-amber-950/60 border-b border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 px-3 sm:px-5 py-2 text-xs sm:text-sm flex items-center justify-between gap-3 shrink-0 z-20"
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="truncate">
          <strong className="font-bold">National Hackathon Prototype:</strong> Real-time map
          combining crowdsourced reports and simulated sensor/rainfall data for Sion–Kurla, Mumbai.{" "}
          <span className="hidden md:inline">
            Not for official emergency navigation. In urgent life-threatening situations, dial{" "}
            <span className="font-extrabold underline">112</span>.
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-amber-200 dark:hover:bg-amber-900 rounded-md text-amber-900 dark:text-amber-300 transition-colors shrink-0"
        aria-label="Dismiss disclaimer banner"
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
