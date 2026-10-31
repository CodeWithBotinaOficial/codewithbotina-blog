import { render, type ComponentChild } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GlobalSearchModal from "../../../src/components/search/GlobalSearchModal";
import SearchFilters from "../../../src/components/search/SearchFilters";
import HeaderAuthControls from "../../../src/components/auth/HeaderAuthControls";
import PollVoteSection from "../../../src/components/polls/PollVoteSection";
import ReactionButtons from "../../../src/components/reactions/ReactionButtons";
import TagsBrowser from "../../../src/components/tags/TagsBrowser";
import {
  BackendStatusContext,
  type BackendStatus,
} from "../../../src/context/BackendStatusContext";
import { DEFAULT_SEARCH_FILTERS } from "../../../src/types/search";
import { t } from "../../../src/lib/i18n";

vi.mock("../../../src/hooks/useSession", () => ({
  useSession: () => ({
    user: {
      id: "user-1",
      full_name: "Test User",
      email: "test@example.com",
      avatar_url: null,
      is_admin: false,
    },
    loading: false,
    isAuthenticated: true,
  }),
}));

vi.mock("../../../src/hooks/useAuth", () => ({
  useAuth: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

describe("interactive feature maintenance gates", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('{"data":{}}', { status: 200 })),
    );
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const renderWithStatus = (child: ComponentChild, status: BackendStatus) => {
    render(
      <BackendStatusContext.Provider
        value={{
          status,
          isMaintenanceMode: status === "maintenance",
          consecutiveFailures: status === "maintenance" ? 2 : 0,
          lastChecked: null,
          reportFailure: () => undefined,
          reportSuccess: () => undefined,
        }}
      >
        {child}
      </BackendStatusContext.Provider>,
      container,
    );
  };

  it("disables reactions in maintenance and enables them online", () => {
    const props = {
      postId: "post-1",
      initialLikes: 2,
      initialDislikes: 0,
      userReaction: null,
      isAuthenticated: true,
      currentLanguage: "en" as const,
    };

    renderWithStatus(<ReactionButtons {...props} />, "maintenance");
    expect(container.querySelector(".reaction-button")?.hasAttribute("disabled"))
      .toBe(true);
    expect(container.textContent).toContain(
      t("en", "maintenance.featureUnavailable"),
    );

    renderWithStatus(<ReactionButtons {...props} />, "online");
    expect(container.querySelector(".reaction-button")?.hasAttribute("disabled"))
      .toBe(false);
  });

  it("disables poll voting in maintenance and enables the poll controls online", () => {
    const props = {
      poll: {
        slug: "poll-1",
        type: "single_choice",
        poll_options: [{ id: "option-1", option_text: "Option one" }],
      },
      userVote: null,
      onVote: vi.fn(),
      language: "en",
    };

    renderWithStatus(<PollVoteSection {...props} />, "maintenance");
    expect(container.querySelector("fieldset")?.disabled).toBe(true);
    expect(container.textContent).toContain(
      t("en", "maintenance.featureUnavailable"),
    );

    renderWithStatus(<PollVoteSection {...props} />, "online");
    expect(container.querySelector("fieldset")?.disabled).toBe(false);
  });

  it("disables global search in maintenance and enables it online", () => {
    renderWithStatus(<GlobalSearchModal currentLanguage="en" />, "maintenance");
    expect(container.querySelector<HTMLButtonElement>(
      'button[aria-label="Search"]',
    )?.disabled).toBe(true);
    expect(container.textContent).toContain(
      t("en", "maintenance.featureUnavailable"),
    );

    renderWithStatus(<GlobalSearchModal currentLanguage="en" />, "online");
    expect(container.querySelector<HTMLButtonElement>(
      'button[aria-label="Search"]',
    )?.disabled).toBe(false);
  });

  it("disables advanced search filters in maintenance and enables them online", () => {
    const props = {
      onSearch: vi.fn(),
      initialFilters: DEFAULT_SEARCH_FILTERS("en"),
      compact: false,
      showTagFilter: false,
      autoApplySearch: false,
    };

    renderWithStatus(<SearchFilters {...props} />, "maintenance");
    expect(container.querySelector("fieldset")?.disabled).toBe(true);
    expect(container.textContent).toContain(
      t("en", "maintenance.featureUnavailable"),
    );

    renderWithStatus(<SearchFilters {...props} />, "online");
    expect(container.querySelector("fieldset")?.disabled).toBe(false);
  });

  it("disables tag browsing in maintenance and enables it online", () => {
    const props = {
      uiLanguage: "en" as const,
      basePath: "/en/tags",
      initialQuery: "",
      initialSort: "most_used" as const,
      initialLanguageFilter: "en",
      initialTags: [],
      initialTotal: 0,
      initialPage: 1,
      initialPerPage: 20 as const,
      labels: {
        previous: "Previous",
        next: "Next",
        page: "Page {{page}}",
        of: "of {{total}}",
        perPage: "Per page",
        show: "Show",
        goToPage: "Go to page {{page}}",
        currentPage: "Current page {{page}}",
      },
    };

    renderWithStatus(<TagsBrowser {...props} />, "maintenance");
    expect(container.querySelector<HTMLInputElement>('input[type="text"]')?.disabled)
      .toBe(true);
    expect(container.textContent).toContain(
      t("en", "maintenance.featureUnavailable"),
    );

    renderWithStatus(<TagsBrowser {...props} />, "online");
    expect(container.querySelector<HTMLInputElement>('input[type="text"]')?.disabled)
      .toBe(false);
  });

  it("disables sign-out in maintenance and enables it online", () => {
    const props = {
      labels: {
        signIn: "Sign in",
        signOut: "Sign out",
        loading: "Loading",
        openProfile: "Open profile",
        userAlt: "User",
        authUnavailable: "Sign-in is temporarily unavailable.",
      },
      profileHref: "/profile",
    };

    renderWithStatus(<HeaderAuthControls {...props} />, "maintenance");
    expect(container.querySelector<HTMLButtonElement>("button")?.disabled).toBe(
      true,
    );
    expect(container.textContent).not.toContain("temporarily unavailable");

    renderWithStatus(<HeaderAuthControls {...props} />, "online");
    expect(container.querySelector<HTMLButtonElement>("button")?.disabled).toBe(
      false,
    );
  });
});
