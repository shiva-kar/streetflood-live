<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# StreetFlood Live — Production UI/UX & Engineering Standards

## Preventing "AI Half-Coded" (AI Slop) Patterns

AI code generators often generate superficially polished components that fail in real-world production. All contributors and AI agents working on this codebase must strictly adhere to the following rules:

### 1. Geometric Congruity & Docking Integrity
- **No Overlapping Mismatched Containers:** Never stack floating elements with differing `max-w-*` values (e.g. a `max-w-xl` bottom sheet paired with a `max-w-md` nav bar) that produce cut-off rectangular ears or misaligned edges.
- **Mobile Docking (`< sm`):** Bottom sheets and bottom navigation bars must span full width (`w-full left-0 right-0`) and dock flush with zero vertical gaps. Background tiles must never bleed beneath the navigation bar.
- **Desktop Layout (`sm:` and above):** Desktop viewports must not mimic mobile phone screens. Map status and inspection panels must render as floating left sidebar cards (`top-20 left-4 w-[400px]`), keeping the map fully interactive. Navigation must be a clean, self-contained floating action pill (`bottom-6 left-1/2 -translate-x-1/2`).
- **Consistent Radius System:** Cards and modals use `rounded-2xl`; mobile bottom sheets use `rounded-t-3xl`; compact badges use `rounded-md` or `rounded-full`. Never mix jarring radius scales within the same visual hierarchy.

### 2. Zero Demo/Mock Data Leakage in Production
- **No "Demo" or "(simulated)" Labels:** Public production views must never show mock markers, fake sensor IDs, or `(simulated)` tags.
- **True Geodesic Calculations:** All distance measurements must use the Haversine formula (`getHaversineDistanceKm`), not Euclidean degree differences.
- **Comprehensive Multiregional Data:** When a user searches or views a location (e.g. Assam, Odisha, Delhi, or abroad), the application must resolve real regional emergency shelters and relief hubs from the comprehensive database (`sheltersDatabase.ts`) and live OpenStreetMap Overpass queries. It must never falsely show distant Mumbai facilities for other regions.

### 3. Exhaustive State Modeling
- Every component must explicitly handle:
  1. **Loading State:** Clean skeletons or pulse indicators.
  2. **Empty State:** Friendly, actionable fallback when no reports/incidents exist.
  3. **Error State:** Human-readable explanations with retry options.
  4. **Overflow State:** Truncated text with tooltips, flex containers that never force horizontal page scroll.

### 4. Zero Dead Buttons or Placeholders
- Every interactive element (button, link, toggle, chip) must execute a real functional action (e.g., OSRM safe road route generation, external Google Maps directions, real GPS acquisition, report submission).

### 5. Mobile Ergonomics & Accessibility (WCAG 2.2 AA)
- Minimum touch target size: 44×44px for primary interactive elements.
- Always include `safe-area-inset-bottom` padding (`pb-[max(0.5rem,env(safe-area-inset-bottom))]`) for bezel-less mobile screens.
- Maintain high contrast ratios for critical flood safety text and color-blind accessible risk indicators.
