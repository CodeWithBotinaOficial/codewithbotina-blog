import { createContext, type ComponentChildren } from "preact";
import { useCallback, useContext, useEffect, useRef, useState } from "preact/hooks";
import { backendStatusBus } from "../lib/api";

export type BackendStatus = "online" | "maintenance" | "unknown";

interface BackendStatusContextValue {
  status: BackendStatus;
  isMaintenanceMode: boolean;
  consecutiveFailures: number;
  lastChecked: Date | null;
  reportFailure: () => void;
  reportSuccess: () => void;
}

const defaultValue: BackendStatusContextValue = {
  status: "unknown",
  isMaintenanceMode: false,
  consecutiveFailures: 0,
  lastChecked: null,
  reportFailure: () => undefined,
  reportSuccess: () => undefined,
};

export const BackendStatusContext = createContext<BackendStatusContextValue>(defaultValue);

export function useBackendStatusContext() {
  return useContext(BackendStatusContext);
}

const HEALTH_CHECK_INTERVAL_MS = 30_000;
const FAILURES_TO_ACTIVATE = 2;
const BACKEND_URL = import.meta.env.PUBLIC_API_URL || "http://localhost:8000";
const ALERT_COOLDOWN_KEY = "maintenance_alert_sent";
const ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000;

export function BackendStatusProvider({ children }: { children: ComponentChildren }) {
  const [status, setStatus] = useState<BackendStatus>("unknown");
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const alertSentRef = useRef(false);
  const maintenanceActivationRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  const activateMaintenance = useCallback(async () => {
    if (status === "maintenance" || maintenanceActivationRef.current) return;

    maintenanceActivationRef.current = true;
    setStatus("maintenance");
    setLastChecked(new Date());

    if (typeof window === "undefined") return;

    try {
      const lastAlertStr = window.localStorage.getItem(ALERT_COOLDOWN_KEY);
      const lastAlert = lastAlertStr ? Number.parseInt(lastAlertStr, 10) : 0;
      const now = Date.now();

      if (!alertSentRef.current && now - lastAlert > ALERT_COOLDOWN_MS) {
        alertSentRef.current = true;
        window.localStorage.setItem(ALERT_COOLDOWN_KEY, String(now));

        await fetch("/api/maintenance-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            detectedAt: new Date().toISOString(),
            userAgent: navigator.userAgent,
          }),
        });
      }
    } catch (_error) {
      // Email failure must not disrupt maintenance mode.
    }
  }, [status]);

  const reportFailure = useCallback(() => {
    setConsecutiveFailures((prev) => {
      const next = prev + 1;
      if (next >= FAILURES_TO_ACTIVATE) {
        void activateMaintenance();
      }
      return next;
    });
  }, [activateMaintenance]);

  const reportSuccess = useCallback(() => {
    setConsecutiveFailures(0);
    setStatus("online");
    setLastChecked(new Date());
    alertSentRef.current = false;
    maintenanceActivationRef.current = false;
    if (intervalRef.current !== null && typeof window !== "undefined") {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = backendStatusBus.subscribe((event) => {
      if (event === "failure") {
        reportFailure();
      }
      if (event === "success") {
        reportSuccess();
      }
    });

    if (typeof window === "undefined") return unsubscribe;

    const handleBackendStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: "success" | "failure" }>).detail;
      if (detail?.type === "failure") {
        reportFailure();
      }
      if (detail?.type === "success") {
        reportSuccess();
      }
    };

    window.addEventListener("cwb:backend-status", handleBackendStatus);
    return () => {
      unsubscribe();
      window.removeEventListener("cwb:backend-status", handleBackendStatus);
    };
  }, [reportFailure, reportSuccess]);

  useEffect(() => {
    if (status !== "maintenance" || typeof window === "undefined") return;

    const checkHealth = async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(`${BACKEND_URL}/api/health`, {
          signal: controller.signal,
        });

        if (response.ok) {
          reportSuccess();
          return;
        }
      } catch (_error) {
        // Keep banner active while the backend remains unavailable.
      } finally {
        window.clearTimeout(timeoutId);
        setLastChecked(new Date());
      }
    };

    intervalRef.current = window.setInterval(checkHealth, HEALTH_CHECK_INTERVAL_MS);
    void checkHealth();

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [reportSuccess, status]);

  return (
    <BackendStatusContext.Provider
      value={{
        status,
        isMaintenanceMode: status === "maintenance",
        consecutiveFailures,
        lastChecked,
        reportFailure,
        reportSuccess,
      }}
    >
      {children}
    </BackendStatusContext.Provider>
  );
}
