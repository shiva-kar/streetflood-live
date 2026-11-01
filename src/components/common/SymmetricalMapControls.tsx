import { Layers, MapPinned } from "lucide-react";

export function SymmetricalMapControls({ onLayers, onLocate }: { onLayers: () => void; onLocate: () => void }) {
  return (
    <div className="absolute right-3 top-20 z-[500] flex flex-col gap-2">
      <button type="button" onClick={onLayers} aria-label="Map layers" className="flex h-12 w-12 items-center justify-center rounded-full border-2 bg-background/95 shadow-lg">
        <Layers className="h-5 w-5" />
      </button>
      <button type="button" onClick={onLocate} aria-label="Locate me" className="flex h-12 w-12 items-center justify-center rounded-full border-2 bg-background/95 shadow-lg">
        <MapPinned className="h-5 w-5" />
      </button>
    </div>
  );
}
