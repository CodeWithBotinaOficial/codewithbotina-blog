import { h, render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useBackendStatus } from "../../../src/hooks/useBackendStatus";

function StatusProbe() {
  const { status, isMaintenanceMode } = useBackendStatus();
  return h(
    "output",
    {
      "data-maintenance": String(isMaintenanceMode),
      "data-status": status,
    },
    status,
  );
}

describe("useBackendStatus", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    document.documentElement.dataset.backendStatus = "maintenance";
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    delete document.documentElement.dataset.backendStatus;
  });

  it("returns the active global maintenance status outside the context provider", () => {
    render(h(StatusProbe, null), container);

    const output = container.querySelector("output")!;
    expect(output.dataset.status).toBe("maintenance");
    expect(output.dataset.maintenance).toBe("true");
  });
});
