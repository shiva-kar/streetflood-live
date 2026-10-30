import { useEffect, useRef, useState } from "react";
import type * as LType from "leaflet";
import { GRID, MAP_CENTER } from "@/lib/flood/data";
import { tileBounds, tileAt } from "@/lib/flood/engine";
import type { FloodReport, RiskLevel, RoadIncident, Shelter, Tile } from "@/lib/flood/types";

export interface FloodMapProps {
  tiles: Tile[];
  reports: FloodReport[];
  incidents: RoadIncident[];
  shelters: Shelter[];
  alertTileIds: Set<string>;
  routePath: Tile[] | null;
  routeFromId?: string | null;
  routeToId?: string | null;
  selectedTileId: string | null;
  selectedTileIds?: Set<string>;
  pulseTileId?: string | null;
  highlightShelterId?: string | null;
  showPredicted: boolean;
  onlyHighCritical?: boolean;
  showReports?: "all" | "unverified" | "none";
  userPos?: [number, number] | null;
  focus?: { lat: number; lng: number; zoom?: number; key: number } | null;
  pickMode?: boolean;
  onTileClick: (tileId: string, lat: number, lng: number) => void;
  onShelterClick?: (shelterId: string) => void;
  onViewportChange?: (ids: Set<string>) => void;
}

function cssVar(name: string) {
  if (typeof window === "undefined") return "#000000";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#000000";
}

const RISK_VAR: Record<RiskLevel, string> = {
  Low: "--risk-low",
  Moderate: "--risk-moderate",
  High: "--risk-high",
  Critical: "--risk-critical",
};

export default function FloodMap(props: FloodMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const [L, setL] = useState<typeof LType | null>(null);
  const map = useRef<LType.Map | null>(null);
  const rects = useRef(new Map<string, LType.Rectangle>());
  const layers = useRef<Record<string, LType.LayerGroup>>({});
  const propsRef = useRef(props);
  propsRef.current = props;

  // Load Leaflet on client-side only
  useEffect(() => {
    if (typeof window === "undefined") return;
    import("leaflet").then((mod) => {
      setL(mod.default || mod);
    });
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!L || !el.current || map.current) return;
    const m = L.map(el.current, {
      center: MAP_CENTER,
      zoom: 15,
      minZoom: 13,
      maxZoom: 19,
      zoomControl: false,
      preferCanvas: false,
    });
    L.control.zoom({ position: "bottomright" }).addTo(m);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);

    const s = GRID.south;
    const w = GRID.west;
    m.setMaxBounds(
      L.latLngBounds(
        [s - 0.02, w - 0.02],
        [s + GRID.rows * GRID.dLat + 0.02, w + GRID.cols * GRID.dLng + 0.02],
      ),
    );

    for (const k of ["incidents", "badges", "reports", "shelters", "route", "user", "pulse"]) {
      layers.current[k] = L.layerGroup().addTo(m);
    }

    m.on("click", (e: LType.LeafletMouseEvent) => {
      const id = tileAt(e.latlng.lat, e.latlng.lng);
      if (id) {
        propsRef.current.onTileClick(id, e.latlng.lat, e.latlng.lng);
      }
    });

    const emitViewport = () => {
      const b = m.getBounds();
      const ids = new Set<string>();
      for (const t of propsRef.current.tiles) {
        if (b.contains([t.centerLat, t.centerLng])) ids.add(t.id);
      }
      propsRef.current.onViewportChange?.(ids);
    };

    m.on("moveend", emitViewport);
    map.current = m;

    setTimeout(() => {
      m.invalidateSize();
      emitViewport();
    }, 50);

    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);

    const currentRects = rects.current;
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      currentRects.clear();
    };
  }, [L]);

  // Tiles grid overlay
  useEffect(() => {
    if (!L || !map.current) return;
    const m = map.current;
    const amber = cssVar("--risk-moderate") || "#f59e0b";
    const green = cssVar("--risk-low") || "#10b981";
    const sel = cssVar("--primary") || "#2563eb";

    for (const t of props.tiles) {
      let r = rects.current.get(t.id);
      if (!r) {
        r = L.rectangle(tileBounds(t.row, t.col), { interactive: false, weight: 1 }).addTo(m);
        rects.current.set(t.id, r);
      }
      const color = cssVar(RISK_VAR[t.currentRiskLevel]);
      const dim =
        props.onlyHighCritical &&
        (t.currentRiskLevel === "Low" || t.currentRiskLevel === "Moderate");
      const isSel = props.selectedTileId === t.id || props.selectedTileIds?.has(t.id);
      const baseOpacity =
        t.currentRiskLevel === "Low" ? 0.14 : t.currentRiskLevel === "Moderate" ? 0.4 : 0.55;

      let stroke = color;
      let weight = 0.5;
      let dash: string | undefined;
      let strokeOpacity = 0.35;

      if (props.showPredicted) {
        if (t.predictedRisk === "Moderate") {
          stroke = amber;
          weight = 2.5;
          dash = "4 3";
          strokeOpacity = 1;
        } else {
          stroke = green;
          weight = 1;
          strokeOpacity = 0.7;
        }
      }
      if (isSel) {
        stroke = sel;
        weight = 3.5;
        dash = undefined;
        strokeOpacity = 1;
      }

      r.setStyle({
        color: stroke,
        weight,
        opacity: dim ? 0.08 : strokeOpacity,
        dashArray: dash,
        fillColor: color,
        fillOpacity: dim ? 0.02 : baseOpacity,
      });

      if (isSel) r.bringToFront();
    }
  }, [
    L,
    props.tiles,
    props.selectedTileId,
    props.selectedTileIds,
    props.showPredicted,
    props.onlyHighCritical,
  ]);

  // Road closures overlay
  useEffect(() => {
    if (!L) return;
    const g = layers.current.incidents;
    if (!g) return;
    g.clearLayers();
    const crit = cssVar("--risk-critical") || "#ef4444";

    for (const i of props.incidents) {
      const [row, col] = i.tileId.slice(2).split("_").map(Number);
      const b = tileBounds(row, col);
      L.rectangle(b, {
        interactive: false,
        color: crit,
        weight: 3,
        fillOpacity: 0.1,
        className: "sf-closure",
      }).addTo(g);

      const label =
        i.status === "ClosedAllTraffic" ? "⛔" : i.status === "ClosedSmallVehicles" ? "🚫" : "⚠️";
      const marker = L.marker([(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2], {
        interactive: true,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="sf-closure-pin cursor-pointer hover:scale-110 transition-transform" title="${i.description}">${label}</span>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      }).addTo(g);

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        propsRef.current.onTileClick(i.tileId, (b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2);
      });
    }
  }, [L, props.incidents]);

  // Alert badges
  useEffect(() => {
    if (!L) return;
    const g = layers.current.badges;
    if (!g) return;
    g.clearLayers();
    for (const t of props.tiles) {
      if (!props.alertTileIds.has(t.id)) continue;
      const [[s], [n, e]] = tileBounds(t.row, t.col);
      L.marker([n - (n - s) * 0.18, e - GRID.dLng * 0.18], {
        interactive: false,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="sf-badge animate-pulse" title="Active Municipal Alert on this block">!</span>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
      }).addTo(g);
    }
  }, [L, props.tiles, props.alertTileIds]);

  // Reports markers
  useEffect(() => {
    if (!L) return;
    const g = layers.current.reports;
    if (!g) return;
    g.clearLayers();
    const mode = props.showReports ?? "all";
    if (mode === "none") return;

    for (const r of props.reports) {
      if (r.status === "Dismissed") continue;
      if (mode === "unverified" && r.status !== "Unverified") continue;
      const marker = L.marker([r.lat, r.lng], {
        interactive: true,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="sf-report cursor-pointer hover:scale-125 transition-transform ${r.status === "Verified" ? "is-verified" : ""}" title="${r.status}: ${r.description}"></span>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
      }).addTo(g);

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        propsRef.current.onTileClick(r.tileId, r.lat, r.lng);
      });
    }
  }, [L, props.reports, props.showReports]);

  // Shelters markers
  useEffect(() => {
    if (!L) return;
    const g = layers.current.shelters;
    if (!g) return;
    g.clearLayers();
    for (const s of props.shelters) {
      const hl = props.highlightShelterId === s.id;
      const marker = L.marker([s.lat, s.lng], {
        interactive: true,
        zIndexOffset: hl ? 1000 : 100,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="sf-shelter cursor-pointer hover:scale-110 transition-transform ${hl ? "is-hl" : ""}" title="${s.name} (${s.capacityStatus})">⌂</span>`,
          iconSize: hl ? [36, 36] : [26, 26],
          iconAnchor: hl ? [18, 18] : [13, 13],
        }),
      }).addTo(g);

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        propsRef.current.onShelterClick?.(s.id);
      });
    }
    if (props.highlightShelterId) {
      const s = props.shelters.find((x) => x.id === props.highlightShelterId);
      if (s) map.current?.flyTo([s.lat, s.lng], 17, { duration: 0.6 });
    }
  }, [L, props.shelters, props.highlightShelterId]);

  // Route visualization
  useEffect(() => {
    if (!L) return;
    const g = layers.current.route;
    if (!g) return;
    g.clearLayers();
    const prim = cssVar("--route") || "#6366f1";
    const bg = cssVar("--background") || "#ffffff";

    const pin = (id: string | null | undefined, txt: string, color: string) => {
      if (!id) return;
      const t = props.tiles.find((x) => x.id === id);
      if (!t) return;
      L.marker([t.centerLat, t.centerLng], {
        interactive: false,
        zIndexOffset: 2000,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="sf-route-pin" style="background:${color}">${txt}</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(g);
    };

    if (props.routePath?.length) {
      const pts = props.routePath.map((t) => [t.centerLat, t.centerLng] as [number, number]);
      // Casing line
      L.polyline(pts, {
        color: bg,
        weight: 9,
        opacity: 0.9,
        interactive: false,
      }).addTo(g);
      // Main polyline
      L.polyline(pts, {
        color: prim,
        weight: 5,
        opacity: 1,
        interactive: false,
      }).addTo(g);

      map.current?.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 17 });
    }

    pin(props.routeFromId, "A", "#10b981");
    pin(props.routeToId, "B", "#6366f1");
  }, [L, props.routePath, props.routeFromId, props.routeToId, props.tiles]);

  // User position
  useEffect(() => {
    if (!L) return;
    const g = layers.current.user;
    if (!g) return;
    g.clearLayers();
    if (props.userPos) {
      L.marker(props.userPos, {
        interactive: false,
        zIndexOffset: 1500,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="sf-user" title="Your Location"></span>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }).addTo(g);
    }
  }, [L, props.userPos]);

  // Pulse on new report
  useEffect(() => {
    if (!L) return;
    const g = layers.current.pulse;
    if (!g || !props.pulseTileId) return;
    g.clearLayers();
    const t = props.tiles.find((x) => x.id === props.pulseTileId);
    if (!t) return;
    L.marker([t.centerLat, t.centerLng], {
      interactive: false,
      zIndexOffset: 3000,
      icon: L.divIcon({
        className: "sf-icon",
        html: `<span class="sf-pulse"></span>`,
        iconSize: [60, 60],
        iconAnchor: [30, 30],
      }),
    }).addTo(g);
    const timer = setTimeout(() => g.clearLayers(), 3500);
    return () => clearTimeout(timer);
  }, [L, props.pulseTileId, props.tiles]);

  // Focus flyTo
  useEffect(() => {
    if (props.focus && map.current) {
      map.current.flyTo([props.focus.lat, props.focus.lng], props.focus.zoom ?? 17, {
        duration: 0.6,
      });
    }
  }, [props.focus]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={el}
        className={`h-full w-full ${props.pickMode ? "sf-picking" : ""}`}
        role="application"
        aria-label="StreetFlood Live interactive flood severity map. Click any tile to inspect street level risk."
      />
      {!L && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground font-sans">
            Initializing StreetFlood Live map grid...
          </p>
        </div>
      )}
    </div>
  );
}
