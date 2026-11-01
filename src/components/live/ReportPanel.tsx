import { useState } from "react";
import { Camera, Check, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { compressPhoto, isShared, submitReport, type Me } from "@/lib/live/backend";
import { DEPTH_LABEL, type Depth } from "@/lib/live/scoring";
import { cn } from "@/lib/utils";

const DEPTHS: { d: Depth; h: string }[] = [
  { d: "footpath", h: "h-1.5" },
  { d: "ankle", h: "h-3" },
  { d: "knee", h: "h-6" },
  { d: "waist", h: "h-9" },
];

export function ReportPanel({
  spot,
  spotLabel,
  me,
  onPickOnMap,
  onUseGps,
  onDone,
  onSignIn,
}: {
  spot: { lat: number; lng: number } | null;
  spotLabel: string;
  me: Me | null;
  onPickOnMap: () => void;
  onUseGps: () => void;
  onDone: () => void;
  onSignIn: () => void;
}) {
  const [depth, setDepth] = useState<Depth | null>(null);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isShared && !me)
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Report flooding</h2>
        <p className="text-sm text-muted-foreground">Sign in so others can trust your report. It takes 10 seconds.</p>
        <Button className="w-full" size="lg" onClick={onSignIn}>
          Sign in to report
        </Button>
      </div>
    );

  const send = async () => {
    if (!spot || !depth) return;
    setBusy(true);
    try {
      const r = await submitReport({ ...spot, depth, note, photo });
      toast.success(r.merged ? "Thanks — you confirmed a nearby report." : "Report sent. Thank you for keeping your street safe.");
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Report flooding</h2>

      <section>
        <p className="mb-2 text-sm font-medium">1. Where is it?</p>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 truncate">{spot ? spotLabel : "No spot chosen yet"}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onUseGps}>
            Use my location
          </Button>
          <Button variant="outline" onClick={onPickOnMap}>
            Tap on map
          </Button>
        </div>
      </section>

      <section>
        <p className="mb-2 text-sm font-medium">2. How deep is the water?</p>
        <div className="grid grid-cols-2 gap-2">
          {DEPTHS.map(({ d, h }) => (
            <button
              key={d}
              type="button"
              onClick={() => setDepth(d)}
              aria-pressed={depth === d}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border-2 p-3 text-left text-sm font-medium transition-colors",
                depth === d ? "border-primary bg-accent" : "border-border hover:border-primary/50",
              )}
            >
              <span className="relative block h-10 w-full overflow-hidden rounded-md bg-muted">
                <span className="absolute left-1/2 top-0 h-10 w-3 -translate-x-1/2 rounded-t-full bg-muted-foreground/40" />
                <span className={cn("absolute inset-x-0 bottom-0 bg-primary/60", h)} />
              </span>
              {DEPTH_LABEL[d]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 text-sm font-medium">3. Add a photo or note (optional)</p>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 text-sm hover:bg-muted/50">
          {preview ? (
            <img src={preview} alt="Your photo" className="h-14 w-14 rounded-md object-cover" />
          ) : (
            <Camera className="h-5 w-5 text-muted-foreground" />
          )}
          <span>{preview ? "Change photo" : "Take or choose a photo"}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const b = await compressPhoto(f);
                setPhoto(b);
                setPreview(URL.createObjectURL(b));
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          />
        </label>
        <Textarea
          className="mt-2"
          placeholder="e.g. Water near the bus stop, cars stuck"
          maxLength={280}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </section>

      <Button className="w-full" size="lg" disabled={!spot || !depth || busy} onClick={send}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Send report
      </Button>
      {!isShared && (
        <p className="text-xs text-muted-foreground">
          Community sharing isn't switched on yet, so your report is saved on this device only.
        </p>
      )}
    </div>
  );
}
