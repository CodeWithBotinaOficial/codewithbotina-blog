import { Star } from "lucide-preact";
import { t, type SupportedLanguage } from "../lib/i18n";

export default function PinnedBadge(
  { language }: { language: SupportedLanguage },
) {
  return (
    <div class="pinned-badge" role="status">
      <Star className="h-4 w-4 pinned-badge__icon" fill="currentColor" />
      <span>{t(language, "pinned", "common")}</span>
    </div>
  );
}

