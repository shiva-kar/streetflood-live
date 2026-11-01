import { Map, Plus, Bell, LifeBuoy } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface BottomNavProps {
  activeTab: "map" | "report" | "alerts" | "help";
  onTabChange: (tab: "map" | "report" | "alerts" | "help") => void;
  alertCount: number;
  onOpenReport: () => void;
  onOpenAlerts: () => void;
  onOpenHelp: () => void;
}

export default function BottomNav({
  activeTab,
  onTabChange,
  alertCount,
  onOpenReport,
  onOpenAlerts,
  onOpenHelp,
}: BottomNavProps) {
  const t = useI18n();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-border bg-background/98 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl select-none sm:hidden"
      aria-label="Mobile Navigation"
    >
      {/* 1. MAP TAB */}
      <button
        type="button"
        onClick={() => onTabChange("map")}
        className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 transition-colors cursor-pointer ${
          activeTab === "map"
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground font-medium"
        }`}
      >
        <Map className="w-4 h-4" />
        <span className="text-[10px]">{t.tabMap}</span>
      </button>

      {/* 2. REPORT FLOODING (CLEAN FLUSH EMERGENCY BUTTON) */}
      <button
        type="button"
        onClick={() => {
          onTabChange("report");
          onOpenReport();
        }}
        className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-red-700 px-3.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 hover:bg-red-800 cursor-pointer"
        aria-label="Report Flood"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span>{t.tabReport}</span>
      </button>

      {/* 3. ALERTS TAB */}
      <button
        type="button"
        onClick={() => {
          onTabChange("alerts");
          onOpenAlerts();
        }}
        className={`relative flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 transition-colors cursor-pointer ${
          activeTab === "alerts"
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground font-medium"
        }`}
      >
        <div className="relative">
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-red-600 text-white font-bold text-[8px] rounded-full ring-2 ring-background">
              {alertCount}
            </span>
          )}
        </div>
        <span className="text-[10px]">{t.tabAlerts}</span>
      </button>

      {/* 4. HELP TAB */}
      <button
        type="button"
        onClick={() => {
          onTabChange("help");
          onOpenHelp();
        }}
        className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 transition-colors cursor-pointer ${
          activeTab === "help"
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-foreground font-medium"
        }`}
      >
        <LifeBuoy className="w-4 h-4 text-rose-500" />
        <span className="text-[10px]">{t.tabHelp}</span>
      </button>
    </nav>
  );
}
