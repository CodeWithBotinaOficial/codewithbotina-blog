import { useContext, useEffect, useState } from "preact/hooks";
import {
  BackendStatusContext,
  type BackendStatus,
} from "../context/BackendStatusContext";

export function useBackendStatus() {
  const context = useContext(BackendStatusContext);
  const [status, setStatus] = useState<BackendStatus>(() => {
    if (typeof document === "undefined") return "online";
    return document.documentElement.dataset.backendStatus === "maintenance"
      ? "maintenance"
      : "online";
  });

  useEffect(() => {
    const handleStatusChange = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: BackendStatus }>).detail;
      if (detail?.status === "online" || detail?.status === "maintenance") {
        setStatus(detail.status);
      }
    };

    window.addEventListener("cwb:backend-status-change", handleStatusChange);
    return () =>
      window.removeEventListener("cwb:backend-status-change", handleStatusChange);
  }, []);

  const effectiveStatus = context.status === "unknown" ? status : context.status;
  return {
    ...context,
    status: effectiveStatus,
    isMaintenanceMode: effectiveStatus === "maintenance",
  };
}
