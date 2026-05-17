import { Star } from "lucide-preact";
import { t, type SupportedLanguage } from "../lib/i18n";

export default function FeaturedPostBanner(
  { language }: { language: SupportedLanguage },
) {
  return (
    <div class="featured-post-banner" role="status">
      <Star className="h-5 w-5 featured-post-banner__icon" fill="currentColor" />
      <span>{t(language, "featuredPost", "post")}</span>
    </div>
  );
}

