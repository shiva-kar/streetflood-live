import { useState, useRef, useEffect } from "react";
import { Search, MapPin, Locate, Globe, User, ShieldCheck, X, Sparkles, Loader2, AlertTriangle, Bell, Volume2 } from "lucide-react";
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

interface ProductionHeaderProps {
  onSelectPlace: (lat: number, lng: number, name: string) => void;
  onLocateUser: () => void;
  isLocating: boolean;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenControlRoom?: () => void;
  canAccessControlRoom: boolean;
  demoMode: boolean;
  onOpenAlerts?: () => void;
  onOpenHelp?: () => void;
  alertCount?: number;
  criticalAlert?: string | undefined;
}

export default function ProductionHeader({
  onSelectPlace,
  onLocateUser,
  isLocating,
  currentUser,
  onOpenAuth,
  onOpenControlRoom,
  canAccessControlRoom,
  demoMode,
  onOpenAlerts,
  onOpenHelp,
  alertCount = 0,
  criticalAlert,
}: ProductionHeaderProps) {
  const t = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const currentLang = getLanguage();

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
    <header className="relative z-30 w-full px-3 pt-3 pb-1.5 flex flex-col gap-2">
      <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
        {/* LOGO & BRAND */}
        <div className="flex items-center gap-2 shrink-0 bg-background/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border shadow-sm">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
            SF
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground hidden sm:inline">
            StreetFlood<span className="text-primary font-normal">.Live</span>
          </span>
          <span className="text-[10px] text-muted-foreground font-semibold hidden md:inline ml-0.5 border-l border-border/80 pl-2">
            Mumbai
          </span>
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
                if (e.key === "Enter" && results.length > 0) {
                  e.preventDefault();
                  handleSelectResult(results[0]);
                }
              }}
              placeholder={t.searchPlaceholder}
              className="pl-9 pr-8 h-10 rounded-2xl bg-background/95 backdrop-blur-md border shadow-sm text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-primary"
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
                  onMouseDown={(e) => { e.preventDefault(); handleSelectResult(r); }}
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
          className="h-10 w-10 rounded-2xl shrink-0 bg-background/95 backdrop-blur-md border shadow-sm hover:text-primary transition-colors"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <Locate className="w-4 h-4 text-primary" />
          )}
        </Button>

        {/* LANGUAGE SWITCHER */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-2xl shrink-0 bg-background/95 backdrop-blur-md border shadow-sm hidden sm:inline-flex"
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
            className="h-10 px-3 rounded-2xl shrink-0 bg-background/95 backdrop-blur-md border shadow-sm gap-1.5 text-xs font-semibold hidden md:inline-flex relative cursor-pointer"
          >
            <Bell className="w-4 h-4 text-primary" />
            <span className="hidden lg:inline">{t.tabAlerts}</span>
            {alertCount > 0 && (
              <span className="px-1.5 py-0.2 bg-red-600 text-white font-bold text-[8px] rounded-full">
                {alertCount}
              </span>
            )}
            {criticalAlert && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => speakAlert(criticalAlert, currentLang)}
                className="h-10 px-3 rounded-2xl shrink-0 bg-background/95 backdrop-blur-md border shadow-sm gap-1.5 text-xs font-semibold hidden md:inline-flex"
                title="Listen to critical alert"
              >
                <Volume2 className="w-4 h-4 text-red-600" />
                <span className="hidden lg:inline">Listen Alert</span>
              </Button>
            )}
          </Button>
        )}

        {/* EMERGENCY 112 DIRECT CALL/HELP (DESKTOP) */}
        {onOpenHelp && (
          <Button
            variant="default"
            size="sm"
            onClick={onOpenHelp}
            className="h-10 px-3.5 rounded-2xl shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm gap-1.5 hidden sm:inline-flex cursor-pointer"
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
            className="h-10 px-3 rounded-2xl shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm gap-1.5 hidden md:flex"
          >
            <ShieldCheck className="w-4 h-4" />
            {t.controlRoom}
          </Button>
        )}

        {/* AUTH / PROFILE BUTTON */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAuth}
          className="h-10 px-3 rounded-2xl shrink-0 bg-background/95 backdrop-blur-md border shadow-sm gap-1.5 text-xs font-semibold"
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
