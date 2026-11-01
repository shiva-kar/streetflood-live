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
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-background/98 backdrop-blur-xl border-t border-border flex items-center justify-around px-3 pb-[max(0.25rem,env(safe-area-inset-bottom))] select-none"
      aria-label="Mobile Navigation"
    >
      {/* 1. MAP TAB */}
      <button
        type="button"
        onClick={() => onTabChange("map")}
        className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 transition-colors cursor-pointer ${
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
        className="flex items-center justify-center h-10 px-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md active:scale-95 transition-all gap-1.5 cursor-pointer font-bold text-xs"
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
        className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 transition-colors relative cursor-pointer ${
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
        className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 transition-colors cursor-pointer ${
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
