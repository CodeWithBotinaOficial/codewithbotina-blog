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
        <MaintenanceBanner currentLanguage="es" />
      </BackendStatusContext.Provider>,
      container,
    );
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Nuestros servicios no están disponibles temporalmente.",
    );
  });

  it("updates the banner text when the page language changes", () => {
    const context = {
      status: "maintenance" as const,
      isMaintenanceMode: true,
      consecutiveFailures: 2,
      lastChecked: null,
      reportFailure: () => undefined,
      reportSuccess: () => undefined,
    };

    render(
      <BackendStatusContext.Provider value={context}>
        <MaintenanceBanner currentLanguage="en" />
      </BackendStatusContext.Provider>,
      container,
    );
    expect(container.textContent).toContain(
      "Our services are temporarily unavailable.",
    );

    render(
      <BackendStatusContext.Provider value={context}>
        <MaintenanceBanner currentLanguage="pt-br" />
      </BackendStatusContext.Provider>,
      container,
    );
    expect(container.textContent).toContain(
      "Nossos serviços estão temporariamente indisponíveis.",
    );
  });
});
