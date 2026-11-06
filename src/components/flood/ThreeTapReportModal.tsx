import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, Camera, X, Check, WifiOff, Sparkles, AlertTriangle, ShieldCheck } from "lucide-react";
import { submitLiveReport } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { FloodReport, WaterDepth } from "@/lib/flood/types";
import type { RealWeatherResult } from "@/lib/flood/openData";
import { analyzeCitizenReport, recordWorkflowStep } from "@/lib/ai/agenticWorkflow";
import { recordImpactEvent } from "@/lib/flood/impactTracker";
import { toast } from "sonner";

interface ThreeTapReportModalProps {
  open: boolean;
  onClose: () => void;
  userCoords: [number, number];
  locationAddressText?: string;
  existingReports?: FloodReport[];
  weather?: RealWeatherResult | null;
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
  existingReports = [],
  weather = null,
  onReportCreated,
}: ThreeTapReportModalProps) {
  const t = useI18n();
  const [depth, setDepth] = useState<WaterDepth>("Knees");
  const [description, setDescription] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-Time AI Pre-Analysis
  const aiAnalysis = useMemo(() => {
    return analyzeCitizenReport(
      {
        id: "draft_report",
        lat: userCoords[0],
        lng: userCoords[1],
        waterDepth: depth,
        description,
      },
      existingReports,
      weather
    );
  }, [userCoords, depth, description, existingReports, weather]);

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
        // Record Controlled Agentic Workflow Audit steps
        recordWorkflowStep({
          reportId: created.id,
          stage: "CitizenReported",
          actor: "Citizen",
          details: `Submitted ${depth} report at [${userCoords[0].toFixed(4)}, ${userCoords[1].toFixed(4)}].`,
        });

        recordWorkflowStep({
          reportId: created.id,
          stage: "AiAnalyzed",
          actor: "IBM Bob Agentic Core",
          details: `Classified as "${aiAnalysis.incidentCategory}". Confidence: ${aiAnalysis.anomalyAssessment.confidenceScore}%. Road: ${aiAnalysis.identifiedRoadOrLandmark}.`,
        });

        recordImpactEvent("report_submitted");

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

        <div className="space-y-3.5 pt-1">
          {/* TAP 1: LOCATION AUTO-ACQUIRED */}
          <div className="p-2.5 rounded-xl bg-muted/60 border flex items-center justify-between text-xs">
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
            <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full shrink-0">
              GPS Locked
            </span>
          </div>

          {/* TAP 2: SELECT WATER DEPTH */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              {t.waterDepth}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DEPTH_CARDS.map((card) => {
                const isSelected = depth === card.depth;
                return (
                  <button
                    key={card.depth}
                    type="button"
                    onClick={() => setDepth(card.depth)}
                    className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between min-h-[76px] cursor-pointer ${card.colorClass} ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/30 bg-primary/5 shadow-sm"
                        : "opacity-85 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{card.icon}</span>
                      {isSelected && (
                        <div className="w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
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

          {/* TAP 3: OPTIONAL PHOTO & DESCRIPTION */}
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
              <div className="relative rounded-lg overflow-hidden border max-h-32 bg-black flex items-center justify-center">
                <img src={photoDataUrl} alt="Flood preview" className="object-contain max-h-32 w-full" />
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-8 border-dashed text-xs gap-2"
              >
                <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Take Photo or Choose File (Metadata Stripped)</span>
              </Button>
            )}

            <Textarea
              placeholder={t.optionalNote || "Describe street landmarks, stalled vehicles, or blocked drains..."}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-14 text-xs resize-none"
              maxLength={200}
            />
          </div>

          {/* AI PRE-ANALYSIS PILL (IBM Bob & watsonx Core) */}
          <div className="p-2.5 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-sky-700 dark:text-sky-300">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>AI Pre-Analysis</span>
              </div>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-sky-500/40 text-sky-600">
                {aiAnalysis.anomalyAssessment.confidenceScore}% Confidence
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div>
                <span className="text-muted-foreground">Category: </span>
                <strong className="text-foreground">{aiAnalysis.incidentCategory}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Road: </span>
                <strong className="text-foreground truncate">{aiAnalysis.identifiedRoadOrLandmark}</strong>
              </div>
            </div>

            {aiAnalysis.duplicateRisk.isPotentialDuplicate && (
              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-700 dark:text-amber-300 flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                <span>{aiAnalysis.duplicateRisk.reason}</span>
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-10 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md gap-2 cursor-pointer"
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
