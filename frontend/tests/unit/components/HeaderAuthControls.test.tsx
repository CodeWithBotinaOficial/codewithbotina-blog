import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HeaderAuthControls from "../../../src/components/auth/HeaderAuthControls";
import { BackendStatusContext } from "../../../src/context/BackendStatusContext";

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("../../../src/hooks/useSession", () => ({
  useSession: mocks.useSession,
}));

vi.mock("../../../src/hooks/useAuth", () => ({
  useAuth: () => ({ signIn: mocks.signIn, signOut: mocks.signOut }),
}));

describe("HeaderAuthControls", () => {
  let container: HTMLDivElement;

  const labels = {
    signIn: "Sign in",
    signOut: "Sign out",
    loading: "Loading...",
    openProfile: "Open profile",
    userAlt: "User",
    authUnavailable: "Sign-in is temporarily unavailable.",
  };

  beforeEach(() => {
    mocks.useSession.mockReturnValue({ user: null, loading: false });
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.clearAllMocks();
  });

  const renderWithStatus = (status: "online" | "maintenance") => {
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
        <HeaderAuthControls labels={labels} profileHref="/en/profile" />
      </BackendStatusContext.Provider>,
      container,
    );
  };

  it("allows sign-in when the backend is online", () => {
    renderWithStatus("online");

    const signInButton = container.querySelector("button") as HTMLButtonElement;
    expect(signInButton.disabled).toBe(false);
    signInButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(mocks.signIn).toHaveBeenCalledOnce();
  });

  it("disables sign-in and shows maintenance guidance when unavailable", () => {
    renderWithStatus("maintenance");

    const signInButton = container.querySelector("button") as HTMLButtonElement;
    expect(signInButton.disabled).toBe(true);
    expect(signInButton.title).toBe(labels.authUnavailable);
    expect(signInButton.className).toContain("maintenance-disabled");
    signInButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(container.querySelector("a")).toBeNull();
  });

  it("shows maintenance feedback when sign-out is disabled", () => {
    mocks.useSession.mockReturnValue({
      user: {
        full_name: "Test User",
        email: "test@example.com",
        avatar_url: null,
        is_admin: false,
      },
      loading: false,
    });
    renderWithStatus("maintenance");

    const signOutButton = container.querySelector("button") as HTMLButtonElement;
    expect(signOutButton.disabled).toBe(true);
    expect(signOutButton.title).toBe(labels.authUnavailable);
    expect(signOutButton.className).toContain("maintenance-disabled");
  });
});
