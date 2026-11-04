import { useEffect, useRef, useState } from "react";
import type * as LType from "leaflet";
import { MAP_CENTER, type StaticRoadCorridor } from "@/lib/flood/data";
import { ALL_PRELOADED_OSM_ROADS, evaluateOsmRoadRisk } from "@/lib/flood/osmNetwork";
import { CELL_DLAT, getDLngForLat, tileIdFromLatLng } from "@/lib/flood/dynamicGrid";
import type {
  FloodReport,
  MapLayerOptions,
  RiskLevel,
  RoadIncident,
  Shelter,
  Tile,
} from "@/lib/flood/types";

export interface ViewportBounds {
  south: number;
  west: number;
  north: number;
  east: number;
  centerLat: number;
  centerLng: number;
  zoom: number;
}

export interface FloodMapProps {
  tiles: Tile[];
  reports: FloodReport[];
  incidents: RoadIncident[];
  shelters: Shelter[];
  alertTileIds: Set<string>;
  routePath?: Tile[] | null;
  roadRouteCoords?: [number, number][] | null;
  roadRouteSafety?: "Safe" | "Caution" | "HighRisk" | "Impassable";
  routeFromId?: string | null;
  routeToId?: string | null;
  routeFromCoord?: [number, number] | null;
  routeToCoord?: [number, number] | null;
  isShelterDestination?: boolean;
  layerOptions?: MapLayerOptions;
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
  initialCenter?: [number, number];
  onTileClick: (tileId: string, lat: number, lng: number) => void;
  onShelterClick?: (shelterId: string) => void;
  onRoadCorridorClick?: (corridor: StaticRoadCorridor) => void;
  onViewportChange?: (ids: Set<string>) => void;
  onBoundsChange?: (bounds: ViewportBounds) => void;
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
  const [currentZoom, setCurrentZoom] = useState(props.focus?.zoom ?? 13);
  const map = useRef<LType.Map | null>(null);
  const rects = useRef(new Map<string, LType.Rectangle>());
  const layers = useRef<Record<string, LType.LayerGroup>>({});
  const baseTiles = useRef<LType.TileLayer | null>(null);
  const lastFocusKey = useRef<number | null>(props.focus?.key ?? null);
  const lastHighlightedShelter = useRef<string | null>(null);
  const lastFittedRoute = useRef<string>("");
  const isUserInteracting = useRef(false);
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
    const center = props.initialCenter || props.userPos || MAP_CENTER;
    const safeCenter: [number, number] =
      center && !isNaN(center[0]) && !isNaN(center[1]) ? center : MAP_CENTER;

    const initialZoom = props.focus?.zoom ?? 14;

    const m = L.map(el.current, {
      center: safeCenter,
      zoom: initialZoom,
      minZoom: 3,
      maxZoom: 19,
      zoomControl: false,
      preferCanvas: true,
    });
    setCurrentZoom(initialZoom);

    // Dedicated panes for clean layer stacking
    if (!m.getPane("technicalGridPane")) {
      const p = m.createPane("technicalGridPane");
      p.style.zIndex = "250";
    }
    if (!m.getPane("osmRoadsPane")) {
      const p = m.createPane("osmRoadsPane");
      p.style.zIndex = "350";
    }
    if (!m.getPane("evacuationRoutePane")) {
      const p = m.createPane("evacuationRoutePane");
      p.style.zIndex = "450";
    }

    L.control.zoom({ position: "bottomleft" }).addTo(m);

    baseTiles.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(m);

    for (const k of [
      "corridors",
      "incidents",
      "badges",
      "reports",
      "shelters",
      "route",
      "user",
      "pulse",
    ]) {
      layers.current[k] = L.layerGroup().addTo(m);
    }

    m.on("click", (e: LType.LeafletMouseEvent) => {
      if (!e.latlng || isNaN(e.latlng.lat) || isNaN(e.latlng.lng)) return;
      const tid = tileIdFromLatLng(e.latlng.lat, e.latlng.lng);
      propsRef.current.onTileClick(tid, e.latlng.lat, e.latlng.lng);
    });

    m.on("dragstart zoomstart movestart", (e: any) => {
      // If user starts manual drag/zoom, halt any programmatic animation immediately
      if (e?.originalEvent) {
        isUserInteracting.current = true;
        m.stop();
      }
    });

    m.on("dragend zoomend moveend", () => {
      isUserInteracting.current = false;
      setCurrentZoom(m.getZoom());
    });

    const emitViewport = () => {
      const b = m.getBounds();
      const center = m.getCenter();
      if (!b || !center || isNaN(center.lat) || isNaN(center.lng)) return;

      const ids = new Set<string>();
      for (const t of propsRef.current.tiles) {
        if (!isNaN(t.centerLat) && !isNaN(t.centerLng) && b.contains([t.centerLat, t.centerLng])) {
          ids.add(t.id);
        }
      }
      propsRef.current.onViewportChange?.(ids);
      propsRef.current.onBoundsChange?.({
        south: b.getSouth(),
        west: b.getWest(),
        north: b.getNorth(),
        east: b.getEast(),
        centerLat: center.lat,
        centerLng: center.lng,
        zoom: m.getZoom(),
      });
      setCurrentZoom(m.getZoom());
    };

    m.on("moveend", emitViewport);
    map.current = m;
    if (typeof window !== "undefined") {
      (window as any).__leafletMap = m;
    }

    setTimeout(() => {
      m.invalidateSize({ animate: false, pan: false });
      emitViewport();
    }, 100);

    let lastWidth = el.current.clientWidth;
    let lastHeight = el.current.clientHeight;
    let resizeTimer: number | null = null;

    const ro = new ResizeObserver((entries) => {
      if (!el.current || !map.current) return;
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (Math.abs(width - lastWidth) > 3 || Math.abs(height - lastHeight) > 3) {
        lastWidth = width;
        lastHeight = height;
        if (resizeTimer) window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          map.current?.invalidateSize({ animate: false, pan: false });
        }, 150);
      }
    });
    ro.observe(el.current);

    const currentRects = rects.current;
    return () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      ro.disconnect();
      m.remove();
      map.current = null;
      if (typeof window !== "undefined") {
        delete (window as any).__leafletMap;
      }
      currentRects.clear();
    };
  }, [L]);

  useEffect(() => {
    if (!L || !map.current || !baseTiles.current) return;
    const m = map.current;
    baseTiles.current.remove();
    baseTiles.current = L.tileLayer(
      props.layerOptions?.highContrast
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 19, attribution: props.layerOptions?.highContrast ? "&copy; CARTO &copy; OpenStreetMap" : "&copy; OpenStreetMap" },
    ).addTo(m);
  }, [L, props.layerOptions?.highContrast]);

  // Handle focus changes (Place search or GPS jump) - strictly deduplicated
  useEffect(() => {
    if (!map.current || !props.focus) return;
    if (isNaN(props.focus.lat) || isNaN(props.focus.lng)) return;
    if (props.focus.key === lastFocusKey.current) return;
    lastFocusKey.current = props.focus.key;
    map.current.flyTo([props.focus.lat, props.focus.lng], props.focus.zoom ?? 15, {
      duration: 0.8,
    });
  }, [props.focus]);

  // Clean soft heat overlay: only renders risk colors where risk > 0
  useEffect(() => {
    if (!L || !map.current) return;
    const m = map.current;
    const showGrid = props.layerOptions?.showTechnicalGrid ?? false;

    // Prune stale tiles from cache
    const activeTileIds = new Set(props.tiles.map((t) => t.id));
    for (const [id, r] of rects.current.entries()) {
      if (!activeTileIds.has(id)) {
        r.remove();
        rects.current.delete(id);
      }
    }

    for (const t of props.tiles) {
      if (isNaN(t.centerLat) || isNaN(t.centerLng)) continue;
      const hasRisk = t.currentSeverityScore >= 20 || t.closure !== undefined;
      const isSelected = props.selectedTileId === t.id || props.selectedTileIds?.has(t.id);

      // If no risk and not selected and technical grid is off, leave tile transparent
      if (!hasRisk && !isSelected && !showGrid) {
        const existing = rects.current.get(t.id);
        if (existing) {
          existing.setStyle({ stroke: false, fill: false, fillOpacity: 0, opacity: 0 });
        }
        continue;
      }

      let r = rects.current.get(t.id);
      if (!r) {
        const dLng = getDLngForLat(t.centerLat);
        const south = t.centerLat - CELL_DLAT / 2;
        const north = t.centerLat + CELL_DLAT / 2;
        const west = t.centerLng - dLng / 2;
        const east = t.centerLng + dLng / 2;

        r = L.rectangle(
          [
            [south, west],
            [north, east],
          ],
          { interactive: true, pane: "technicalGridPane" },
        ).addTo(m);

        r.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          propsRef.current.onTileClick(t.id, t.centerLat, t.centerLng);
        });
        rects.current.set(t.id, r);
      }

      const color = props.layerOptions?.highContrast
        ? ({ Low: "#00ff88", Moderate: "#ffff00", High: "#ff6600", Critical: "#ff0033" } as Record<RiskLevel, string>)[t.currentRiskLevel] || "#00ff88"
        : RISK_HEX[t.currentRiskLevel] || "#10b981";
      const isDimmed =
        props.onlyHighCritical &&
        (t.currentRiskLevel === "Low" || t.currentRiskLevel === "Moderate");

      let fillOpacity = 0;
      if (t.currentRiskLevel === "Moderate") fillOpacity = 0.25;
      else if (t.currentRiskLevel === "High") fillOpacity = 0.42;
      else if (t.currentRiskLevel === "Critical") fillOpacity = 0.65;

      let strokeColor = color;
      let strokeWeight = showGrid ? 0.6 : 0;
      let strokeOpacity = showGrid ? 0.2 : 0;
      let dashArray: string | undefined = undefined;

      // 3h Predictive overlay
      if (
        props.showPredicted &&
        t.predictedRisk === "Moderate" &&
        t.currentRiskLevel !== "Critical"
      ) {
        strokeColor = "#f59e0b";
        strokeWeight = 1.8;
        strokeOpacity = 0.85;
        dashArray = "4, 3";
      }

      // Selected tile outline
      if (isSelected) {
        strokeColor = "#0284c7";
        strokeWeight = 2.5;
        strokeOpacity = 1;
        dashArray = undefined;
      }

      r.setStyle({
        color: strokeColor,
        weight: strokeWeight,
        opacity: isDimmed ? 0.05 : strokeOpacity,
        dashArray: dashArray,
        fillColor: color,
        fillOpacity: isDimmed ? 0.02 : fillOpacity,
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
    props.layerOptions?.showTechnicalGrid,
    currentZoom,
  ]);

  // Roads overlay: only highlights risky or closed roads
  useEffect(() => {
    if (!L) return;
    const g = layers.current.corridors;
    if (!g) return;
    g.clearLayers();

    if (props.layerOptions?.showAffectedRoads === false) return;

    const tileMap = new Map(props.tiles.map((t) => [t.id, t]));

    const bounds = map.current?.getBounds();
    for (const road of ALL_PRELOADED_OSM_ROADS) {
      if (bounds && road.coordinates.length > 0) {
        const [cLat, cLng] = road.coordinates[0];
        if (!bounds.contains([cLat, cLng])) continue;
      }
      const evalResult = evaluateOsmRoadRisk(road, tileMap, props.incidents, props.reports);
      const { riskLevel, severityScore, reason } = evalResult;

      if (riskLevel === "Unassessed") continue;

      // Clean map hierarchy:
      // At overview zooms (< 14.5), show major arterial corridors for clear road passability.
      // Minor residential alleys appear when zooming into street level (>= 14.5).
      // All hazards (Moderate, High, Critical, Closed) are ALWAYS displayed at any zoom level.
      if (riskLevel === "Low" && !road.isMajor && currentZoom < 14.5) {
        continue;
      }

      let strokeColor = "#10b981";
      let weight = currentZoom < 14.5 ? 2.4 : 2;
      let opacity = currentZoom < 14.5 ? 0.55 : 0.65;
      let dashArray: string | undefined = undefined;

      if (riskLevel === "Closed") {
        strokeColor = "#991b1b";
        weight = 5;
        opacity = 1.0;
        dashArray = "6, 6";
      } else if (riskLevel === "Critical") {
        strokeColor = "#dc2626";
        weight = 4.5;
        opacity = 0.95;
      } else if (riskLevel === "High") {
        strokeColor = "#ea580c";
        weight = 3.6;
        opacity = 0.9;
      } else if (riskLevel === "Moderate") {
        strokeColor = "#f59e0b";
        weight = 3;
        opacity = 0.85;
      }

      const line = L.polyline(road.coordinates, {
        pane: "osmRoadsPane",
        color: strokeColor,
        weight: weight,
        opacity: opacity,
        dashArray: dashArray,
        lineCap: "round",
        lineJoin: "round",
        interactive: true,
      }).addTo(g);

      line.bindTooltip(
        `<div class="p-1 text-xs font-sans">
          <strong>${road.name}</strong><br/>
          <span style="color:#64748b; font-size:11px;">${road.highway.toUpperCase()}</span><br/>
          <span class="font-bold ${
            riskLevel === "Closed"
              ? "text-red-600"
              : riskLevel === "Critical"
                ? "text-red-500"
                : riskLevel === "High"
                  ? "text-orange-500"
                  : "text-amber-500"
          }">
            ${riskLevel === "Closed" ? "⛔ Closed to Traffic" : `${riskLevel} Flood Risk (${severityScore}/100)`}
          </span><br/>
          <span style="font-size:10px; color:#475569;">${reason}</span>
        </div>`,
        { sticky: true },
      );

      line.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        if (road.tileIds.length > 0) {
          const t = tileMap.get(road.tileIds[0]);
          if (t && !isNaN(t.centerLat) && !isNaN(t.centerLng)) {
            propsRef.current.onTileClick(t.id, t.centerLat, t.centerLng);
          }
        }
      });
    }
  }, [L, props.tiles, props.incidents, props.reports, props.layerOptions?.showAffectedRoads, currentZoom]);

  // Road closures overlay (Hazard pins)
  useEffect(() => {
    if (!L) return;
    const g = layers.current.incidents;
    if (!g) return;
    g.clearLayers();

    if (props.layerOptions?.showClosures === false) return;

    for (const i of props.incidents) {
      let lat = (i as { lat?: number }).lat;
      let lng = (i as { lng?: number }).lng;

      // Fallback: derive coordinates from tileId if missing
      if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
        const t = props.tiles.find((tile) => tile.id === i.tileId);
        if (t && !isNaN(t.centerLat) && !isNaN(t.centerLng)) {
          lat = t.centerLat;
          lng = t.centerLng;
        } else if (i.tileId && i.tileId.startsWith("t_")) {
          const parts = i.tileId.slice(2).split("_").map(Number);
          if (!isNaN(parts[0]) && !isNaN(parts[1])) {
            lat = 19.04 + (parts[0] + 0.5) * 0.0009;
            lng = 72.86 + (parts[1] + 0.5) * 0.00095;
          }
        }
      }

      if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) continue;

      const label =
        i.status === "ClosedAllTraffic" ? "⛔" : i.status === "ClosedSmallVehicles" ? "🚫" : "⚠️";
      const marker = L.marker([lat, lng], {
        interactive: true,
        zIndexOffset: 500,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="sf-closure-pin cursor-pointer hover:scale-110 transition-transform shadow-md" title="Road Incident: ${i.description}">${label}</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(g);

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        propsRef.current.onTileClick(i.tileId, lat!, lng!);
      });
    }
  }, [L, props.incidents, props.tiles, props.layerOptions?.showClosures]);

  // Crowdsourced Report markers
  useEffect(() => {
    if (!L) return;
    const g = layers.current.reports;
    if (!g) return;
    g.clearLayers();

    if (props.layerOptions?.showReports === false) return;
    const mode = props.showReports ?? "all";
    if (mode === "none") return;

    const ICONS: Record<string, string> = {
      Footpath: "🦶",
      Ankles: "👞",
      Knees: "🛵",
      WaistPlus: "⚠️",
    };

    for (const r of props.reports) {
      if (r.status === "Dismissed") continue;
      if (mode === "unverified" && r.status !== "Unverified") continue;

      let lat = r.lat;
      let lng = r.lng;
      if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
        const t = props.tiles.find((tile) => tile.id === r.tileId);
        if (t && !isNaN(t.centerLat) && !isNaN(t.centerLng)) {
          lat = t.centerLat;
          lng = t.centerLng;
        }
      }
      if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) continue;

      const iconEmoji = ICONS[r.severityUser] || "💧";
      const isVerified = r.status === "Verified";

      const marker = L.marker([lat, lng], {
        interactive: true,
        zIndexOffset: 300,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-slate-900 border-2 ${
            isVerified ? "border-emerald-500 shadow-emerald-500/30" : "border-amber-500"
          } shadow-md cursor-pointer hover:scale-125 transition-transform text-xs" title="${r.status}: ${r.severityUser} - ${r.description}">${iconEmoji}</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(g);

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        propsRef.current.onTileClick(r.tileId, lat!, lng!);
      });
    }
  }, [L, props.reports, props.tiles, props.showReports, props.layerOptions?.showReports]);

  // Dedicated effect to smoothly pan to selected shelter ONCE without oscillation
  useEffect(() => {
    if (!map.current || !props.highlightShelterId) {
      lastHighlightedShelter.current = null;
      return;
    }
    if (props.highlightShelterId === lastHighlightedShelter.current) return;
    lastHighlightedShelter.current = props.highlightShelterId;
    const s = props.shelters.find((x) => x.id === props.highlightShelterId);
    if (s && !isNaN(s.lat) && !isNaN(s.lng)) {
      map.current.flyTo([s.lat, s.lng], 16, { duration: 0.6 });
    }
  }, [props.highlightShelterId, props.shelters]);

  // Shelters markers overlay
  useEffect(() => {
    if (!L) return;
    const g = layers.current.shelters;
    if (!g) return;
    g.clearLayers();

    if (props.layerOptions?.showShelters === false) return;

    // Performance & Usability Guard:
    // Only show individual shelter pins when zoomed into district or city level (currentZoom >= 11).
    // At state / national zoom (< 11), do not render individual pins so the map never lags or swarms.
    const zoomLevel = map.current ? map.current.getZoom() : currentZoom;
    if (zoomLevel < 11 && !props.highlightShelterId) {
      return;
    }

    const bounds = map.current?.getBounds();
    const center = map.current?.getCenter() || { lat: 12.9716, lng: 77.5946 };

    // Filter candidate shelters within current viewport bounds
    const candidateShelters = props.shelters.filter((s) => {
      if (s.lat == null || s.lng == null || isNaN(s.lat) || isNaN(s.lng)) return false;
      if (props.highlightShelterId === s.id) return true;
      return bounds ? bounds.contains([s.lat, s.lng]) : true;
    });

    // Sort by distance to center and cap at 35 markers to guarantee 60 FPS performance
    const displayShelters = candidateShelters
      .map((s) => ({
        shelter: s,
        distSq: (s.lat - center.lat) ** 2 + (s.lng - center.lng) ** 2,
      }))
      .sort((a, b) => a.distSq - b.distSq)
      .slice(0, 35)
      .map((item) => item.shelter);

    for (const s of displayShelters) {
      const isHighlighted = props.highlightShelterId === s.id;
      const size = isHighlighted ? 36 : currentZoom < 13 ? 24 : 28;
      const anchor = size / 2;

      const marker = L.marker([s.lat, s.lng], {
        interactive: true,
        zIndexOffset: isHighlighted ? 1200 : 250,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="sf-shelter cursor-pointer hover:scale-125 transition-transform ${
            isHighlighted ? "is-hl shadow-lg ring-2 ring-white" : ""
          }" style="width:${size}px;height:${size}px;font-size:${size > 20 ? 12 : 9}px;line-height:${size}px;" title="${s.name} (${s.capacityStatus})">⌂</span>`,
          iconSize: [size, size],
          iconAnchor: [anchor, anchor],
        }),
      }).addTo(g);

      marker.bindTooltip(
        `<div class="p-1 text-xs font-sans">
          <strong>${s.name}</strong><br/>
          <span style="color:#64748b; font-size:11px;">${s.address}</span><br/>
          <span class="font-bold text-emerald-600">${s.capacityStatus}</span>
        </div>`,
        { sticky: true },
      );

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        propsRef.current.onShelterClick?.(s.id);
      });
    }
  }, [L, props.shelters, props.highlightShelterId, props.layerOptions?.showShelters, currentZoom]);

  // Safe road route polyline
  useEffect(() => {
    if (!L) return;
    const g = layers.current.route;
    if (!g) return;
    g.clearLayers();

    if (props.layerOptions?.showEvacuationRoute === false) return;

    if (props.roadRouteCoords && props.roadRouteCoords.length > 0) {
      const pts = props.roadRouteCoords.filter(
        (p) => Array.isArray(p) && p.length >= 2 && !isNaN(p[0]) && !isNaN(p[1]),
      );
      if (pts.length < 2) return;

      const isImpassable = props.roadRouteSafety === "Impassable";
      const routeColor = isImpassable ? "#dc2626" : "#059669";

      // White outline casing
      L.polyline(pts, {
        color: "#ffffff",
        weight: 8,
        opacity: 0.95,
        interactive: false,
      }).addTo(g);

      // Main line
      L.polyline(pts, {
        pane: "evacuationRoutePane",
        color: routeColor,
        weight: 5,
        opacity: 1,
        dashArray: isImpassable ? "8, 8" : undefined,
        interactive: false,
      }).addTo(g);

      // Auto-fit map viewport ONCE per unique route path (deduplicated to prevent jitter)
      const routeSig = pts.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join(";");
      if (routeSig !== lastFittedRoute.current) {
        lastFittedRoute.current = routeSig;
        try {
          const routeBounds = L.latLngBounds(pts);
          if (routeBounds.isValid()) {
            map.current?.fitBounds(routeBounds.pad(0.22), {
              animate: true,
              duration: 0.8,
              maxZoom: 16,
            });
          }
        } catch {
          // Fallback
        }
      }
    } else {
      lastFittedRoute.current = "";
    }
  }, [L, props.roadRouteCoords, props.roadRouteSafety, props.layerOptions?.showEvacuationRoute]);

  // User GPS position marker
  useEffect(() => {
    if (!L) return;
    const g = layers.current.user;
    if (!g) return;
    g.clearLayers();
    if (props.userPos && !isNaN(props.userPos[0]) && !isNaN(props.userPos[1])) {
      L.marker(props.userPos, {
        interactive: false,
        zIndexOffset: 1100,
        icon: L.divIcon({
          className: "sf-icon",
          html: `<span class="sf-user animate-pulse" title="Your GPS Location"></span>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      }).addTo(g);
    }
  }, [L, props.userPos]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={el} className="w-full h-full" />
    </div>
  );
}
