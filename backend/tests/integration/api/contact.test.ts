import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { handler } from "../../../routes/api/contact.ts";
import {
  invalidContactData,
  validContactData,
} from "../../fixtures/testData.ts";
import { ContactService } from "../../../services/contact.service.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";
import { FreshContext } from "$fresh/server.ts";

const mockContext = {
  remoteAddr: { transport: "tcp", hostname: "127.0.0.1", port: 8000 },
} as FreshContext;

Deno.test("Integration: POST /api/contact with valid data returns 201", async () => {
  const _processStub = stub(
    ContactService.prototype,
    "processContactSubmission",
    () =>
      Promise.resolve({
        success: true,
        data: { id: "1", ...validContactData, created_at: "" },
      }),
  );

  const req = new Request("http://localhost/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:8000",
    },
    body: JSON.stringify(validContactData),
  });

  const res = await handler.POST!(req, mockContext);
  const body = await res.json();

  assertEquals(res.status, 201);
  assertEquals(body.success, true);
  assertEquals(body.data.id, "1");

  restore();
});

Deno.test("Integration: POST /api/contact with invalid data returns 400", async () => {
  const req = new Request("http://localhost/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:8000",
    },
    body: JSON.stringify(invalidContactData.shortMessage),
  });

  const res = await handler.POST!(req, mockContext);
  const body = await res.json();

  assertEquals(res.status, 400);
  assertEquals(body.success, false);
  assertEquals(body.error, "Validation failed");
});

Deno.test("Integration: OPTIONS /api/contact returns 204", async () => {
  const req = new Request("http://localhost/api/contact", {
    method: "OPTIONS",
    headers: { "Origin": "http://localhost:8000" },
  });

  const res = await handler.OPTIONS!(req, mockContext);
  assertEquals(res.status, 204);
});
