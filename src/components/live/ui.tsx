import type { StreetLevel } from "@/lib/live/scoring";
import { LEVEL_TEXT } from "@/lib/live/scoring";
import { cn } from "@/lib/utils";

const LEVEL_CLASS: Record<StreetLevel, string> = {
  clear: "bg-risk-low/15 text-risk-low border-risk-low/30",
  water: "bg-risk-moderate/15 text-risk-moderate border-risk-moderate/40",
  avoid: "bg-risk-high/15 text-risk-high border-risk-high/40",
  danger: "bg-risk-critical/15 text-risk-critical border-risk-critical/40",
  closed: "bg-foreground/10 text-foreground border-foreground/30",
};
const DOT: Record<StreetLevel, string> = {
  clear: "bg-risk-low",
  water: "bg-risk-moderate",
  avoid: "bg-risk-high",
  danger: "bg-risk-critical",
  closed: "bg-foreground",
};

export function LevelBadge({ level, className }: { level: StreetLevel; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", LEVEL_CLASS[level], className)}>
      <span className={cn("h-2 w-2 rounded-full", DOT[level])} />
      {LEVEL_TEXT[level].title}
    </span>
  );
}

export function LevelDot({ level }: { level: StreetLevel }) {
  return <span className={cn("inline-block h-3 w-3 shrink-0 rounded-full", DOT[level])} />;
}

export function timeAgo(iso: string) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

export function km(d: number) {
  return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
}
