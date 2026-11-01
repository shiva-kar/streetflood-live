import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GuidanceLanguage } from "@/lib/a11y/voiceGuidance";

export function LanguageSelector({ value, onChange }: { value: GuidanceLanguage; onChange: (value: GuidanceLanguage) => void }) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as GuidanceLanguage)}>
      <SelectTrigger aria-label="Guidance language" className="min-h-11 w-full sm:w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en-IN">English</SelectItem>
        <SelectItem value="hi-IN">हिन्दी</SelectItem>
        <SelectItem value="mr-IN">मराठी</SelectItem>
      </SelectContent>
    </Select>
  );
}
