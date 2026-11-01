import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PhoneCall, ShieldAlert, CheckSquare, AlertTriangle, LifeBuoy } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

interface EmergencyHelpModalProps {
  open: boolean;
  onClose: () => void;
}

const CHECKLIST_ITEMS = [
  "Switch off main electrical breakers and gas cylinders before evacuating.",
  "Move important documents, electronics, and medicine to an upper floor.",
  "Never attempt to drive or walk through moving floodwater (just 15 cm can sweep you off feet).",
  "Keep mobile phones charged with a power bank; keep torches and dry emergency kits ready.",
  "Drink only boiled, filtered, or bottled water to prevent waterborne contamination.",
];

export default function EmergencyHelpModal({ open, onClose }: EmergencyHelpModalProps) {
  const t = useI18n();
  const [canInstall, setCanInstall] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-red-600">
            <LifeBuoy className="w-5 h-5 text-red-600" />
            Emergency & Relief Center
          </DialogTitle>
          <DialogDescription className="text-xs">
            Direct helplines, evacuation guidelines, and disaster response.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* QUICK DIAL 112 */}
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
            <p className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wider">
              Immediate Life-Threatening Emergencies
            </p>
            <a
              href="tel:112"
              className="inline-flex items-center justify-center gap-2 w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-base rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              <PhoneCall className="w-5 h-5 animate-bounce" />
              {t.callEmergency}
            </a>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-1">
              <a href="tel:1078" className="hover:underline flex items-center gap-1 font-medium text-foreground">
                <PhoneCall className="w-3.5 h-3.5 text-primary" />
                NDMA Helpline: 1078
              </a>
              <span>•</span>
              <a href="tel:1916" className="hover:underline flex items-center gap-1 font-medium text-foreground">
                <PhoneCall className="w-3.5 h-3.5 text-primary" />
                Disaster Control: 1916
              </a>
            </div>
          </div>

          {/* CHECKLIST */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-primary" />
              {t.floodChecklist}
            </p>
            <div className="space-y-2">
              {CHECKLIST_ITEMS.map((item, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-muted/60 border text-xs text-muted-foreground flex items-start gap-2"
                >
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
            <p className="text-xs font-bold text-foreground">Install StreetFlood.Live for emergency access</p>
            <p className="text-[11px] text-muted-foreground">
              Android: use your browser menu and choose “Install app” or “Add to Home screen”.
              iPhone: tap Share, then “Add to Home Screen”.
            </p>
            {canInstall && installEvent && (
              <Button
                type="button"
                size="sm"
                className="w-full h-9 text-xs"
                onClick={async () => {
                  await installEvent.prompt();
                  setCanInstall(false);
                  setInstallEvent(null);
                }}
              >
                Install App
              </Button>
            )}
          </div>

          <Button variant="outline" onClick={onClose} className="w-full text-xs h-9">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
