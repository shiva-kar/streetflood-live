# StreetFlood Live — Production Roadmap & Milestones

Architecture Rule: Strictly 100% free-tier zero-cost infrastructure (GitHub Pages static hosting, free-tier Supabase, OpenStreetMap Overpass, Project OSRM, Open-Meteo).

### Completed Production Milestones (v2.0.0)

- [x] **Worldwide Place Search & GPS Location**: Real GPS auto-acquisition and Nominatim place geocoding with snapping.
- [x] **Live Precipitation & 3-Hour Forecast**: Open-Meteo precipitation models with provenance tracking (`live`, `cached`, `unavailable`).
- [x] **Dynamic Micro-Grid Simulation**: Worldwide $100\text{m} \times 100\text{m}$ street cells with elevation and drainage modeling.
- [x] **Verified Emergency Shelter Network**: Hybrid engine combining comprehensive regional offline database with live OpenStreetMap Overpass queries.
- [x] **Safe Evacuation Routing (OSRM)**: Road-network routing with obstacle avoidance, turn-by-turn guidance, and transparent geodesic corridor fallback (`provider: "CorridorFallback"`).
- [x] **Mathematical Severity Engine**: Multi-factor scoring with temporal decay (4–6 hours), rapid spam dampening ($0.2\times$ for duplicate text), depth multipliers ($0.5\times$ to $2.0\times$), and mathematical clamping $[0, 100]$.
- [x] **Phone-First UX**: 3-snap bottom sheet docking flush above bottom nav on mobile, non-overlapping floating card on desktop.
- [x] **Rapid 3-Tap Citizen Reporting**: Water depth selector, camera photo upload with client-side canvas compression, and automatic location tagging.
- [x] **Emergency Preparedness & Helplines**: Country and state emergency numbers (112, 1070, 108, 1916/1533) with offline checklists.
- [x] **Municipal Control Room**: Incident management console for verifying citizen observations, issuing road closures, and broadcasting ward alerts.
- [x] **Free-Tier Supabase & Offline Queue**: IndexedDB queue for offline field reporting with automatic synchronization when back online.
- [x] **Automated Supabase Keepalive**: GitHub Actions workflow to prevent free-tier project dormancy.
- [x] **Multilingual Localization**: Complete support for English (`en`), Kannada (`kn`), Hindi (`hi`), and Marathi (`mr`).
- [x] **Offline PWA Support**: Service worker caching and background sync registration.
- [x] **Zero-Regression Verification**: 76 automated Vitest tests passing across 13 test suites.

### Future Roadmap & Enhancements

- [ ] Connect optional external Supabase production database keys for cloud team sync.
- [ ] Integration with municipal Common Alerting Protocol (CAP) RSS feeds.
- [ ] Community crowdsourced drain blockage reports with photo verification.
