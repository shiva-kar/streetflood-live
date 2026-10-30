import { useState, useRef, useEffect } from "react";
import {
  Camera,
  UploadCloud,
  X,
  MapPin,
  Check,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
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
    desc: "Dangerous, cars submerged, evacuation needed",
    icon: "⚠️",
  },
];

const DEMO_PHOTOS = [
  { label: "Sample: Waterlogged Street", url: "/images/demo-flood-1.jpg" },
  { label: "Sample: Submerged Subway", url: "/images/demo-flood-2.jpg" },
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
      // Default to known hotspot or first tile
      const hotspot = tiles.find((t) => t.isHotspot);
      setSelectedTileId(hotspot ? hotspot.id : tiles[0].id);
    }
  }, [preselectedTileId, tiles, selectedTileId]);

  if (!open) return null;

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
    // Reset fields
    setDescription("");
    setPhotoData(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="report-dialog-title"
                className="font-display font-bold text-base text-foreground"
              >
                Report Street Flooding
              </h2>
              <p className="text-xs text-muted-foreground">
                Crowdsource street conditions to keep neighbors safe
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Close report dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          {/* Location Block Selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="location-select"
              className="font-semibold text-foreground flex items-center gap-1.5"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>Location / Block</span>
            </label>
            <select
              id="location-select"
              value={selectedTileId}
              onChange={(e) => setSelectedTileId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {tiles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.locality} ({t.ward.toUpperCase()}) {t.isHotspot ? "★ Hotspot" : ""}
                </option>
              ))}
            </select>
            {currentTile && (
              <p className="text-[11px] text-muted-foreground">
                Selected: Block {currentTile.row + 1}
                {String.fromCharCode(65 + (currentTile.col % 26))} • Current Severity:{" "}
                <span className="font-semibold text-foreground">
                  {currentTile.currentRiskLevel} ({currentTile.currentSeverityScore}/100)
                </span>
              </p>
            )}
          </div>

          {/* Water Depth Level */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Water Depth Level</label>
            <div className="grid grid-cols-2 gap-2">
              {DEPTH_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setDepth(opt.value)}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                    depth === opt.value
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="report-desc" className="font-semibold text-foreground">
              What do you see? (Description)
            </label>
            <Textarea
              id="report-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Water rising quickly near the bus stop, two-wheelers stalling, footpath submerged..."
              className="text-xs resize-none"
              required
            />
          </div>

          {/* Photo Upload & Preview */}
          <div className="space-y-2">
            <label className="font-semibold text-foreground flex items-center justify-between">
              <span>Photo Verification (Recommended)</span>
              {photoData && (
                <button
                  type="button"
                  onClick={() => setPhotoData(null)}
                  className="text-[10px] text-destructive hover:underline"
                >
                  Remove Photo
                </button>
              )}
            </label>

            {photoData ? (
              <div className="relative rounded-lg overflow-hidden border border-border h-36 bg-black/5 flex items-center justify-center">
                <img src={photoData} alt="Flood preview" className="h-full w-full object-cover" />
                <Badge className="absolute bottom-2 left-2 text-[10px] bg-background/80 text-foreground backdrop-blur-xs border">
                  Ready to attach
                </Badge>
              </div>
            ) : (
              <div className="space-y-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary rounded-lg p-3 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40"
                >
                  <UploadCloud className="h-6 w-6 mx-auto text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground mt-1">
                    Click to upload from camera or files
                  </p>
                  <p className="text-[10px] text-muted-foreground">
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

                {/* Quick Demo Photo Presets for Hackathon Testing */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">
                    Or test with demo photo:
                  </span>
                  {DEMO_PHOTOS.map((dp, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setPhotoData(dp.url)}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-background hover:bg-accent text-foreground font-medium"
                    >
                      {dp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-md bg-muted/50 p-2.5 text-[11px] text-muted-foreground border">
            <p>
              • Reports are marked as <strong>Unverified (Crowdsourced)</strong> until reviewed by
              municipal staff.
              <br />• Submitting will immediately boost this tile's severity score and display on
              the live map.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="font-semibold">
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
