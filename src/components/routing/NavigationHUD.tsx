import { useMemo, useState } from "react";
import { Download, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RoadRouteResult } from "@/lib/flood/types";
import { buildNavigationInstructions } from "@/lib/routing/turnByTurnEngine";
import { routeToGpx, routeToKml } from "@/lib/routing/gpxExporter";
import { cancelGuidance, speakGuidance, type GuidanceLanguage } from "@/lib/a11y/voiceGuidance";

export function NavigationHUD({ route, language = "en-IN" }: { route: RoadRouteResult; language?: GuidanceLanguage }) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const instructions = useMemo(() => buildNavigationInstructions(route.steps), [route.steps]);
  const current = instructions[0];
  const download = (name: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section aria-label="Evacuation navigation" className="rounded-2xl border-2 bg-background/95 p-3 shadow-xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Safe route</p>
          <p className="font-bold">{route.distanceKm.toFixed(1)} km · {Math.round(route.durationMinutes)} min</p>
        </div>
        <Button type="button" size="icon" variant="outline" aria-label={audioEnabled ? "Mute guidance" : "Enable audio guidance"} onClick={() => {
          setAudioEnabled((enabled) => {
            if (enabled) cancelGuidance();
            else if (current) speakGuidance(current.spokenText, language);
            return !enabled;
          });
        }}>
          {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </div>
      {current && <p className="mt-3 text-sm font-medium">{current.spokenText}</p>}
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => download("streetflood-route.gpx", routeToGpx(route), "application/gpx+xml")}><Download className="mr-1 h-3 w-3" /> GPX</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => download("streetflood-route.kml", routeToKml(route), "application/vnd.google-earth.kml+xml")}><Download className="mr-1 h-3 w-3" /> KML</Button>
      </div>
    </section>
  );
}
