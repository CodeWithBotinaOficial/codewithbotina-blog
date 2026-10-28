import { AlertTriangle } from "lucide-preact";
import { useBackendStatusContext } from "../context/BackendStatusContext";
import { t, type SupportedLanguage } from "../lib/i18n";

interface Props {
  currentLanguage?: SupportedLanguage;
}

export default function MaintenanceBanner({ currentLanguage = "en" }: Props) {
  const { isMaintenanceMode, lastChecked } = useBackendStatusContext();

  if (!isMaintenanceMode) return null;

  const checkedAt = lastChecked?.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      class="w-full border-b border-amber-400 bg-amber-100 text-amber-900"
      role="status"
      aria-live="polite"
    >
      <div class="container-responsive flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
        <div class="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p class="text-sm font-semibold">
              {t(currentLanguage, "maintenance.bannerTitle", "common")}
            </p>
            <p class="text-xs text-amber-800">
              {t(currentLanguage, "maintenance.bannerMessage", "common")}
            </p>
          </div>
        </div>

        {checkedAt ? (
          <p class="text-[11px] font-medium text-amber-800">
            {t(currentLanguage, "maintenance.lastChecked", "common")} {checkedAt}
          </p>
        ) : null}
      </div>
    </div>
  );
}
