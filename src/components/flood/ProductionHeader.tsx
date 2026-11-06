import { useState, useRef, useEffect } from "react";
import {
  Search,
  MapPin,
  Locate,
  Globe,
  User,
  ShieldCheck,
  X,
  Loader2,
  AlertTriangle,
  Bell,
  Volume2,
  Bot,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { searchPlaces, type PlaceSearchResult } from "@/lib/flood/openData";
import { getLanguage, setLanguage, useI18n, type Language } from "@/lib/i18n";
import type { UserProfile } from "@/lib/supabase/client";
import { speakAlert } from "@/lib/flood/voiceAnnouncer";

export interface ProductionHeaderProps {
  onSelectPlace: (lat: number, lng: number, name: string) => void;
  onLocateUser: () => void;
  isLocating: boolean;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenControlRoom?: () => void;
  canAccessControlRoom: boolean;
  isEvaluationMode?: boolean;
  onOpenAlerts?: () => void;
  onOpenHelp?: () => void;
  alertCount?: number;
  criticalAlert?: string | undefined;
  activeCityName?: string;
  reports?: import("@/lib/flood/types").FloodReport[];
  offlineQueuedCount?: number;
  onOpenCivicAssistant?: () => void;
  onOpenHackathonShowcase?: () => void;
  onOpenImpactDashboard?: () => void;
  /** Deprecated alias */
  demoMode?: boolean;
  /** Deprecated alias */
  onOpenIbmBobShowcase?: () => void;
  /** Deprecated alias */
  onOpenIbmBobCopilot?: () => void;
}

export default function ProductionHeader({
  onSelectPlace,
  onLocateUser,
  isLocating,
  currentUser,
  onOpenAuth,
  onOpenControlRoom,
  canAccessControlRoom,
  onOpenAlerts,
  onOpenHelp,
  alertCount = 0,
  criticalAlert,
  activeCityName,
  onOpenCivicAssistant,
  onOpenHackathonShowcase,
  onOpenImpactDashboard,
  onOpenIbmBobShowcase,
  onOpenIbmBobCopilot,
}: ProductionHeaderProps) {
  const t = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const currentLang = getLanguage();

  const handleOpenAi = onOpenCivicAssistant || onOpenIbmBobCopilot;
  const handleOpenShowcase = onOpenHackathonShowcase || onOpenIbmBobShowcase;

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = window.setTimeout(async () => {
      const res = await searchPlaces(query);
      setResults(res);
      setIsSearching(false);
    }, 400);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  const handleSelectResult = (r: PlaceSearchResult) => {
    onSelectPlace(r.lat, r.lng, r.name);
    setQuery(r.name);
    setResults([]);
    setIsFocused(false);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    window.location.reload();
  };

  return (
    <header className="relative z-30 w-full px-3 pt-3 pb-1.5 sm:px-4">
      <div className="flex items-center gap-2 w-full">
        {/* LOGO & BRAND WITH 1-CLICK CORRIDOR SWITCHER */}
        <div className="flex items-center gap-2 shrink-0 rounded-xl border border-border bg-background/95 px-2.5 py-2 shadow-sm backdrop-blur-md sm:px-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-600 text-xs font-black text-white">
            SF
          </div>
          <span className="hidden text-sm font-bold tracking-tight text-foreground sm:inline">
            StreetFlood<span className="text-sky-600 font-extrabold">.AI</span>
          </span>

          {/* 1-CLICK FLAGSHIP CORRIDOR SWITCHER */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-0.5 hidden border-l border-border/80 pl-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground md:flex items-center gap-1 cursor-pointer transition-colors"
                title="Switch Monitored Corridor"
              >
                <span className="truncate max-w-[130px]">
                  {activeCityName
                    ? activeCityName
                        .replace(" (Sion-Kurla Corridor)", "")
                        .replace(" (Tech Corridors)", "")
                    : "Bengaluru"}
                </span>
                <span className="text-[9px] text-sky-600">▼</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-1.5 shadow-xl">
              <DropdownMenuItem
                onClick={() => onSelectPlace(12.9716, 77.5946, "Bengaluru (Tech Corridors)")}
                className="flex flex-col items-start gap-0.5 cursor-pointer rounded-lg p-2 hover:bg-muted"
              >
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  <span className="font-bold text-xs text-foreground">
                    Bengaluru (Tech Corridors)
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground pl-5">
                  Outer Ring Road, Silk Board &amp; 269 BBMP shelters
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSelectPlace(19.0508, 72.8714, "Mumbai (Sion-Kurla Corridor)")}
                className="flex flex-col items-start gap-0.5 cursor-pointer rounded-lg p-2 hover:bg-muted"
              >
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span className="font-bold text-xs text-foreground">
                    Mumbai (Monsoon Corridor)
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground pl-5">
                  936 OSM road segments &amp; Sion-Kurla micro-grid
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* SEARCH BAR (WORLDWIDE OPEN-WORLD SEARCH) */}
        <div className="relative flex-1">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 250)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results.length > 0 && results[0]) {
                  e.preventDefault();
                  handleSelectResult(results[0]);
                }
              }}
              placeholder={t.searchPlaceholder}
              className="h-11 rounded-xl border border-border bg-background/95 pl-9 pr-8 text-xs shadow-sm backdrop-blur-md focus-visible:ring-1 focus-visible:ring-primary sm:text-sm"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : isSearching ? (
              <Loader2 className="absolute right-3 w-3.5 h-3.5 text-muted-foreground animate-spin" />
            ) : null}
          </div>

          {/* SEARCH SUGGESTIONS DROPDOWN */}
          {isFocused && results.length > 0 && (
            <div className="absolute top-12 left-0 right-0 bg-background/98 backdrop-blur-lg border rounded-2xl shadow-xl overflow-hidden py-1 z-50 max-h-64 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.placeId}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectResult(r);
                  }}
                  onClick={() => handleSelectResult(r)}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-muted/60 transition-colors flex items-start gap-2.5 border-b last:border-b-0 cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-foreground truncate">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{r.displayName}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GPS QUICK-LOCATE BUTTON */}
        <Button
          variant="outline"
          size="icon"
          onClick={onLocateUser}
          disabled={isLocating}
          title={t.useMyLocation}
          className="h-11 w-11 rounded-xl shrink-0 bg-background/95 backdrop-blur-md border shadow-sm hover:text-primary transition-colors cursor-pointer"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <Locate className="w-4 h-4 text-primary" />
          )}
        </Button>

        {/* HACKATHON SHOWCASE BUTTON */}
        {handleOpenShowcase && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenShowcase}
            className="hidden md:inline-flex h-11 shrink-0 gap-1.5 rounded-xl border border-sky-500/40 bg-gradient-to-r from-sky-500/15 to-indigo-500/15 px-3 text-xs font-bold text-foreground shadow-sm backdrop-blur-md hover:bg-sky-500/25 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="hidden lg:inline">Build for Bengaluru</span>
            <span className="lg:hidden">Showcase</span>
          </Button>
        )}

        {/* IMPACT DASHBOARD BUTTON */}
        {onOpenImpactDashboard && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenImpactDashboard}
            className="hidden lg:inline-flex h-11 shrink-0 gap-1.5 rounded-xl border border-border bg-background/95 px-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md hover:bg-muted cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Impact</span>
          </Button>
        )}

        {/* CIVIC AI ASSISTANT BUTTON (DESKTOP) */}
        {handleOpenAi && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAi}
            className="hidden xl:inline-flex h-11 shrink-0 gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md hover:bg-sky-500/20 cursor-pointer"
          >
            <Bot className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Civic AI</span>
          </Button>
        )}

        {/* LANGUAGE SWITCHER */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="hidden h-11 w-11 rounded-xl shrink-0 bg-background/95 backdrop-blur-md border shadow-sm sm:inline-flex cursor-pointer"
            >
              <Globe className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              onClick={() => handleLanguageChange("en")}
              className={currentLang === "en" ? "font-bold text-primary" : ""}
            >
              English
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleLanguageChange("kn")}
              className={currentLang === "kn" ? "font-bold text-primary" : ""}
            >
              ಕನ್ನಡ (Kannada)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleLanguageChange("hi")}
              className={currentLang === "hi" ? "font-bold text-primary" : ""}
            >
              हिंदी (Hindi)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleLanguageChange("mr")}
              className={currentLang === "mr" ? "font-bold text-primary" : ""}
            >
              मराठी (Marathi)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ALERTS QUICK-BUTTON (DESKTOP) */}
        {onOpenAlerts && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAlerts}
            className="relative hidden h-11 shrink-0 gap-1.5 rounded-xl border border-border bg-background/95 px-3 text-xs font-semibold shadow-sm backdrop-blur-md md:inline-flex cursor-pointer"
          >
            <Bell className="w-4 h-4 text-primary" />
            <span className="hidden lg:inline">{t.tabAlerts}</span>
            {alertCount > 0 && (
              <span className="px-1.5 py-0.2 bg-red-600 text-white font-bold text-[8px] rounded-full">
                {alertCount}
              </span>
            )}
          </Button>
        )}
        {criticalAlert && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => speakAlert(criticalAlert, currentLang)}
            className="hidden h-11 w-11 shrink-0 rounded-xl border border-border bg-background/95 shadow-sm backdrop-blur-md md:inline-flex cursor-pointer"
            title="Listen to critical alert"
            aria-label="Listen to critical alert"
          >
            <Volume2 className="w-4 h-4 text-red-600" />
          </Button>
        )}

        {/* EMERGENCY 112 DIRECT CALL/HELP (DESKTOP) */}
        {onOpenHelp && (
          <Button
            variant="default"
            size="sm"
            onClick={onOpenHelp}
            className="hidden h-11 shrink-0 gap-1.5 rounded-xl bg-red-700 px-3.5 text-xs font-bold text-white shadow-sm hover:bg-red-800 sm:inline-flex cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>112 Help</span>
          </Button>
        )}

        {/* CONTROL ROOM BUTTON (ONLY IF PERMITTED) */}
        {canAccessControlRoom && onOpenControlRoom && (
          <Button
            variant="default"
            size="sm"
            onClick={onOpenControlRoom}
            data-testid="control-room-button"
            className="hidden h-11 shrink-0 gap-1.5 rounded-xl bg-slate-800 px-3 text-xs font-semibold text-white shadow-sm hover:bg-slate-900 md:flex cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t.controlRoom || "Control Room"}</span>
          </Button>
        )}

        {/* AUTH / PROFILE BUTTON */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAuth}
          className="h-11 shrink-0 gap-1.5 rounded-xl border border-border bg-background/95 px-3 text-xs font-semibold shadow-sm backdrop-blur-md cursor-pointer"
        >
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="hidden sm:inline">
            {currentUser ? currentUser.fullName || currentUser.role : t.signIn}
          </span>
        </Button>
      </div>
    </header>
  );
}
