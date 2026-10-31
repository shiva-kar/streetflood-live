import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Mail, Database, CheckCircle2, AlertCircle, LogOut } from "lucide-react";
import {
  getStoredSupabaseConfig,
  isSupabaseConfigured,
  saveStoredSupabaseConfig,
  signInWithGoogle,
  signInWithMagicLink,
  signOut,
  type UserProfile,
} from "@/lib/supabase/client";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserChange: () => void;
  demoMode: boolean;
  onToggleDemoMode: (enabled: boolean) => void;
}

export default function AuthModal({
  open,
  onClose,
  currentUser,
  onUserChange,
  demoMode,
  onToggleDemoMode,
}: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Supabase Custom Configuration Tab
  const initialConfig = getStoredSupabaseConfig();
  const [customUrl, setCustomUrl] = useState(initialConfig.url);
  const [customKey, setCustomKey] = useState(initialConfig.key);
  const [isTestingConfig, setIsTestingConfig] = useState(false);

  const isConfigured = isSupabaseConfigured();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!isConfigured) {
      toast.info("Supabase is running in local-first demo mode. Connecting local profile.");
      onUserChange();
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithMagicLink(email);
      setMagicLinkSent(true);
      toast.success("Magic sign-in link sent! Check your inbox.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send magic link.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isConfigured) {
      toast.info("Supabase credentials not configured. Running in local-first demo mode.");
      return;
    }
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-in error.";
      toast.error(msg);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onUserChange();
    toast.success("Signed out successfully.");
    onClose();
  };

  const handleSaveSupabaseConfig = async () => {
    setIsTestingConfig(true);
    try {
      if (!customUrl.startsWith("https://")) {
        throw new Error("Supabase URL must start with https://");
      }
      if (customKey.length < 20) {
        throw new Error("Supabase Anon Key seems too short.");
      }

      // Test ping to check if valid Supabase instance
      const res = await fetch(`${customUrl}/rest/v1/`, {
        headers: { apikey: customKey },
      });
      if (!res.ok && res.status !== 401 && res.status !== 404) {
        throw new Error(`Connection test failed with HTTP ${res.status}`);
      }

      saveStoredSupabaseConfig(customUrl, customKey);
      toast.success("Supabase connected successfully! Database is live.");
      onUserChange();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not connect to Supabase.";
      toast.error(msg);
    } finally {
      setIsTestingConfig(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Account & Cloud Settings
          </DialogTitle>
          <DialogDescription>
            Free-tier architecture. Browsing is open to all; sign-in enables verified reports and consensus voting.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={currentUser ? "account" : "signin"} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signin" className="text-xs">Sign In</TabsTrigger>
            <TabsTrigger value="supabase" className="text-xs">Free Cloud ($0)</TabsTrigger>
            <TabsTrigger value="guards" className="text-xs">Zero-Cost Guards</TabsTrigger>
          </TabsList>

          {/* SIGN IN TAB */}
          <TabsContent value="signin" className="space-y-4 pt-3">
            {currentUser ? (
              <div className="space-y-4 p-4 rounded-xl bg-muted/50 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{currentUser.fullName || "Citizen"}</p>
                    <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-primary/10 text-primary capitalize">
                    {currentUser.role}
                  </span>
                </div>

                <div className="pt-2 border-t flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Demo Presentation Mode</span>
                    <input
                      type="checkbox"
                      checked={demoMode}
                      onChange={(e) => onToggleDemoMode(e.target.checked)}
                      className="rounded accent-primary w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSignOut} className="w-full gap-2 mt-2">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {magicLinkSent ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="font-medium text-emerald-800 dark:text-emerald-300">Magic Link Sent</p>
                    <p className="text-xs text-muted-foreground">
                      Check your email ({email}) and tap the link to sign in.
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => setMagicLinkSent(false)} className="text-xs">
                      Use a different email
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleMagicLink} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-xs">Email Address (Free Magic Link)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-10"
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full h-10 gap-2">
                      <Mail className="w-4 h-4" />
                      {isSubmitting ? "Sending..." : "Send Free Magic Link"}
                    </Button>
                  </form>
                )}

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  className="w-full h-10 gap-2 font-medium"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>Demo Presentation Mode</span>
                  <input
                    type="checkbox"
                    checked={demoMode}
                    onChange={(e) => onToggleDemoMode(e.target.checked)}
                    className="rounded accent-primary w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* SUPABASE CLOUD TAB */}
          <TabsContent value="supabase" className="space-y-4 pt-3">
            <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-900 dark:text-sky-200">
              <p className="font-semibold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                100% Free Supabase Backend
              </p>
              <p className="mt-1">
                You can connect your own free Supabase project (500 MB database, 1 GB storage, free auth). The app operates directly from the browser.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="sb-url" className="text-xs">Project URL</Label>
                <Input
                  id="sb-url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="font-mono text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sb-key" className="text-xs">Anon Public Key</Label>
                <Input
                  id="sb-key"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="font-mono text-xs h-9"
                />
              </div>

              <Button
                type="button"
                onClick={handleSaveSupabaseConfig}
                disabled={isTestingConfig}
                className="w-full h-9 gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isTestingConfig ? "Testing connection..." : "Connect Supabase Database"}
              </Button>

              <div className="p-2.5 rounded bg-muted text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">3 Steps to Connect Free Supabase:</p>
                <p>1. Go to supabase.com and create a free project.</p>
                <p>2. In SQL Editor, run `supabase/migrations/20261101_init_streetflood.sql`.</p>
                <p>3. Copy Project URL and `anon` key from Project Settings → API.</p>
              </div>
            </div>
          </TabsContent>

          {/* ZERO-COST ARCHITECTURAL GUARDS TAB */}
          <TabsContent value="guards" className="space-y-3 pt-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-sm text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Guaranteed $0.00 / month Operating Cost
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Structural code guards prevent any accidental spending, paid API calls, or database quota breaches.
              </p>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-lg border bg-card flex items-start gap-2.5">
                <span className="text-base shrink-0">🛡️</span>
                <div>
                  <p className="font-semibold text-foreground text-[11px]">Domain Whitelist Firewall</p>
                  <p className="text-[10px] text-muted-foreground">
                    All outbound requests are restricted strictly to free open datasets (OpenStreetMap, Open-Meteo, OSRM). Any call to paid map services or payment gateways is blocked at the code level.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border bg-card flex items-start gap-2.5">
                <span className="text-base shrink-0">💾</span>
                <div>
                  <p className="font-semibold text-foreground text-[11px]">Storage Quota Compression Guard</p>
                  <p className="text-[10px] text-muted-foreground">
                    Citizen upload photos are compressed in-browser to ≤350 KB before transmission, ensuring media never overflows the free 1 GB storage bucket.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border bg-card flex items-start gap-2.5">
                <span className="text-base shrink-0">⚡</span>
                <div>
                  <p className="font-semibold text-foreground text-[11px]">Fair-Use Rate Limiter</p>
                  <p className="text-[10px] text-muted-foreground">
                    Rate limits submissions to max 5 reports per hour per citizen. Prevents spam and protects the 500 MB free database quota.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border bg-card flex items-start gap-2.5">
                <span className="text-base shrink-0">🔄</span>
                <div>
                  <p className="font-semibold text-foreground text-[11px]">Automated 6-Hour Report Purge</p>
                  <p className="text-[10px] text-muted-foreground">
                    Reports auto-expire after 6 hours and are pruned from active calculation so storage never bloats over time.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
