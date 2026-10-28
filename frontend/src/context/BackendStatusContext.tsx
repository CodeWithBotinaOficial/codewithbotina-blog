import { createContext, type ComponentChildren } from "preact";
import { useCallback, useContext, useEffect, useRef, useState } from "preact/hooks";
import { backendStatusBus } from "../lib/api";
import { getApiUrl } from "../lib/env";

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
const BACKEND_URL = getApiUrl().replace(/\/+$/, "");
const ALERT_COOLDOWN_KEY = "maintenance_alert_sent";
const ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000;

export function BackendStatusProvider({ children }: { children: ComponentChildren }) {
  const [status, setStatus] = useState<BackendStatus>("online");
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const alertSentRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  const activateMaintenance = useCallback(async () => {
    if (typeof window === "undefined") return;

    setStatus("maintenance");
    setLastChecked(new Date());

    if (alertSentRef.current) return;
    alertSentRef.current = true;

    let lastAlert = 0;
    try {
      lastAlert = Number(window.localStorage.getItem(ALERT_COOLDOWN_KEY)) || 0;
    } catch {
      return;
    }

    const now = Date.now();
    if (now - lastAlert < ALERT_COOLDOWN_MS) return;

    try {
      window.localStorage.setItem(ALERT_COOLDOWN_KEY, String(now));
      await fetch("/api/maintenance-alert", { method: "POST" });
    } catch {
      // Alert delivery must not disrupt maintenance mode.
    }
  }, []);

  const reportFailure = useCallback(() => {
    setConsecutiveFailures((previous) => previous + 1);
  }, []);

  const reportSuccess = useCallback(() => {
    setConsecutiveFailures(0);
    setStatus("online");
    setLastChecked(new Date());
    alertSentRef.current = false;
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

    return unsubscribe;
  }, [reportFailure, reportSuccess]);

  useEffect(() => {
    if (consecutiveFailures >= FAILURES_TO_ACTIVATE && status !== "maintenance") {
      void activateMaintenance();
    }
  }, [activateMaintenance, consecutiveFailures, status]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.backendStatus = status;
    window.dispatchEvent(
      new CustomEvent("cwb:backend-status-change", { detail: { status } }),
    );
  }, [status]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reportStartupResult = (event: "success" | "failure") => {
      backendStatusBus.emit(event);
      if (event === "failure") backendStatusBus.emit(event);
    };
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);

    void fetch(`${BACKEND_URL}/api/health`, { signal: controller.signal })
      .then((response) => {
        reportStartupResult(response.ok ? "success" : "failure");
      })
      .catch(() => {
        reportStartupResult("failure");
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        setLastChecked(new Date());
      });

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

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
