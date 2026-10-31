import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BackendStatusProvider,
  useBackendStatusContext,
} from "../../../src/context/BackendStatusContext";
import { backendStatusBus } from "../../../src/lib/api";

function StatusProbe() {
  const { status, consecutiveFailures } = useBackendStatusContext();
  return (
    <output data-failures={consecutiveFailures} data-status={status}>
      {status}
    </output>
  );
}

describe("BackendStatusProvider", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)));
    window.localStorage.clear();
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const mount = async () => {
    render(
      <BackendStatusProvider>
        <StatusProbe />
      </BackendStatusProvider>,
      container,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };
  const statusElement = () => container.querySelector("output")!;

  it("starts online", async () => {
    await mount();
    expect(statusElement().dataset.status).toBe("online");
    expect(statusElement().dataset.failures).toBe("0");
  });

  it("keeps one failure online and activates maintenance after two consecutive failures", async () => {
    await mount();
    window.localStorage.setItem("maintenance_alert_sent", String(Date.now()));
    act(() => backendStatusBus.emit("failure"));
    expect(statusElement().dataset.status).toBe("online");
    expect(statusElement().dataset.failures).toBe("1");

    act(() => backendStatusBus.emit("failure"));
    expect(statusElement().dataset.status).toBe("maintenance");
    expect(statusElement().dataset.failures).toBe("2");

    act(() => backendStatusBus.emit("success"));
    expect(statusElement().dataset.status).toBe("online");
    expect(statusElement().dataset.failures).toBe("0");

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps the service online after one failed startup health check", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await mount();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(statusElement().dataset.status).toBe("online");
    expect(statusElement().dataset.failures).toBe("1");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("activates maintenance after a startup failure and a subsequent API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) =>
        String(input).endsWith("/api/health")
          ? Promise.reject(new TypeError("Failed to fetch"))
          : Promise.resolve(new Response(null, { status: 200 })),
      ),
    );
    await mount();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    window.localStorage.setItem("maintenance_alert_sent", String(Date.now()));
    await act(async () => {
      backendStatusBus.emit("failure");
      await Promise.resolve();
    });

    expect(statusElement().dataset.status).toBe("maintenance");
    expect(statusElement().dataset.failures).toBe("2");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("recovers when the health endpoint becomes healthy", async () => {
    window.localStorage.setItem("maintenance_alert_sent", String(Date.now()));
    let healthChecks = 0;
    let completeHealthCheck: ((_response: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        if (String(input).endsWith("/api/health")) {
          healthChecks += 1;
          if (healthChecks === 2) {
            return new Promise<Response>((resolve) => {
              completeHealthCheck = resolve;
            });
          }
          return Promise.reject(new TypeError("Failed to fetch"));
        }
        return Promise.resolve(new Response(null, { status: 200 }));
      }),
    );
    await mount();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      backendStatusBus.emit("failure");
      await Promise.resolve();
    });
    expect(statusElement().dataset.status).toBe("maintenance");
    expect(healthChecks).toBe(2);

    await act(async () => {
      completeHealthCheck?.(new Response(null, { status: 200 }));
      await Promise.resolve();
    });

    expect(statusElement().dataset.status).toBe("online");
    expect(statusElement().dataset.failures).toBe("0");
    expect(healthChecks).toBe(2);
  });
});
