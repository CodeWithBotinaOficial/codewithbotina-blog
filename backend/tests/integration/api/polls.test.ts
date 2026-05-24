import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler as createHandler } from "../../../routes/api/polls/create.ts";
import { handler as voteHandler } from "../../../routes/api/polls/[slug]/vote.ts";
import { handler as removeHandler } from "../../../routes/api/polls/[slug]/remove-vote.ts";
import { handler as resultsHandler } from "../../../routes/api/polls/[slug]/results.ts";
import { handler as analyticsHandler } from "../../../routes/api/polls/[slug]/analytics.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { pollService } from "../../../services/poll.service.ts";
import { pollRepository } from "../../../repositories/poll.repository.ts";
import { stub, restore } from "https://deno.land/std@0.216.0/testing/mock.ts";

Deno.test("Poll API - Create Poll (admin)", async () => {
  const adminUser = { id: "admin-id", is_admin: true } as any;
  stub(AuthService.prototype, "getUserFromToken", () => Promise.resolve(adminUser));
  stub(pollService, "createPoll", () => Promise.resolve({ id: "poll-1", slug: "test-poll" }));

  const req = new Request("http://localhost/api/polls/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer token" },
    body: JSON.stringify({ slug: "test-poll", title: "Test Poll", type: "single_choice", language: "en", options: [{ text: "A" }, { text: "B" }] }),
  });

  const res = await createHandler.POST!(req, {} as any);
  const body = await res.json();
  assertEquals(res.status, 201);
  assertEquals(body.success, true);

  restore();
});

Deno.test("Poll API - Vote on Poll", async () => {
  const user = { id: "user-1", is_admin: false } as any;
  stub(AuthService.prototype, "getUserFromToken", () => Promise.resolve(user));
  stub(pollRepository, "getPollBySlug", () => Promise.resolve({ id: "poll-1", type: "single_choice" }));
  stub(pollService, "votePoll", () => Promise.resolve({ id: "vote-1", poll_id: "poll-1" }));

  const req = new Request("http://localhost/api/polls/test-poll/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer token" },
    body: JSON.stringify({ optionId: "opt-1" }),
  });

  const res = await voteHandler.POST!(req, { params: { slug: "test-poll" } } as any);
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.success, true);

  restore();
});

Deno.test("Poll API - Remove Vote", async () => {
  const user = { id: "user-1", is_admin: false } as any;
  stub(AuthService.prototype, "getUserFromToken", () => Promise.resolve(user));
  stub(pollRepository, "getPollBySlug", () => Promise.resolve({ id: "poll-1", type: "single_choice" }));
  stub(pollService, "removeVote", () => Promise.resolve(true));

  const req = new Request("http://localhost/api/polls/test-poll/vote", {
    method: "DELETE",
    headers: { "Authorization": "Bearer token" },
  });

  const res = await removeHandler.DELETE!(req, { params: { slug: "test-poll" } } as any);
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.success, true);

  restore();
});

Deno.test("Poll API - Get Results", async () => {
  stub(pollRepository, "getPollBySlug", () => Promise.resolve({ id: "poll-1", type: "single_choice" }));
  stub(pollRepository, "getPollWithResults", () => Promise.resolve({ id: "poll-1", options: [] }));

  const req = new Request("http://localhost/api/polls/test-poll/results");
  const res = await resultsHandler.GET!(req, { params: { slug: "test-poll" } } as any);
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.success, true);

  restore();
});

Deno.test("Poll API - Analytics (admin)", async () => {
  const adminUser = { id: "admin-id", is_admin: true } as any;
  stub(AuthService.prototype, "getUserFromToken", () => Promise.resolve(adminUser));
  stub(pollRepository, "getPollBySlug", () => Promise.resolve({ id: "poll-1", type: "single_choice" }));
  stub(pollRepository, "getVoteAnalytics", () => Promise.resolve([{ id: "vote-1", user: { id: "user-1" } }]));

  const req = new Request("http://localhost/api/polls/test-poll/analytics", {
    method: "GET",
    headers: { "Authorization": "Bearer token" },
  });

  const res = await analyticsHandler.GET!(req, { params: { slug: "test-poll" } } as any);
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.success, true);

  restore();
});

