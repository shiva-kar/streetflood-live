# StreetFlood Live 🌊

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-shivakar.me-0284c7?style=flat&logo=google-chrome&logoColor=white)](https://shivakar.me/streetflood-live/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-success?logo=github)](https://shiva-kar.github.io/streetflood-live/)
[![Deploy Status](https://github.com/shiva-kar/streetflood-live/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/shiva-kar/streetflood-live/actions/workflows/deploy.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![OpenStreetMap](https://img.shields.io/badge/OSM-936%20Road%20Segments-7ebc6f?logo=openstreetmap&logoColor=white)](https://www.openstreetmap.org/)

**StreetFlood Live** is a hyperlocal street flood monitoring, predictive early warning, and road-based evacuation navigation platform designed for high-risk monsoon flood corridors.

Focusing on the critical **Sion–Kurla Corridor in Mumbai** (LBS Marg, Mithi River basin, Chunabhatti lowlands, and Eastern Express Highway approaches), StreetFlood Live bridges the gap between macro-level meteorological alerts and micro-level street reality.

🌐 **Production URL**: [https://shivakar.me/streetflood-live/](https://shivakar.me/streetflood-live/)  
🌐 **GitHub Pages Mirror**: [https://shiva-kar.github.io/streetflood-live/](https://shiva-kar.github.io/streetflood-live/)

---

## 🌟 Highlights & Features

### 1. 🗺️ Hyperlocal 100m² Micro-Grid Severity Engine

- Divides urban corridors into **100m × 100m micro-blocks** with individual real-time flood severity scores (0 to 100).
- Transparent weighted calculation combining:
  - **Crowdsourced citizen reports** (with water depth multipliers: Ankle ×1.0, Knee ×1.5, Waist/Chest ×2.0).
  - **Verified municipal inspector reports**.
  - **IoT curb-level depth sensors** (simulated telemetry).
  - **Live rainfall telemetry & drainage capacity indices**.
- Four standard severity tiers:
  - 🟢 **Low Risk (0–19)**: Passable, normal conditions.
  - 🟡 **Moderate Risk (20–39)**: Street waterlogging, drive with caution.
  - 🟠 **High Risk (40–69)**: Dangerous inundation, small vehicles barred.
  - 🔴 **Critical Risk (70–100)**: Impassable / submerged, evacuation advised.

### 2. 🛣️ Real Road-Network Evacuation Routing (OSRM)

- Unlike basic apps that draw straight lines across buildings and railway tracks, StreetFlood Live performs **true turn-by-turn routing along actual street network geometry** using OpenStreetMap and Project OSRM.
- Evaluates the flood risk of every road along candidate paths and automatically diverts users away from inundated corridors and official roadblocks toward the safest accessible relief shelter.

### 3. 🚦 936 OpenStreetMap Road Segments with Live Safety Overlays

- Real-time coloring for **128.45 km of street network** across the Sion–Kurla basin:
  - 🟢 **Emerald Green**: Safe & passable streets.
  - 🟡 **Vibrant Amber**: Moderate waterlogging.
  - 🟠 **Vivid Orange**: High hazard street.
  - 🔴 **Crimson Red**: Critical / impassable flood inundation.
  - 🛑 **Crimson Dashed**: Official municipal roadblock closures (⛔).

### 4. 🔮 3-Hour Predictive Early Warning System

- Anticipates emerging flash flood risks up to 3 hours in advance based on forecasted cloudburst intensity, localized drainage discharge limits, and topography.
- Generates proactive resident advisories before water accumulation becomes hazardous.

### 5. 🏢 Municipal Control Room Console

- Role-based switcher between **Resident View** and **Municipal Control Room**:
  - **Report Triage Queue**: Municipal operators can verify, inspect photos, or dismiss crowdsourced flood reports.
  - **Road Closure Manager**: Publish official roadblocks (⛔ Closed to All Traffic, 🚸 Closed to Small Vehicles) with live advisory notices instantly pushed to the map.
  - **Targeted Broadcast Advisories**: Dispatch localized ward-level warnings with audio/visual priority markers.

### 6. 🛟 Emergency Evacuation, Shelters & Offline Checklists

- Directory of designated municipal relief shelters (schools, community centres, civic halls) with capacity status, address details, and road navigation links.
- Direct speed-dial to emergency helplines (`Dial 112`, Disaster Management Cell).
- Emergency monsoon survival and family evacuation checklists.

### 7. 📱 Mobile Zero-Overlap Responsive Layout

- Optimized for mobile viewports (e.g. iPhone, Android) with:
  - Symmetrical icon-only map controls (`Map Layers` top-right, `Legend` bottom-right).
  - Floating 3-button circular dock (`[+]` Report, `[🧭]` Safe Route, `[📍]` GPS Locate) maintaining >200px of open map space.
  - Compact sliding drawer menu via hamburger button (`[☰]`).
  - Gesture-first touch controls (native pinch-to-zoom).

---

## 📐 Flood Severity Formula

Each 100m² tile computes its flood score using an open, auditable weighted formula:

$$\text{Severity} = \min\left(100, \; \sum R_{\text{unverified}} \times M_d + \sum R_{\text{verified}} \times M_d + W_{\text{closure}} + S_{\text{sensor}} + I_{\text{rain}}\right)$$

Where:

- $R_{\text{unverified}}$: Unverified citizen report (+10 base)
- $R_{\text{verified}}$: Municipal verified report (+20 base)
- $M_d$: Water Depth Multiplier
  - Ankle-deep (0–15 cm): $\times 1.0$
  - Knee-deep (15–45 cm): $\times 1.5$
  - Waist-deep (45–90 cm): $\times 2.0$
  - Impassable / Submerged (>90 cm): $\times 2.5$
- $W_{\text{closure}}$: Active road incident (+15 for ClosedAllTraffic, +8 for ClosedSmallVehicles)
- $S_{\text{sensor}}$: Telemetry curb sensor score (up to +25)
- $I_{\text{rain}}$: Real-time rainfall intensity index (up to +15)

---

## 🛠️ Tech Stack & Architecture

- **Frontend Core**: [React 19](https://react.dev/), [TypeScript 5.9](https://www.typescriptlang.org/)
- **Routing & State**: [TanStack Router](https://tanstack.com/router), [TanStack Query](https://tanstack.com/query)
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/), [Sonner Toasts](https://sonner.emilkowal.ski/)
- **Mapping & Geospatial**: [Leaflet 1.9](https://leafletjs.com/), [OpenStreetMap](https://www.openstreetmap.org/), [Project OSRM Routing Engine API](https://project-osrm.org/)
- **Build & Server**: [Vite 8](https://vitejs.dev/), [Cloudflare Nitro Preset](https://nitro.unjs.io/)
- **Testing**: [Vitest 4](https://vitest.dev/) (24/24 unit tests passing)
- **CI/CD & Hosting**: GitHub Actions + GitHub Pages with Custom Domain ([shivakar.me](https://shivakar.me/streetflood-live/))

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.x or v20.x recommended)
- `npm` or `bun`

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

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## 📂 Project Structure

```
streetflood-live/
├── .github/workflows/          # GitHub Actions deployment pipelines
├── public/                     # Static assets, icons, manifest
├── qa-evidence/                # Visual verification screenshots (Mobile & Desktop)
├── src/
│   ├── components/
│   │   ├── flood/              # Domain-specific flood components
│   │   │   ├── FloodMap.tsx          # Leaflet map with 936 OSM road overlays & 100m² grid
│   │   │   ├── Header.tsx            # Responsive header with mobile hamburger drawer
│   │   │   ├── MapLayerControls.tsx  # Layer visibility controls (Grid, Roads, Shelters, Closures)
│   │   │   ├── MapLegend.tsx         # Responsive flood risk legend & color scale
│   │   │   ├── RoutePanel.tsx        # Road-based evacuation route planner (OSRM)
│   │   │   ├── AuthorityDashboard.tsx# Municipal control room triage & road closures
│   │   │   ├── TileDetailsSheet.tsx  # In-depth tile flood score breakdown & sensor info
│   │   │   └── ...
│   │   └── ui/                 # Accessible Radix UI components
│   ├── lib/
│   │   └── flood/              # Core business logic & algorithms
│   │       ├── data.ts               # Geographic bounds, corridor zones & relief shelters
│   │       ├── engine.ts             # Micro-grid tile computation & flood scoring formula
│   │       ├── osmNetwork.ts         # OSM highway geometry parser & risk evaluator
│   │       ├── roadRouting.ts        # Turn-by-turn OSRM road evacuation routing
│   │       ├── store.ts              # Reactive state store with LocalStorage persistence
│   │       └── types.ts              # Domain TypeScript types
│   ├── routes/
│   │   ├── __root.tsx          # Root TanStack router layout
│   │   └── index.tsx           # Main application view (Resident / Control Room)
│   └── test/                   # Vitest unit test suites
├── LICENSE                     # MIT License
├── package.json
└── README.md
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<!-- LOVABLE:BEGIN -->

## Lovable Integration

This project was bootstrapped and synced with [Lovable](https://lovable.dev).

To develop with Lovable:

- Continue in the [Lovable Editor](https://lovable.dev/projects/72dcc901-6639-41be-b6e2-27dfc6951f04).
- Pushes to the `main` branch sync directly back to Lovable.

<!-- LOVABLE:END -->
