import { useState } from "react";
import { Layers, Check } from "lucide-react";
import type { MapLayerOptions } from "@/lib/flood/types";

interface MapLayerControlsProps {
  options: MapLayerOptions;
  onChange: (options: MapLayerOptions) => void;
  isAdmin?: boolean;
}

export default function MapLayerControls({ options, onChange, isAdmin }: MapLayerControlsProps) {
  const [open, setOpen] = useState(false);

  const toggle = (key: keyof MapLayerOptions) => {
    onChange({
      ...options,
      [key]: !options[key],
    });
  };

  return (
    <div className="absolute top-4 right-4 z-20">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
        aria-label="Toggle map layer visibility controls"
      >
        <Layers className="h-4 w-4 text-sky-600 dark:text-sky-400" />
        <span>Map Layers</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl p-3 space-y-2 text-xs text-slate-700 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100">
            <span>Map Layer Visibility</span>
            {isAdmin && <span className="text-[10px] text-sky-600 font-normal">Admin Mode</span>}
          </div>

          {/* Technical Grid Toggle (Feature 5) */}
          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Technical Flood Grid</span>
              </div>
              <p className="text-[10px] text-slate-400">24×24 100m² computational blocks</p>
            </div>
            <input
              type="checkbox"
              checked={options.showTechnicalGrid}
              onChange={() => toggle("showTechnicalGrid")}
              className="h-4 w-4 rounded-sm border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
          </label>

          {/* Flood-Affected Roads Toggle (Feature 6) */}
          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Flood-Affected Roads
              </div>
              <p className="text-[10px] text-slate-400">Hazard-highlighted street corridors</p>
            </div>
            <input
              type="checkbox"
              checked={options.showAffectedRoads}
              onChange={() => toggle("showAffectedRoads")}
              className="h-4 w-4 rounded-sm border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
          </label>

          {/* Road Closures */}
          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <span className="font-semibold">Road Closures (⛔)</span>
            <input
              type="checkbox"
              checked={options.showClosures}
              onChange={() => toggle("showClosures")}
              className="h-4 w-4 rounded-sm border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
          </label>

          {/* Relief Shelters */}
          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <span className="font-semibold">Relief Shelters (⌂)</span>
            <input
              type="checkbox"
              checked={options.showShelters}
              onChange={() => toggle("showShelters")}
              className="h-4 w-4 rounded-sm border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
          </label>

          {/* Evacuation Route */}
          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <span className="font-semibold">Evacuation Route (Road)</span>
            <input
              type="checkbox"
              checked={options.showEvacuationRoute}
              onChange={() => toggle("showEvacuationRoute")}
              className="h-4 w-4 rounded-sm border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
          </label>

          {/* Citizen Reports */}
          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <span className="font-semibold">Citizen Reports</span>
            <input
              type="checkbox"
              checked={options.showReports}
              onChange={() => toggle("showReports")}
              className="h-4 w-4 rounded-sm border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
          </label>
        </div>
      )}
    </div>
  );
}
