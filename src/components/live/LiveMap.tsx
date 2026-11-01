import { useEffect, useRef, useState } from "react";
import type * as LType from "leaflet";
import type { Cell, StreetLevel } from "@/lib/live/scoring";
import type { Closure, Report } from "@/lib/live/backend";
import type { HelpPoint } from "@/lib/live/services";

export interface MapView {
  south: number;
  west: number;
  north: number;
  east: number;
  lat: number;
  lng: number;
  zoom: number;
}

export interface LiveMapProps {
  focus: { lat: number; lng: number; zoom: number; key: number };
  user: { lat: number; lng: number; accuracy: number } | null;
  cells: Cell[];
  reports: Report[];
  closures: Closure[];
  help: HelpPoint[];
  routes: { coords: [number, number][]; level: StreetLevel }[];
  selectedRoute: number;
  pin: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  onMove: (v: MapView) => void;
  onReport: (r: Report) => void;
  onHelp: (h: HelpPoint) => void;
}

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
}
const LEVEL_VAR: Record<StreetLevel, string> = {
  clear: "--risk-low",
  water: "--risk-moderate",
  avoid: "--risk-high",
  danger: "--risk-critical",
  closed: "--risk-critical",
};
const HELP_ICON: Record<HelpPoint["kind"], string> = {
  shelter: "⌂",
  hospital: "+",
  police: "P",
  fire: "F",
  school: "S",
  community: "C",
};

export default function LiveMap(p: LiveMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const [L, setL] = useState<typeof LType | null>(null);
  const map = useRef<LType.Map | null>(null);
  const layers = useRef<Record<string, LType.LayerGroup>>({});
  const cb = useRef(p);
  cb.current = p;

  useEffect(() => {
    let alive = true;
    void import("leaflet").then((mod) => {
      if (!alive || !el.current) return;
      const Lm = (mod as unknown as { default?: typeof LType }).default ?? (mod as unknown as typeof LType);
      const m = Lm.map(el.current, { zoomControl: false, attributionControl: true }).setView(
        [p.focus.lat, p.focus.lng],
        p.focus.zoom,
      );
      Lm.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(m);
      Lm.control.zoom({ position: "topright" }).addTo(m);
      for (const k of ["cells", "routes", "help", "closures", "reports", "user", "pin"])
        layers.current[k] = Lm.layerGroup().addTo(m);
      const emit = () => {
        const b = m.getBounds();
        const c = m.getCenter();
        cb.current.onMove({
          south: b.getSouth(),
          west: b.getWest(),
          north: b.getNorth(),
          east: b.getEast(),
          lat: c.lat,
          lng: c.lng,
          zoom: m.getZoom(),
        });
      };
      m.on("moveend", emit);
      m.on("click", (e: LType.LeafletMouseEvent) => cb.current.onMapClick(e.latlng.lat, e.latlng.lng));
      map.current = m;
      setL(Lm);
      emit();
    });
    return () => {
      alive = false;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    map.current?.flyTo([p.focus.lat, p.focus.lng], p.focus.zoom, { duration: 0.8 });
  }, [p.focus.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const g = layers.current["cells"];
    if (!L || !g) return;
    g.clearLayers();
    for (const c of p.cells) {
      if (c.level === "clear") continue;
      const col = cssVar(LEVEL_VAR[c.level]);
      L.rectangle(c.bounds, { stroke: false, fillColor: col, fillOpacity: c.level === "water" ? 0.3 : 0.45, interactive: false }).addTo(g);
    }
  }, [L, p.cells]);

  useEffect(() => {
    const g = layers.current["reports"];
    if (!L || !g) return;
    g.clearLayers();
    for (const r of p.reports) {
      if (r.status === "dismissed") continue;
      const lvl: StreetLevel = r.depth === "waist" ? "danger" : r.depth === "knee" ? "avoid" : "water";
      const m = L.circleMarker([r.lat, r.lng], {
        radius: 9,
        color: cssVar("--card"),
        weight: 2,
        fillColor: cssVar(LEVEL_VAR[lvl]),
        fillOpacity: 1,
      }).addTo(g);
      m.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        cb.current.onReport(r);
      });
    }
  }, [L, p.reports]);

  useEffect(() => {
    const g = layers.current["closures"];
    if (!L || !g) return;
    g.clearLayers();
    for (const c of p.closures)
      L.marker([c.lat, c.lng], {
        icon: L.divIcon({ className: "", html: `<div class="sf-pin sf-closed" aria-label="Road closed">✕</div>`, iconSize: [28, 28] }),
        title: `Road closed: ${c.note}`,
      }).addTo(g);
  }, [L, p.closures]);

  useEffect(() => {
    const g = layers.current["help"];
    if (!L || !g) return;
    g.clearLayers();
    for (const h of p.help) {
      const m = L.marker([h.lat, h.lng], {
        icon: L.divIcon({ className: "", html: `<div class="sf-pin sf-help">${HELP_ICON[h.kind]}</div>`, iconSize: [24, 24] }),
        title: h.name,
      }).addTo(g);
      m.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        cb.current.onHelp(h);
      });
    }
  }, [L, p.help]);

  useEffect(() => {
    const g = layers.current["routes"];
    if (!L || !g) return;
    g.clearLayers();
    p.routes.forEach((r, i) => {
      if (i === p.selectedRoute) return;
      L.polyline(r.coords, { color: cssVar("--muted-foreground"), weight: 5, opacity: 0.5 }).addTo(g);
    });
    const sel = p.routes[p.selectedRoute];
    if (sel) {
      L.polyline(sel.coords, { color: cssVar("--card"), weight: 10, opacity: 1 }).addTo(g);
      L.polyline(sel.coords, { color: cssVar("--route"), weight: 6, opacity: 1 }).addTo(g);
      map.current?.fitBounds(L.latLngBounds(sel.coords), { padding: [60, 60] });
    }
  }, [L, p.routes, p.selectedRoute]);

  useEffect(() => {
    const g = layers.current["user"];
    if (!L || !g) return;
    g.clearLayers();
    if (!p.user) return;
    L.circle([p.user.lat, p.user.lng], { radius: p.user.accuracy, stroke: false, fillColor: cssVar("--primary"), fillOpacity: 0.12, interactive: false }).addTo(g);
    L.circleMarker([p.user.lat, p.user.lng], { radius: 8, color: cssVar("--card"), weight: 3, fillColor: cssVar("--primary"), fillOpacity: 1 }).addTo(g);
  }, [L, p.user]);

  useEffect(() => {
    const g = layers.current["pin"];
    if (!L || !g) return;
    g.clearLayers();
    if (p.pin)
      L.marker([p.pin.lat, p.pin.lng], {
        icon: L.divIcon({ className: "", html: `<div class="sf-drop"></div>`, iconSize: [26, 34], iconAnchor: [13, 34] }),
        interactive: false,
      }).addTo(g);
  }, [L, p.pin]);

  return <div ref={el} className="h-full w-full" role="application" aria-label="Flood map" />;
}
