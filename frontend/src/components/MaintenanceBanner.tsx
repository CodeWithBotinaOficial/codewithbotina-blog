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
      class="relative z-[60] w-full border-b border-amber-400 bg-amber-100 text-amber-900"
      role="status"
      aria-live="polite"
    >
      <div class="container-responsive flex min-w-0 flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div class="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div class="min-w-0">
            <p class="break-words text-sm font-semibold">
              {t(currentLanguage, "maintenance.banner", "common")}
            </p>
          </div>
        </div>

        {checkedAt ? (
          <p class="shrink-0 text-[11px] font-medium text-amber-800">
            {t(currentLanguage, "maintenance.lastChecked", "common")} {checkedAt}
          </p>
        ) : null}
      </div>
    </div>
  );
}
