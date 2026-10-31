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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t shadow-lg px-4 py-2 flex items-center justify-around max-w-md mx-auto sm:rounded-t-2xl sm:mb-2 sm:border sm:border-b">
      {/* 1. MAP TAB */}
      <button
        type="button"
        onClick={() => onTabChange("map")}
        className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
          activeTab === "map"
            ? "text-primary font-bold scale-105"
            : "text-muted-foreground hover:text-foreground font-medium"
        }`}
      >
        <Map className="w-5 h-5" />
        <span className="text-[10px]">{t.tabMap}</span>
      </button>

      {/* 2. REPORT FLOODING (THUMB-FRIENDLY ELEVATED BUTTON) */}
      <button
        type="button"
        onClick={() => {
          onTabChange("report");
          onOpenReport();
        }}
        className="flex flex-col items-center justify-center -mt-5 cursor-pointer group"
      >
        <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:scale-110 active:scale-95 transition-all">
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </div>
        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1">
          {t.tabReport}
        </span>
      </button>

      {/* 3. ALERTS TAB */}
      <button
        type="button"
        onClick={() => {
          onTabChange("alerts");
          onOpenAlerts();
        }}
        className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
          activeTab === "alerts"
            ? "text-primary font-bold scale-105"
            : "text-muted-foreground hover:text-foreground font-medium"
        }`}
      >
        <div className="relative">
          <Bell className="w-5 h-5" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-red-600 text-white font-bold text-[9px] rounded-full ring-2 ring-background">
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
        className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
          activeTab === "help"
            ? "text-primary font-bold scale-105"
            : "text-muted-foreground hover:text-foreground font-medium"
        }`}
      >
        <LifeBuoy className="w-5 h-5 text-rose-500" />
        <span className="text-[10px]">{t.tabHelp}</span>
      </button>
    </nav>
  );
}
