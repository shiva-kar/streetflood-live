# StreetFlood Live

Use the complete StreetFlood Live Build Plan provided in the attached Markdown document as the authoritative technical and functional specification.

I want you to IMPLEMENT THE COMPLETE APPLICATION, not generate another plan, explanation, wireframe or partial prototype.

### 1. Implementation requirements

Build the complete StreetFlood Live application in the existing project in one comprehensive implementation.

Before modifying anything:
- Inspect the existing project structure and dependencies.
- Preserve existing working functionality.
- Reuse the current framework and compatible dependencies.
- Avoid unnecessary rewrites or additional dependencies.

Implement all seven features described in the build plan:

1. Live Flood Map with Severity Scores.
2. Crowdsourced Photo and Report Submission.
3. Safe Route Navigation.
4. Targeted Alert Notifications.
5. Municipal Control Room Dashboard.
6. Predictive Flood Risk and Early Warning System.
7. Emergency Preparedness and Evacuation Assistance.

Do not silently omit features.

### 2. Functional requirements

Every feature must have working interactions, not merely a visual representation.

Specifically:
- Submitting a flood report must update the associated map tile's severity.
- Uploading a photograph must show a preview.
- Verifying or dismissing reports must update their status.
- Road closures must visibly affect the resident map.
- Publishing an authority alert must make it visible to residents in the selected area.
- Predictive risk must respond to rainfall, hotspot and drainage inputs.
- Predicted risk must generate corresponding advance-warning suggestions.
- Safe routing must calculate a route that accounts for flooded tiles.
- High and Critical risk locations must expose the preparedness and evacuation panel.
- Shelters, emergency contacts and checklists must be accessible from the preparedness panel.

Use localStorage or another lightweight local persistence mechanism so that refreshing the application does not unnecessarily erase demo interactions.

### 3. Predictive system

Implement the rule-based predictive system described in the specification.

Do not introduce an unnecessary machine-learning model.

The system must:
- Calculate current flood severity.
- Calculate predicted risk for the next three hours.
- Explain why a particular location is considered at risk.
- Display predicted risk separately from current flood severity.
- Generate advance-warning suggestions for Moderate predicted-risk locations.

### 4. Map and routing

The map must be the central component of the application.

Implement:
- Interactive map with zoom and pan.
- Flood severity grid overlays.
- Individual tile selection and details.
- Flood report markers.
- Road closure indicators.
- Predicted-risk overlays.
- Shelter markers.
- Route visualization.

Use Leaflet and OpenStreetMap where compatible with the existing project.

Implement simplified A* or Dijkstra routing using the flood-risk information from the build plan. Clearly identify approximate routes as demonstration routes rather than verified safe navigation.

### 5. Interface and design

Create a professional, modern, polished interface suitable for a national-level hackathon demonstration.

Requirements:
- Mobile-first responsive design.
- Map-centric resident experience.
- Clear risk indicators and legends.
- Well-designed dashboard cards and information panels.
- Consistent typography, spacing and colors.
- Accessible contrast and readable labels.
- Proper loading, empty and error states.
- Smooth navigation between Resident View and Authority View.

Do not sacrifice functionality for animations or decorative UI.

### 6. Data and reliability

Use realistic Indian urban scenarios and seeded demonstration data.

Where real sensors, rainfall forecasts or official integrations are unavailable:
- Use clearly labelled simulated data.
- Never present simulated readings as verified real-world measurements.
- Distinguish verified authority reports from unverified community reports.
- Display timestamps and data freshness.
- Clearly disclose that the prototype is not intended for real emergency decisions.

Do not invent official municipal partnerships, shelter availability or emergency contacts.

### 7. Completion and verification

After implementation:

- Check all major user workflows.
- Check all buttons, forms, navigation and interactive controls.
- Verify resident and authority views.
- Verify persistence after refreshing.
- Verify that changing a report or incident updates the appropriate map information.
- Fix compilation errors, broken imports and runtime errors.
- Ensure the application can start successfully using the existing project configuration.

Do not leave placeholder buttons, fake functionality, TODO sections, unfinished screens or pseudocode.

If an external integration cannot be implemented without credentials or physical hardware, provide a functional simulated alternative and clearly label it.

### FINAL INSTRUCTION

Implement the complete, integrated StreetFlood Live application in this execution.

Prioritize a functional end-to-end product over additional features or architectural complexity.

Do not stop after creating the interface or basic application scaffold. Complete the implementation, verify the workflows and leave the project in a runnable state.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/72dcc901-6639-41be-b6e2-27dfc6951f04).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
