import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler as createHandler } from "../../../routes/api/polls/create.ts";
import { handler as voteHandler } from "../../../routes/api/polls/[slug]/vote.ts";
import { handler as removeHandler } from "../../../routes/api/polls/[slug]/remove-vote.ts";
import { handler as resultsHandler } from "../../../routes/api/polls/[slug]/results.ts";
import { handler as analyticsHandler } from "../../../routes/api/polls/[slug]/analytics.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { pollService } from "../../../services/poll.service.ts";
import { pollRepository } from "../../../repositories/poll.repository.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import type { FreshContext } from "$fresh/server.ts";
import type { AuthenticatedUser } from "../../../types/auth.types.ts";

function ctxWithSlug(
  slug: string,
): FreshContext<Record<string, unknown>, unknown, { slug: string }> {
  // We only need `params.slug` for these handler calls; the rest is unused in the handlers under test.
  return { params: { slug } } as unknown as FreshContext<
    Record<string, unknown>,
    unknown,
    { slug: string }
  >;
}

function emptyCtx(): FreshContext<
  Record<string, unknown>,
  unknown,
  Record<string, never>
> {
  return {} as unknown as FreshContext<
    Record<string, unknown>,
    unknown,
    Record<string, never>
  >;
}

Deno.test("Poll API - Create Poll (admin)", async () => {
  const adminUser: AuthenticatedUser = {
    id: "admin-id",
    is_admin: true,
  } as AuthenticatedUser;
  stub(
    AuthService.prototype,
    "getUserFromToken",
    () => Promise.resolve(adminUser),
  );
  stub(
    pollService,
    "createPoll",
    () => Promise.resolve({ id: "poll-1", slug: "test-poll" }),
  );

  const req = new Request("http://localhost/api/polls/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer token",
    },
    body: JSON.stringify({
      slug: "test-poll",
      title: "Test Poll",
      type: "single_choice",
      language: "en",
      options: [{ text: "A" }, { text: "B" }],
    }),
  });

  const res = await createHandler.POST!(req, emptyCtx());
  const body = await res.json();
  assertEquals(res.status, 201);
  assertEquals(body.success, true);

  restore();
});

Deno.test("Poll API - Vote on Poll", async () => {
  const user: AuthenticatedUser = {
    id: "user-1",
    is_admin: false,
  } as AuthenticatedUser;
  stub(AuthService.prototype, "getUserFromToken", () => Promise.resolve(user));
  stub(
    pollRepository,
    "getPollBySlug",
    () => Promise.resolve({ id: "poll-1", type: "single_choice" }),
  );
  stub(
    pollService,
    "votePoll",
    () => Promise.resolve({ id: "vote-1", poll_id: "poll-1" }),
  );

  const req = new Request("http://localhost/api/polls/test-poll/vote", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer token",
    },
    body: JSON.stringify({ optionId: "opt-1" }),
  });

  const res = await voteHandler.POST!(req, ctxWithSlug("test-poll"));
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.success, true);

  restore();
});

Deno.test("Poll API - Remove Vote", async () => {
  const user: AuthenticatedUser = {
    id: "user-1",
    is_admin: false,
  } as AuthenticatedUser;
  stub(AuthService.prototype, "getUserFromToken", () => Promise.resolve(user));
  stub(
    pollRepository,
    "getPollBySlug",
    () => Promise.resolve({ id: "poll-1", type: "single_choice" }),
  );
  stub(pollService, "removeVote", () => Promise.resolve(true));

  const req = new Request("http://localhost/api/polls/test-poll/vote", {
    method: "DELETE",
    headers: { "Authorization": "Bearer token" },
  });

  const res = await removeHandler.DELETE!(req, ctxWithSlug("test-poll"));
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.success, true);

  restore();
});

Deno.test("Poll API - Get Results", async () => {
  stub(
    pollRepository,
    "getPollBySlug",
    () => Promise.resolve({ id: "poll-1", type: "single_choice" }),
  );
  stub(
    pollRepository,
    "getPollWithResults",
    () => Promise.resolve({ id: "poll-1", options: [] }),
  );

  const req = new Request("http://localhost/api/polls/test-poll/results");
  const res = await resultsHandler.GET!(req, ctxWithSlug("test-poll"));
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.success, true);

  restore();
});

Deno.test("Poll API - Analytics (admin)", async () => {
  const adminUser: AuthenticatedUser = {
    id: "admin-id",
    is_admin: true,
  } as AuthenticatedUser;
  stub(
    AuthService.prototype,
    "getUserFromToken",
    () => Promise.resolve(adminUser),
  );
  stub(
    pollRepository,
    "getPollBySlug",
    () => Promise.resolve({ id: "poll-1", type: "single_choice" }),
  );
  stub(
    pollRepository,
    "getVoteAnalytics",
    () => Promise.resolve([{ id: "vote-1", user: { id: "user-1" } }]),
  );

  const req = new Request("http://localhost/api/polls/test-poll/analytics", {
    method: "GET",
    headers: { "Authorization": "Bearer token" },
  });

  const res = await analyticsHandler.GET!(req, ctxWithSlug("test-poll"));
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.success, true);

  restore();
});
