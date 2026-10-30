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

const RISK_HEX: Record<RiskLevel, string> = {
  Low: "#10b981",
  Moderate: "#f59e0b",
  High: "#f97316",
  Critical: "#ef4444",
};

export default function FloodMap(props: FloodMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const [L, setL] = useState<typeof LType | null>(null);
  const [currentZoom, setCurrentZoom] = useState(15);
  const map = useRef<LType.Map | null>(null);
  const rects = useRef(new Map<string, LType.Rectangle>());
  const layers = useRef<Record<string, LType.LayerGroup>>({});
  const propsRef = useRef(props);
  propsRef.current = props;

  // Load Leaflet dynamically on client-side
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
      minZoom: 12,
      maxZoom: 19,
      zoomControl: false,
      preferCanvas: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(m);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(m);

    const s = GRID.south;
    const w = GRID.west;
    m.setMaxBounds(
      L.latLngBounds(
        [s - 0.04, w - 0.04],
        [s + GRID.rows * GRID.dLat + 0.04, w + GRID.cols * GRID.dLng + 0.04],
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

    m.on("zoomend", () => {
      setCurrentZoom(m.getZoom());
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
    }, 100);

    const ro = new ResizeObserver(() => {
      m.invalidateSize();
    });
    ro.observe(el.current);

    const currentRects = rects.current;
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      currentRects.clear();
    };
  }, [L]);

  // Tiles grid overlay with Level-of-Detail zoom scaling
  useEffect(() => {
    if (!L || !map.current) return;
    const m = map.current;
    const isCityZoom = currentZoom < 14;

    for (const t of props.tiles) {
      let r = rects.current.get(t.id);
      if (!r) {
        r = L.rectangle(tileBounds(t.row, t.col), { interactive: true }).addTo(m);
        r.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          propsRef.current.onTileClick(t.id, t.centerLat, t.centerLng);
        });
        rects.current.set(t.id, r);
      }

      const color = RISK_HEX[t.currentRiskLevel];
      const isDimmed =
        props.onlyHighCritical &&
        (t.currentRiskLevel === "Low" || t.currentRiskLevel === "Moderate");
      const isSelected = props.selectedTileId === t.id || props.selectedTileIds?.has(t.id);

      // Clean, readable opacity levels
      let baseOpacity = 0.08;
      if (t.currentRiskLevel === "Moderate") baseOpacity = 0.28;
      if (t.currentRiskLevel === "High") baseOpacity = 0.45;
      if (t.currentRiskLevel === "Critical") baseOpacity = 0.65;

      let strokeColor = color;
      let strokeWeight = isCityZoom ? 0 : 0.6;
      let strokeOpacity = isCityZoom ? 0 : 0.25;
      let dashArray: string | undefined = undefined;

      // 3h Predicted overlay: Only Moderate predicted gets an amber dashed outline
      if (
        props.showPredicted &&
        t.predictedRisk === "Moderate" &&
        t.currentRiskLevel !== "Critical"
      ) {
        strokeColor = "#f59e0b";
        strokeWeight = 2;
        strokeOpacity = 0.9;
        dashArray = "4 3";
      }

      // Selected tile outline
      if (isSelected) {
        strokeColor = "#0284c7";
        strokeWeight = 3;
        strokeOpacity = 1;
        dashArray = undefined;
      }

      r.setStyle({
        color: strokeColor,
        weight: strokeWeight,
        opacity: isDimmed ? 0.05 : strokeOpacity,
        dashArray: dashArray,
        fillColor: color,
        fillOpacity: isDimmed ? 0.02 : baseOpacity,
      });

      if (isSelected) {
        r.bringToFront();
      }
    }
  }, [
    L,
    props.tiles,
    props.selectedTileId,
    props.selectedTileIds,
    props.showPredicted,
    props.onlyHighCritical,
    currentZoom,
  ]);

  // Road closures overlay (Dashed red box + hazard pin)
  useEffect(() => {
    if (!L) return;
    const g = layers.current.incidents;
    if (!g) return;
    g.clearLayers();

    for (const i of props.incidents) {
      const [row, col] = i.tileId.slice(2).split("_").map(Number);
      const b = tileBounds(row, col);

      L.rectangle(b, {
        interactive: false,
        color: "#dc2626",
        weight: 2.5,
        fillColor: "#dc2626",
        fillOpacity: 0.15,
        className: "sf-closure",
      }).addTo(g);

      const label =
        i.status === "ClosedAllTraffic" ? "⛔" : i.status === "ClosedSmallVehicles" ? "🚫" : "⚠️";
      const marker = L.marker([(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2], {
        interactive: true,
        zIndexOffset: 500,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="sf-closure-pin cursor-pointer hover:scale-110 transition-transform" title="Road Incident: ${i.description}">${label}</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(g);

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        propsRef.current.onTileClick(i.tileId, (b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2);
      });
    }
  }, [L, props.incidents]);

  // Alert badges: ONLY rendered for specific official targeted alerts, NOT all 576 tiles!
  useEffect(() => {
    if (!L) return;
    const g = layers.current.badges;
    if (!g) return;
    g.clearLayers();

    // At city zoom, avoid cluttering
    if (currentZoom < 13) return;

    for (const t of props.tiles) {
      if (!props.alertTileIds.has(t.id)) continue;
      const [[s], [n, e]] = tileBounds(t.row, t.col);
      L.marker([n - (n - s) * 0.22, e - GRID.dLng * 0.22], {
        interactive: false,
        zIndexOffset: 400,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="sf-badge animate-pulse" title="Active Municipal Alert on this block">!</span>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(g);
    }
  }, [L, props.tiles, props.alertTileIds, currentZoom]);

  // Crowdsourced Report markers
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
        zIndexOffset: 300,
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

  // Relief Shelters markers
  useEffect(() => {
    if (!L) return;
    const g = layers.current.shelters;
    if (!g) return;
    g.clearLayers();

    for (const s of props.shelters) {
      const isHighlighted = props.highlightShelterId === s.id;
      const marker = L.marker([s.lat, s.lng], {
        interactive: true,
        zIndexOffset: isHighlighted ? 1200 : 250,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="sf-shelter cursor-pointer hover:scale-110 transition-transform ${isHighlighted ? "is-hl" : ""}" title="${s.name} (${s.capacityStatus})">⌂</span>`,
          iconSize: isHighlighted ? [38, 38] : [28, 28],
          iconAnchor: isHighlighted ? [19, 19] : [14, 14],
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

    const pin = (id: string | null | undefined, text: string, color: string) => {
      if (!id) return;
      const t = props.tiles.find((x) => x.id === id);
      if (!t) return;
      L.marker([t.centerLat, t.centerLng], {
        interactive: false,
        zIndexOffset: 1500,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="sf-route-pin" style="background:${color}">${text}</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(g);
    };

    if (props.routePath?.length) {
      const pts = props.routePath.map((t) => [t.centerLat, t.centerLng] as [number, number]);
      // Outline shadow
      L.polyline(pts, {
        color: "#ffffff",
        weight: 8,
        opacity: 0.9,
        interactive: false,
      }).addTo(g);
      // Main polyline
      L.polyline(pts, {
        color: "#6366f1",
        weight: 5,
        opacity: 1,
        interactive: false,
      }).addTo(g);

      map.current?.fitBounds(L.latLngBounds(pts).pad(0.2), { maxZoom: 17 });
    }

    pin(props.routeFromId, "A", "#10b981");
    pin(props.routeToId, "B", "#6366f1");
  }, [L, props.routePath, props.routeFromId, props.routeToId, props.tiles]);

  // User position marker
  useEffect(() => {
    if (!L) return;
    const g = layers.current.user;
    if (!g) return;
    g.clearLayers();
    if (props.userPos) {
      L.marker(props.userPos, {
        interactive: false,
        zIndexOffset: 1100,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="sf-user" title="Your Location"></span>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }).addTo(g);
    }
  }, [L, props.userPos]);

  // Pulse wave animation on new report
  useEffect(() => {
    if (!L) return;
    const g = layers.current.pulse;
    if (!g || !props.pulseTileId) return;
    g.clearLayers();
    const t = props.tiles.find((x) => x.id === props.pulseTileId);
    if (!t) return;

    L.marker([t.centerLat, t.centerLng], {
      interactive: false,
      zIndexOffset: 1600,
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
      map.current.flyTo([props.focus.lat, props.focus.lng], props.focus.zoom ?? 16, {
        duration: 0.6,
      });
    }
  }, [props.focus]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={el}
        className={`h-full w-full ${props.pickMode ? "sf-picking" : ""}`}
        role="application"
        aria-label="StreetFlood Live interactive flood severity map. Click any tile to inspect street level risk."
      />
      {!L && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 gap-3 z-30">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Initializing street-level map grid...
          </p>
        </div>
      )}
    </div>
  );
}
