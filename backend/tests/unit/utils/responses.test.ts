import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";

Deno.test("successResponse creates valid Response object", async () => {
  const data = { id: 1, name: "Test" };
  const response = successResponse(data, "Created", 201);

  assertEquals(response.status, 201);
  assertEquals(response.headers.get("Content-Type"), "application/json");

  const body = await response.json();
  assertEquals(body, {
    success: true,
    message: "Created",
    data: { id: 1, name: "Test" },
  });
});

Deno.test("successResponse uses default values", async () => {
  const response = successResponse(null);

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.message, "Success");
});

Deno.test("errorResponse creates valid Response object", async () => {
  const details = { field: "error" };
  const response = errorResponse("Bad Request", 400, details);

  assertEquals(response.status, 400);
  assertEquals(response.headers.get("Content-Type"), "application/json");

  const body = await response.json();
  assertEquals(body, {
    success: false,
    error: "Bad Request",
    details: { field: "error" },
  });
});

Deno.test("errorResponse uses default values", async () => {
  const response = errorResponse("Internal Error");

  assertEquals(response.status, 500);
  const body = await response.json();
  assertEquals(body.error, "Internal Error");
});
