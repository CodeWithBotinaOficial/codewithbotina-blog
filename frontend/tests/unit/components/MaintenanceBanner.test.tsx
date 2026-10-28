import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import MaintenanceBanner from "../../../src/components/MaintenanceBanner";
import { BackendStatusContext } from "../../../src/context/BackendStatusContext";

describe("MaintenanceBanner", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("renders a notice when maintenance is active", () => {
    render(
      <BackendStatusContext.Provider value={{
        status: "maintenance",
        isMaintenanceMode: true,
        consecutiveFailures: 2,
        lastChecked: new Date(),
        reportFailure: () => undefined,
        reportSuccess: () => undefined,
      }}>
        <MaintenanceBanner />
      </BackendStatusContext.Provider>,
      container,
    );
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });
});
