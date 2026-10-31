# StreetFlood Live — Production Upgrade Plan

## What I found (from screenshots of desktop + phone)

- Everything except the map tiles is fake: reports, sensors, rainfall, shelters, alerts, closures are seeded demo data saved only in one browser.
- Locked to a small Sion–Kurla box. No search, "Jump" chips are hard-coded, GPS only works inside the box.
- Map is visually overloaded: orange grid lines, all roads painted green, dozens of overlapping pins, three floating toolbars. A normal person can't tell "is my street safe?" at a glance.
- Phone: map buried under banner + chips + toggles; key actions are tiny icons; the details panel is a long technical score breakdown ("+20, +40, sensor 2/4").
- "Resident / Control Room" switch lets anyone act as the authority. No accounts, no moderation, no spam protection.
- Developer jargon everywhere ("ClosedAllTraffic", "Block 21Q", "simulated", "hackathon prototype").

## Goal

A real app anyone, anywhere, can open on their phone, see live flood conditions around **their own location**, report flooding in 3 taps, get alerts, and find a safe route or shelter — backed by real data and real accounts.

## Phase 1 — Real backend (Lovable Cloud)

- Enable Lovable Cloud: database, accounts, photo storage.
- Tables: reports, report votes (confirm / "no longer flooded"), road incidents, alerts, shelters, user profiles, roles, alert subscriptions.
- Accounts: email + Google sign-in. Browsing is open to everyone; reporting requires sign-in (stops spam).
- Roles: `citizen`, `moderator`, `authority`, `admin` in a separate roles table. Control Room only visible to authority/moderator; admin grants roles.
- Photos uploaded to storage (compressed), not stuffed in the browser.
- Live updates: new reports and alerts appear on everyone's map without refreshing.
- Report auto-expiry (reports fade after 6 h unless re-confirmed), rate limit (e.g. 5 reports/hour/user), duplicate merge within ~50 m.

## Phase 2 — Real, worldwide data

- **Place search:** search any address/area worldwide (OpenStreetMap geocoding), with recent searches.
- **Real GPS:** "Use my location" with permission prompt, live blue dot with accuracy circle, follow-me mode; graceful fallback when denied.
- **Dynamic grid:** 100 m tiles generated for whatever area is on screen (no fixed box). Scores computed from data in view.
- **Real rainfall:** live last-hour rain and 3-hour forecast from Open-Meteo (free, no key) per area, cached on the server.
- **Real terrain risk:** elevation from Open-Meteo elevation API to mark low-lying spots instead of hand-labelled hotspots.
- **Real shelters & help points:** schools, community centres, hospitals, police, fire stations pulled from OpenStreetMap for the visible area; authorities can add/verify official shelters.
- **Real routing:** existing road router (OSRM) runs anywhere, avoiding reported flooded roads and closures.
- **Sensors:** removed from the public score (no real hardware). Kept as an optional "sensor feed" endpoint authorities can push readings into later.
- All demo seed data and "simulated" labels removed from the public app; a separate Demo Mode toggle in settings for presentations only.

## Phase 3 — Scoring engine rework

- Score = verified reports + community-confirmed reports (weighted by confirmations and recency decay) + authority closures + real rainfall vs drainage/elevation.
- Plain-language result per street: "Safe", "Water on road – walk carefully", "Avoid – deep water", "Closed".
- 3-hour forecast warning based on real forecast + low-lying terrain.
- Technical breakdown moved into an expandable "Why?" section.
- Update existing engine tests and add tests for decay, confirmation weighting and rate limits.

## Phase 4 — UX redesign (the biggest change)

**Phone-first layout**
- Full-screen map, one search bar on top, one big bottom sheet (peek / half / full) that always answers "What's happening near me?".
- Bottom bar with 4 clear tabs: **Map · Report · Alerts · Help**.
- Big red "Report flooding" button reachable by thumb.

**Cleaner map**
- No grid lines by default — soft colour heat overlay only where there is risk.
- Only flooded/risky roads coloured; normal roads left untouched.
- Pins clustered when zoomed out; one icon style per type.
- Simple legend: 4 colours with words.

**Report in 3 taps**
1. Location auto-filled from GPS (drag to adjust).
2. Pick water depth with pictures (ankle / knee / waist).
3. Optional photo + note → Send. Works offline and sends when back online.

**Near me panel**
- "Your area: Water on road" headline, nearest risky streets, nearest shelter with distance + "Directions", active alerts.

**Safe route**
- "Where to?" search, start defaults to my location, clear safe vs risky route comparison, turn-by-turn list, open in Google Maps option.

**Alerts**
- Follow places (home, work); in-app notifications + browser push for alerts in followed areas.

**Help / Emergency**
- Local emergency numbers by country (auto-detected from location), tap-to-call, preparedness checklist.

**Control Room (authorities)**
- Separate page: moderation queue (verify / dismiss with one tap), draw-on-map closures, compose alert for a drawn area, live stats dashboard.

**Polish**
- Remove hackathon banner and jargon; friendly copy.
- Onboarding: 3 short screens on first visit + location permission.
- Dark mode, accessibility (contrast, screen reader labels, large touch targets), loading skeletons, empty and error states.
- Installable app (add to home screen) with offline map shell.
- Languages: English + Hindi + Marathi to start.

## Phase 5 — Production hardening

- Security: row-level access rules on every table, role checks on the server, input validation, photo size/type limits, security scan.
- Performance: only load data for the visible area, caching of weather/shelter lookups, lazy loading the map.
- SEO + share previews for each page; privacy policy and terms pages; clear disclaimer for emergencies.
- Error monitoring and friendly error pages.
- End-to-end checks with real sign-in: report → verify → appears on map → alert → route avoids it, on phone and desktop.

## Order of work

```text
1. Cloud + accounts + roles + tables
2. Search, GPS, dynamic grid, real weather/elevation/shelters
3. New scoring engine + tests
4. New phone-first UI, report flow, near-me, routing, alerts, help
5. Control Room rebuild
6. Push notifications, offline, languages, install
7. Security, performance, legal pages, full end-to-end testing
```

## Technical details

- Server logic via `createServerFn`; weather/elevation/Overpass/Nominatim calls proxied and cached server-side (respecting Nominatim usage policy, custom User-Agent).
- Tiles keyed by snapped lat/lng (≈100 m), computed per viewport bbox; reports stored with lat/lng + indexed for bbox queries.
- Realtime via Cloud subscriptions on reports/alerts/incidents filtered by viewport.
- Roles in `user_roles` + `has_role()` security-definer function; RLS on all tables.
- Push via Web Push (VAPID secret) + service worker; offline report queue in IndexedDB.
- Existing `localStorage` store replaced by query-backed data; demo seed kept behind Demo Mode only.

## Notes / limits

- Real street-level sensors need hardware; the app will be ready to accept them but won't fake them.
- Free OpenStreetMap services have rate limits; for heavy traffic a paid geocoding/routing provider may be needed later.
- This is large; I'll build it in the order above and check each step in the preview.
