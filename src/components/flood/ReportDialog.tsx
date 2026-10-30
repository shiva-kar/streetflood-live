import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Camera, UploadCloud, X, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { fileToCompactDataUrl, setState, uid } from "@/lib/flood/store";
import { toast } from "sonner";
import type { FloodReport, Tile, WaterDepth } from "@/lib/flood/types";

interface ReportDialogProps {
  open: boolean;
  preselectedTileId?: string | null;
  tiles: Tile[];
  onClose: () => void;
  onReportSubmitted: (tileId: string) => void;
}

const DEPTH_OPTIONS: { value: WaterDepth; label: string; desc: string; icon: string }[] = [
  {
    value: "Footpath",
    label: "Footpath Level",
    desc: "Sidewalk puddles, drains overflowing",
    icon: "🦶",
  },
  {
    value: "Ankles",
    label: "Up to Ankles",
    desc: "5–10 cm water, slow traffic, walkable",
    icon: "👞",
  },
  {
    value: "Knees",
    label: "Up to Knees",
    desc: "20–40 cm, 2-wheelers risk engine stalling",
    icon: "🛵",
  },
  {
    value: "WaistPlus",
    label: "Waist or Higher",
    desc: "Dangerous, cars submerged, rescue needed",
    icon: "⚠️",
  },
];

const DEMO_PHOTOS = [
  {
    label: "Sample: Waterlogged Street",
    url: `${import.meta.env.BASE_URL}images/demo-flood-1.jpg`,
  },
  {
    label: "Sample: Submerged Subway",
    url: `${import.meta.env.BASE_URL}images/demo-flood-2.jpg`,
  },
];

export default function ReportDialog({
  open,
  preselectedTileId,
  tiles,
  onClose,
  onReportSubmitted,
}: ReportDialogProps) {
  const [selectedTileId, setSelectedTileId] = useState<string>("");
  const [depth, setDepth] = useState<WaterDepth>("Knees");
  const [description, setDescription] = useState("");
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preselectedTileId) {
      setSelectedTileId(preselectedTileId);
    } else if (tiles.length > 0 && !selectedTileId) {
      const hotspot = tiles.find((t) => t.isHotspot);
      setSelectedTileId(hotspot ? hotspot.id : tiles[0].id);
    }
  }, [preselectedTileId, tiles, selectedTileId]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const currentTile = tiles.find((t) => t.id === selectedTileId);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToCompactDataUrl(file);
      setPhotoData(dataUrl);
      toast.success("Photo attached and optimized for storage!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process photo.";
      toast.error(msg);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTile) {
      toast.error("Please select a location block.");
      return;
    }

    if (!description.trim()) {
      toast.error("Please enter a short description of the water conditions.");
      return;
    }

    setIsSubmitting(true);

    const newReport: FloodReport = {
      id: uid("rep"),
      tileId: currentTile.id,
      lat: currentTile.centerLat + (Math.random() - 0.5) * 0.0003,
      lng: currentTile.centerLng + (Math.random() - 0.5) * 0.0003,
      description: description.trim(),
      severityUser: depth,
      photoUrl: photoData || undefined,
      createdAt: new Date().toISOString(),
      status: "Unverified",
    };

    setState((prev) => ({
      ...prev,
      reports: [newReport, ...prev.reports],
    }));

    toast.success(
      `Flood report submitted! Tile ${currentTile.locality} severity updated. Marked as Unverified (Crowdsourced).`,
      { duration: 4000 },
    );

    onReportSubmitted(currentTile.id);
    setIsSubmitting(false);
    onClose();
    setDescription("");
    setPhotoData(null);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-dialog-title"
      className="sf-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sf-modal-container w-full max-w-lg my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 font-bold">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="report-dialog-title"
                className="font-display font-bold text-lg text-slate-900 dark:text-slate-100"
              >
                Report Street Flooding
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Crowdsource street conditions to keep neighbors safe
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close report dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-sm overflow-y-auto">
          {/* Location Block Selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="location-select"
              className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5"
            >
              <MapPin className="h-4 w-4 text-sky-600" />
              <span>Location / Block</span>
            </label>
            <select
              id="location-select"
              value={selectedTileId}
              onChange={(e) => setSelectedTileId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            >
              {tiles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.locality} ({t.ward.toUpperCase()}) {t.isHotspot ? "★ Hotspot" : ""}
                </option>
              ))}
            </select>
            {currentTile && (
              <p className="text-xs text-slate-500">
                Selected: Block {currentTile.row + 1}
                {String.fromCharCode(65 + (currentTile.col % 26))} • Current Severity:{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {currentTile.currentRiskLevel} ({currentTile.currentSeverityScore}/100)
                </strong>
              </p>
            )}
          </div>

          {/* Water Depth Level Cards */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-900 dark:text-slate-100">
              Water Depth Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DEPTH_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setDepth(opt.value)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    depth === opt.value
                      ? "border-sky-600 bg-sky-50 dark:bg-sky-950/50 ring-2 ring-sky-600"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-slate-100">
                    <span className="text-base">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="report-desc" className="font-bold text-slate-900 dark:text-slate-100">
              Description / Visual Observations
            </label>
            <Textarea
              id="report-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Water rising quickly near the bus stop, two-wheelers stalling, footpath submerged..."
              className="text-sm resize-none rounded-lg border-slate-300 dark:border-slate-700"
              required
            />
          </div>

          {/* Photo Upload & Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Photo Verification (Recommended)
              </span>
              {photoData && (
                <button
                  type="button"
                  onClick={() => setPhotoData(null)}
                  className="text-xs text-red-600 font-semibold hover:underline"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {photoData ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-40 bg-black flex items-center justify-center">
                <img src={photoData} alt="Flood preview" className="h-full w-full object-cover" />
                <Badge className="absolute bottom-2 left-2 text-xs bg-slate-950/80 text-white backdrop-blur-xs">
                  Photo Attached
                </Badge>
              </div>
            ) : (
              <div className="space-y-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-800/40"
                >
                  <UploadCloud className="h-7 w-7 mx-auto text-slate-400" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    Click to capture or upload photo
                  </p>
                  <p className="text-xs text-slate-500">
                    JPG, PNG (Auto-compressed to compact format)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {/* Quick Presets for Demo Testing */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-slate-500">Or use sample photo:</span>
                  {DEMO_PHOTOS.map((dp, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setPhotoData(dp.url)}
                      className="text-xs px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium"
                    >
                      {dp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-slate-100 dark:bg-slate-800/60 p-3 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            • Reports are saved as <strong>Unverified (Crowdsourced)</strong> until reviewed by
            municipal staff.
            <br />• Submitting immediately updates the block's severity score and triggers a pulse
            on the live map.
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-sm border-slate-300 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="font-bold text-sm bg-sky-600 hover:bg-sky-700 text-white"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
