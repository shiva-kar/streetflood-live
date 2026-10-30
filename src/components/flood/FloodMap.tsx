import { useEffect, useRef } from "react";
import L from "leaflet";
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
  onViewportChange?: (ids: Set<string>) => void;
}

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const RISK_VAR: Record<RiskLevel, string> = {
  Low: "--risk-low",
  Moderate: "--risk-moderate",
  High: "--risk-high",
  Critical: "--risk-critical",
};

export default function FloodMap(props: FloodMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const rects = useRef(new Map<string, L.Rectangle>());
  const layers = useRef<Record<string, L.LayerGroup>>({});
  const propsRef = useRef(props);
  propsRef.current = props;

  // init
  useEffect(() => {
    if (!el.current || map.current) return;
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
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    const s = GRID.south;
    const w = GRID.west;
    m.setMaxBounds(L.latLngBounds([s - 0.02, w - 0.02], [s + GRID.rows * GRID.dLat + 0.02, w + GRID.cols * GRID.dLng + 0.02]));
    for (const k of ["incidents", "badges", "reports", "shelters", "route", "user", "pulse"]) {
      layers.current[k] = L.layerGroup().addTo(m);
    }
    m.on("click", (e: L.LeafletMouseEvent) => {
      const id = tileAt(e.latlng.lat, e.latlng.lng);
      if (id) propsRef.current.onTileClick(id, e.latlng.lat, e.latlng.lng);
    });
    const emitViewport = () => {
      const b = m.getBounds();
      const ids = new Set<string>();
      for (const t of propsRef.current.tiles) if (b.contains([t.centerLat, t.centerLng])) ids.add(t.id);
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
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      rects.current.clear();
    };
  }, []);

  // tiles
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const amber = cssVar("--risk-moderate");
    const green = cssVar("--risk-low");
    const sel = cssVar("--primary");
    for (const t of props.tiles) {
      let r = rects.current.get(t.id);
      if (!r) {
        r = L.rectangle(tileBounds(t.row, t.col), { interactive: false, weight: 1 }).addTo(m);
        rects.current.set(t.id, r);
      }
      const color = cssVar(RISK_VAR[t.currentRiskLevel]);
      const dim = props.onlyHighCritical && (t.currentRiskLevel === "Low" || t.currentRiskLevel === "Moderate");
      const isSel = props.selectedTileId === t.id || props.selectedTileIds?.has(t.id);
      const baseOpacity = t.currentRiskLevel === "Low" ? 0.12 : t.currentRiskLevel === "Moderate" ? 0.38 : 0.52;
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
        opacity: dim ? 0.1 : strokeOpacity,
        dashArray: dash,
        fillColor: color,
        fillOpacity: dim ? 0.03 : baseOpacity,
      });
      if (isSel) r.bringToFront();
    }
  }, [props.tiles, props.selectedTileId, props.selectedTileIds, props.showPredicted, props.onlyHighCritical]);

  // incidents (closure overlay)
  useEffect(() => {
    const g = layers.current.incidents;
    if (!g) return;
    g.clearLayers();
    const crit = cssVar("--risk-critical");
    for (const i of props.incidents) {
      const [row, col] = i.tileId.slice(2).split("_").map(Number);
      const b = tileBounds(row, col);
      L.rectangle(b, {
        interactive: false,
        color: crit,
        weight: 3,
        fillOpacity: 0,
        className: "sf-closure",
      }).addTo(g);
      const label = i.status === "ClosedAllTraffic" ? "⛔" : i.status === "ClosedSmallVehicles" ? "🚫" : "⚠";
      L.marker([(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2], {
        interactive: false,
        icon: L.divIcon({ className: "sf-icon", html: `<span class="sf-closure-pin" aria-label="Road incident">${label}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
      }).addTo(g);
    }
  }, [props.incidents]);

  // alert badges
  useEffect(() => {
    const g = layers.current.badges;
    if (!g) return;
    g.clearLayers();
    for (const t of props.tiles) {
      if (!props.alertTileIds.has(t.id)) continue;
      const [[s], [n, e]] = tileBounds(t.row, t.col);
      L.marker([n - (n - s) * 0.18, e - GRID.dLng * 0.18], {
        interactive: false,
        icon: L.divIcon({ className: "sf-icon", html: `<span class="sf-badge">!</span>`, iconSize: [14, 14], iconAnchor: [7, 7] }),
      }).addTo(g);
    }
  }, [props.tiles, props.alertTileIds]);

  // reports
  useEffect(() => {
    const g = layers.current.reports;
    if (!g) return;
    g.clearLayers();
    const mode = props.showReports ?? "all";
    if (mode === "none") return;
    for (const r of props.reports) {
      if (r.status === "Dismissed") continue;
      if (mode === "unverified" && r.status !== "Unverified") continue;
      L.marker([r.lat, r.lng], {
        interactive: false,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="sf-report ${r.status === "Verified" ? "is-verified" : ""}"></span>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
      }).addTo(g);
    }
  }, [props.reports, props.showReports]);

  // shelters
  useEffect(() => {
    const g = layers.current.shelters;
    if (!g) return;
    g.clearLayers();
    for (const s of props.shelters) {
      const hl = props.highlightShelterId === s.id;
      L.marker([s.lat, s.lng], {
        interactive: false,
        zIndexOffset: hl ? 1000 : 0,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="sf-shelter ${hl ? "is-hl" : ""}" title="${s.name}">⌂</span>`,
          iconSize: hl ? [36, 36] : [26, 26],
          iconAnchor: hl ? [18, 18] : [13, 13],
        }),
      }).addTo(g);
    }
    if (props.highlightShelterId) {
      const s = props.shelters.find((x) => x.id === props.highlightShelterId);
      if (s) map.current?.flyTo([s.lat, s.lng], 17, { duration: 0.6 });
    }
  }, [props.shelters, props.highlightShelterId]);

  // route
  useEffect(() => {
    const g = layers.current.route;
    if (!g) return;
    g.clearLayers();
    const prim = cssVar("--route");
    const pin = (id: string | null | undefined, txt: string) => {
      if (!id) return;
      const t = props.tiles.find((x) => x.id === id);
      if (!t) return;
      L.marker([t.centerLat, t.centerLng], {
        interactive: false,
        zIndexOffset: 2000,
        icon: L.divIcon({ className: "sf-icon", html: `<span class="sf-route-pin">${txt}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
      }).addTo(g);
    };
    if (props.routePath?.length) {
      const pts = props.routePath.map((t) => [t.centerLat, t.centerLng] as [number, number]);
      L.polyline(pts, { color: cssVar("--background"), weight: 9, opacity: 0.9, interactive: false }).addTo(g);
      L.polyline(pts, { color: prim, weight: 5, opacity: 1, interactive: false, dashArray: "1 0" }).addTo(g);
      map.current?.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 17 });
    }
    pin(props.routeFromId, "A");
    pin(props.routeToId, "B");
  }, [props.routePath, props.routeFromId, props.routeToId, props.tiles]);

  // user position
  useEffect(() => {
    const g = layers.current.user;
    if (!g) return;
    g.clearLayers();
    if (props.userPos)
      L.marker(props.userPos, {
        interactive: false,
        icon: L.divIcon({ className: "sf-icon", html: `<span class="sf-user"></span>`, iconSize: [18, 18], iconAnchor: [9, 9] }),
      }).addTo(g);
  }, [props.userPos]);

  // pulse on new report
  useEffect(() => {
    const g = layers.current.pulse;
    if (!g || !props.pulseTileId) return;
    g.clearLayers();
    const t = props.tiles.find((x) => x.id === props.pulseTileId);
    if (!t) return;
    L.marker([t.centerLat, t.centerLng], {
      interactive: false,
      icon: L.divIcon({ className: "sf-icon", html: `<span class="sf-pulse"></span>`, iconSize: [60, 60], iconAnchor: [30, 30] }),
    }).addTo(g);
    const timer = setTimeout(() => g.clearLayers(), 3200);
    return () => clearTimeout(timer);
  }, [props.pulseTileId]); // eslint-disable-line react-hooks/exhaustive-deps

  // focus
  useEffect(() => {
    if (props.focus && map.current) map.current.flyTo([props.focus.lat, props.focus.lng], props.focus.zoom ?? 17, { duration: 0.6 });
  }, [props.focus]);

  return (
    <div
      ref={el}
      className={`h-full w-full ${props.pickMode ? "sf-picking" : ""}`}
      role="application"
      aria-label="Flood severity map. Click a tile to see details."
    />
  );
}
