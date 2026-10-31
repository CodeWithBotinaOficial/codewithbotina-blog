import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CommentForm from "../../../src/components/comments/CommentForm";
import { BackendStatusContext } from "../../../src/context/BackendStatusContext";
import { t } from "../../../src/lib/i18n";

const sessionState = vi.hoisted(() => ({
  user: null as null | { avatar_url: string | null },
  loading: false,
}));

vi.mock("../../../src/hooks/useSession", () => ({
  useSession: () => sessionState,
}));

describe("CommentForm maintenance gate", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    sessionState.user = null;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const renderWithStatus = (
    status: "online" | "maintenance",
    language: "en" | "es" | "pt-br",
  ) => {
    render(
      <BackendStatusContext.Provider
        value={{
          status,
          isMaintenanceMode: status === "maintenance",
          consecutiveFailures: status === "maintenance" ? 2 : 0,
          lastChecked: new Date(),
          reportFailure: () => undefined,
          reportSuccess: () => undefined,
        }}
      >
        <CommentForm postId="post-1" currentLanguage={language} />
      </BackendStatusContext.Provider>,
      container,
    );
  };

  it("shows a localized sign-in prompt without comment fields when unauthenticated", () => {
    renderWithStatus("online", "es");

    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector('button[type="submit"]')).toBeNull();
    expect(container.textContent).toContain(
      t("es", "maintenance.authRequiredToComment"),
    );
    expect(container.querySelector("a")?.textContent).toBe(
      t("es", "maintenance.signInToContinue"),
    );
  });

  it("shows sign-in guidance and maintenance status without rendering fields", () => {
    renderWithStatus("maintenance", "pt-br");

    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.textContent).toContain(
      t("pt-br", "maintenance.authRequiredToComment"),
    );
    expect(container.textContent).toContain(
      t("pt-br", "maintenance.featureUnavailable"),
    );
    const signInButton = container.querySelector("button.comment-signin-link") as HTMLButtonElement;
    expect(signInButton).not.toBeNull();
    expect(signInButton.disabled).toBe(true);
    expect(signInButton.title).toBe(
      t("pt-br", "maintenance.authUnavailable"),
    );
    expect(container.querySelector("a")).toBeNull();
  });

  it("shows only the maintenance notice for authenticated users", () => {
    sessionState.user = { avatar_url: null };
    renderWithStatus("maintenance", "en");

    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.textContent).toBe(
      t("en", "maintenance.featureUnavailable"),
    );
  });
});
