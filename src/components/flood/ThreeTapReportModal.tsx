import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Camera, X, Check, WifiOff, Sparkles } from "lucide-react";
import { fileToCompactDataUrl } from "@/lib/flood/store";
import { submitLiveReport } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { FloodReport, WaterDepth } from "@/lib/flood/types";
import { toast } from "sonner";

interface ThreeTapReportModalProps {
  open: boolean;
  onClose: () => void;
  userCoords: [number, number];
  locationAddressText?: string;
  onReportCreated: (newReport: FloodReport) => void;
}

const DEPTH_CARDS: Array<{
  depth: WaterDepth;
  icon: string;
  titleKey: "footpathLevel" | "ankleDeep" | "kneeDeep" | "waistDeep";
  descKey: "footpathDesc" | "ankleDesc" | "kneeDesc" | "waistDesc";
  colorClass: string;
}> = [
  {
    depth: "Footpath",
    icon: "🦶",
    titleKey: "footpathLevel",
    descKey: "footpathDesc",
    colorClass: "border-sky-300 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/40",
  },
  {
    depth: "Ankles",
    icon: "👞",
    titleKey: "ankleDeep",
    descKey: "ankleDesc",
    colorClass: "border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40",
  },
  {
    depth: "Knees",
    icon: "🛵",
    titleKey: "kneeDeep",
    descKey: "kneeDesc",
    colorClass: "border-orange-300 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/40",
  },
  {
    depth: "WaistPlus",
    icon: "⚠️",
    titleKey: "waistDeep",
    descKey: "waistDesc",
    colorClass: "border-red-400 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40",
  },
];

export default function ThreeTapReportModal({
  open,
  onClose,
  userCoords,
  locationAddressText,
  onReportCreated,
}: ThreeTapReportModalProps) {
  const t = useI18n();
  const [depth, setDepth] = useState<WaterDepth>("Knees");
  const [description, setDescription] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1024 / bitmap.width, 1024 / bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blobToDataUrl = (blob: Blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not encode photo."));
          reader.readAsDataURL(blob);
        });
      let quality = 0.8;
      let encoded: string | null = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", quality),
        );
        if (!blob) break;
        if (blob.size <= 150 * 1024) {
          encoded = await blobToDataUrl(blob);
          break;
        }
        quality -= 0.12;
      }
      if (!encoded) {
        canvas.width = Math.max(1, Math.round(canvas.width * 0.75));
        canvas.height = Math.max(1, Math.round(canvas.height * 0.75));
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", 0.65),
        );
        if (!blob || blob.size > 150 * 1024) throw new Error("Photo is too large after compression.");
        encoded = await blobToDataUrl(blob);
      }
      setPhotoDataUrl(encoded);
      bitmap.close();
    } catch {
      toast.error("Could not process photo. Please choose another image.");
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const created = await submitLiveReport({
        lat: userCoords[0],
        lng: userCoords[1],
        waterDepth: depth,
        description: description.trim(),
        photoDataUrl: photoDataUrl || undefined,
      });

      if (created) {
        onReportCreated(created);
        toast.success(t.reportSuccess);
        onClose();
        // Reset state
        setDepth("Knees");
        setDescription("");
        setPhotoDataUrl(null);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submission failed.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto overflow-x-hidden p-4 sm:p-5">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-red-600 dark:text-red-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
            {t.reportFlooding}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Report live water depth around your location in 3 quick taps.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* TAP 1: LOCATION AUTO-ACQUIRED */}
          <div className="p-3 rounded-xl bg-muted/60 border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-foreground truncate">
                  {locationAddressText || "Current GPS Location"}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {userCoords[0].toFixed(5)}, {userCoords[1].toFixed(5)}
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
              GPS Locked
            </span>
          </div>

          {/* TAP 2: SELECT WATER DEPTH */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-2">
              {t.waterDepth}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {DEPTH_CARDS.map((card) => {
                const isSelected = depth === card.depth;
                return (
                  <button
                    key={card.depth}
                    type="button"
                    onClick={() => setDepth(card.depth)}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between min-h-[82px] cursor-pointer ${card.colorClass} ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/30 bg-primary/5 shadow-sm"
                        : "opacity-85 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{card.icon}</span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="mt-1">
                      <p className="font-semibold text-xs text-foreground leading-tight">
                        {t[card.titleKey]}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        {t[card.descKey]}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAP 3: OPTIONAL PHOTO + SUBMIT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">{t.addPhoto}</span>
              {photoDataUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoDataUrl(null)}
                  className="text-[11px] text-destructive hover:underline cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {photoDataUrl ? (
              <div className="relative rounded-lg overflow-hidden border max-h-36 bg-black flex items-center justify-center">
                <img src={photoDataUrl} alt="Flood preview" className="object-contain max-h-36 w-full" />
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-9 border-dashed text-xs gap-2"
              >
                <Camera className="w-4 h-4 text-muted-foreground" />
                Take Photo or Choose File
              </Button>
            )}

            <Textarea
              placeholder={t.optionalNote}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-16 text-xs resize-none"
              maxLength={200}
            />
          </div>

          {/* SUBMIT BUTTON */}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            {isSubmitting ? t.submitting : t.submitReport}
          </Button>

          {typeof navigator !== "undefined" && !navigator.onLine && (
            <p className="text-[11px] text-amber-600 flex items-center justify-center gap-1.5 text-center">
              <WifiOff className="w-3.5 h-3.5" />
              {t.offlineNotice}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
