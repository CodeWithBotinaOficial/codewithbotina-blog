import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { validateScheduledAt } from "../../../lib/validation.ts";

Deno.test("validateScheduledAt accepts a future date within 30 days", () => {
  const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString();

  assertEquals(validateScheduledAt(future), { valid: true });
});

Deno.test("validateScheduledAt rejects a past date", () => {
  const past = new Date(Date.now() - 1000 * 60).toISOString();

  assertEquals(validateScheduledAt(past), {
    valid: false,
    error: "Scheduled date must be in the future",
  });
});

Deno.test("validateScheduledAt rejects invalid date strings", () => {
  assertEquals(validateScheduledAt("not-a-date"), {
    valid: false,
    error: "Invalid date format",
  });
});

Deno.test("validateScheduledAt rejects dates more than 30 days out", () => {
  const tooFar = new Date(Date.now() + 1000 * 60 * 60 * 24 * 31).toISOString();

  assertEquals(validateScheduledAt(tooFar), {
    valid: false,
    error: "Scheduled date cannot be more than 30 days from now",
  });
});
