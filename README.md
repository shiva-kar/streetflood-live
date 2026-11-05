# StreetFlood Live 🌊

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Application](https://img.shields.io/badge/Live%20Demo-shivakar.me-0284c7?style=flat&logo=google-chrome&logoColor=white)](https://shivakar.me/streetflood-live/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-success?logo=github)](https://shiva-kar.github.io/streetflood-live/)
[![Deploy Status](https://github.com/shiva-kar/streetflood-live/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/shiva-kar/streetflood-live/actions/workflows/deploy.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![OpenStreetMap](https://img.shields.io/badge/OSM-936%20Road%20Segments-7ebc6f?logo=openstreetmap&logoColor=white)](https://www.openstreetmap.org/)
[![Tests](https://img.shields.io/badge/Vitest-76%2F76%20Passing-success?logo=vitest&logoColor=white)](https://vitest.dev/)

**StreetFlood Live** is an independent, production-grade urban flood monitoring, predictive early warning, and safe evacuation routing platform designed to help residents, emergency responders, and municipal authorities understand localized street-level inundation, assess road network accessibility, and coordinate safe evacuations.

The platform bridges the gap between macro-level meteorological forecasts and micro-level street reality by integrating geospatial mapping, an auditable micro-grid flood severity engine, predictive early warnings, live road-network routing, and citizen crowdsourced telemetry.

Focusing on high-density monsoon flood corridors (such as the flagship **Sion–Kurla Basin in Mumbai** with 936 OpenStreetMap road segments and the **Bengaluru Tech Corridors**), StreetFlood Live operates on a 100% free-tier, zero-cost, privacy-respecting architecture.

🌐 **Live Application**: [https://shivakar.me/streetflood-live/](https://shivakar.me/streetflood-live/)  
💻 **GitHub Repository**: [https://github.com/shiva-kar/streetflood-live/](https://github.com/shiva-kar/streetflood-live/)

---

## 🌟 Core Capabilities

- **Hyperlocal 100m Micro-Grid**: Divides urban corridors into $100\text{m} \times 100\text{m}$ grid cells, evaluating an individual flood severity score based on crowdsourced observations, real-time precipitation radar, drainage capacity, and ultrasonic depth sensor inputs.
- **Auditable 4-Tier Severity Classification**:
  - 🟢 **Low Risk (0–19)**: Normal conditions, streets clear and safe to navigate.
  - 🟡 **Moderate Risk (20–39)**: Street waterlogging, pooling on shoulders; slow traffic.
  - 🟠 **High Risk (40–69)**: Significant inundation; two-wheelers and low-clearance vehicles barred.
  - 🔴 **Critical Risk (70–100)**: Severe inundation, submerged thoroughfares; immediate evacuation advised.
- **Road-Network Risk Analysis**: Evaluates OpenStreetMap road segments (including 128.45 km across Sion–Kurla), applying color-coded accessibility overlays to communicate road conditions in real time.
- **Safe Evacuation Routing (OSRM + Dynamic Detour)**: Calculates road-based evacuation paths to nearest emergency shelters using OpenStreetMap and OSRM, actively avoiding flooded zones and municipal road closures.
- **Transparent Offline Fallback**: If the public routing service is unavailable, the application provides an estimated direct corridor bearing with prominent advisory notices rather than fabricating turn-by-turn road geometry.
- **3-Hour Predictive Early Warning**: Estimates localized inundation risk up to three hours ahead using Open-Meteo precipitation forecasts, drainage capacity factors, and topological catchment risk profiles.
- **Civic AI Assistant**: Built-in municipal assistant delivering actionable civic flood guidance, emergency hotline dispatch, and multilingual localization (English, Kannada, Hindi).
- **Municipal Control Room**: Professional incident management console allowing authorities to verify citizen reports, declare road closures, and publish targeted ward advisories.
- **Emergency Shelter Directory**: Comprehensive offline database and live OpenStreetMap Overpass queries for emergency shelters, assembly points, and relief centers with capacity tracking and accessibility attributes.
- **Mobile-First Responsive Ergonomics**: Built to WCAG 2.2 AA standards with full-width docking on mobile devices and a non-overlapping floating card interface on desktop viewports.

---

## 📐 Flood Severity Scoring Formula

Each micro-grid cell computes its score using an open, auditable weighted formula:

$$\text{Severity} = \min\left(100, \; \max\left(0, \; \sum R_{\text{unverified}} \times M_d \times D_t \times S_d + \sum R_{\text{verified}} \times M_d \times D_t + W_{\text{closure}} + S_{\text{sensor}} + I_{\text{rain}}\right)\right)$$

### Factor Breakdown:

1. **Citizen Field Observations**:
   - $R_{\text{unverified}}$: Unverified citizen report (+10 base points)
   - $R_{\text{verified}}$: Municipal verified report (+20 base points)
2. **Water Depth Multiplier ($M_d$)**:
   - Footpath / curb puddle (0–5 cm): $\times 0.5$
   - Ankle-deep (5–15 cm): $\times 1.0$
   - Knee-deep (15–45 cm): $\times 1.5$
   - Waist-deep or higher (>45 cm): $\times 2.0$
3. **Temporal Decay Factor ($D_t$)**:
   - Reports $\le 4$ hours old: $1.0$ (full weight)
   - Reports between 4 and 6 hours old: linear decay down to $0.5$
   - Reports $> 6$ hours old: automatically expired and excluded from scoring
4. **Anti-Spam Dampening ($S_d$)**:
   - Submissions with identical descriptions for the same tile within 2 minutes receive a $0.2\times$ dampening factor to prevent bot manipulation and accidental multi-taps.
5. **Municipal Road Incidents ($W_{\text{closure}}$)**:
   - `PartiallyFlooded`: +5 points
   - `ClosedSmallVehicles`: +10 points
   - `ClosedAllTraffic`: +15 points
6. **Telemetry Depth Sensors ($S_{\text{sensor}}$)**:
   - +5 points per level (Levels 1–4, up to +20 points)
7. **Rainfall Intensity Index ($I_{\text{rain}}$)**:
   - Real-time hourly precipitation scaled inversely by local drainage capacity (up to +10 points).

---

## 🏗️ Architecture & Data Provenance

StreetFlood Live enforces a strict separation of concerns across clean architectural layers:

```
┌────────────────────────────────────────────────────────┐
│                   Presentation Layer                   │
│   ProductionHeader • FloodMap • ProductionBottomSheet  │
│   ThreeTapReportModal • ControlRoomModal • CivicAI     │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│              Application & State Management            │
│       useAppState (Store) • TanStack Router & Query    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                Domain & Hydrology Engine               │
│     computeTiles • predictRisk • planRoute • Haversine │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│              Geospatial & Ingestion Layer              │
│   OSM Overpass • OSRM Routing • Open-Meteo Radar/Elev  │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│             Persistence & Integrity Layer              │
│  IndexedDB (Offline Queue) • LocalStorage (Debounced)  │
└────────────────────────────────────────────────────────┘
```

### Honest Data Provenance
Every data stream carries explicit provenance metadata:
- **Live External Radar**: Sourced from Open-Meteo with status badges (`live`, `cached`, `unavailable`) and retrieval timestamps.
- **Geodesic Road Routing**: OSRM road geometry with active obstacle intersection detection. If offline, the app switches to an honest `provider: "CorridorFallback"` vector with prominent advisory disclaimers.
- **Crowdsourced Data**: Citizen reports are tagged as `Unverified` until confirmed by municipal authorities or corroborated by telemetry.

---

## 🛠️ Technology Stack

- **Frontend Core**: [React 19](https://react.dev/), [TypeScript 5.9](https://www.typescriptlang.org/) (Strict Mode)
- **Routing & SSR**: [TanStack Router](https://tanstack.com/router), [TanStack Start](https://tanstack.com/start)
- **UI & Styling**: [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/), [Sonner Toasts](https://sonner.emilkowal.ski/)
- **Geospatial & Mapping**: [Leaflet 1.9](https://leafletjs.com/), [OpenStreetMap](https://www.openstreetmap.org/), [Project OSRM Engine](https://project-osrm.org/)
- **Build & Server**: [Vite 8](https://vitejs.dev/), [Cloudflare Nitro Preset](https://nitro.unjs.io/)
- **Testing**: [Vitest 4](https://vitest.dev/) (76/76 unit and integration tests passing)
- **Deployment**: GitHub Actions, GitHub Pages, Custom Domain ([shivakar.me](https://shivakar.me/streetflood-live/))

---

## 🔬 Engineering & Quality Highlights

- **Zero-Regression Test Suite**: 76 automated tests verifying hydrology algorithms, road obstacle avoidance, consensus scoring, offline queueing, and zero-cost guard conformance.
- **Offline-First PWA Support**: Service worker caching and IndexedDB offline queueing for incident reports submitted in areas with severed mobile connectivity.
- **Zero-Cost Architectural Guard**: Automated checks ensure all external endpoints (Nominatim, Open-Meteo, Overpass, OSRM) strictly conform to public, zero-cost operational tiers.
- **Accessibility & Contrast**: Built to WCAG 2.2 AA standards with high-contrast map themes, color-blind accessible risk palettes, and $\ge 44\text{px}$ touch targets.
- **Input Validation & Security**: Coordinate bounds checking, HTML sanitization, and quota-protected storage serialization.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.x or v20.x recommended)
- `npm` or `pnpm`

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/shiva-kar/streetflood-live.git
   cd streetflood-live
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:8080](http://localhost:8080) in your browser.

4. **Run test suite**:
   ```bash
   npm run test
   ```

5. **Lint and type-check**:
   ```bash
   npx eslint . --quiet
   npx tsc --noEmit
   ```

6. **Build for production**:
   ```bash
   npm run build
   ```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<!-- LOVABLE:BEGIN -->

## Lovable Integration

This project is connected to [Lovable](https://lovable.dev). Pushes to the `main` branch sync directly back to Lovable.

<!-- LOVABLE:END -->
