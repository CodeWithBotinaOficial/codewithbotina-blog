import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import { ContactRepository } from "../../../repositories/contact.repository.ts";
import { createMockSupabaseClient } from "../../mocks/supabase.mock.ts";
import { validContactData } from "../../fixtures/testData.ts";
import { DatabaseError } from "../../../utils/errors.ts";
import { SupabaseClient } from "@supabase/supabase-js";

Deno.test("ContactRepository inserts contact successfully", async () => {
  const mockClient = createMockSupabaseClient(
    false,
  ) as unknown as SupabaseClient;
  const repo = new ContactRepository(mockClient);
  const result = await repo.insertContact(validContactData);

  assertEquals(result.nombre, validContactData.nombre);
  assertEquals(result.id, "mock-uuid-123");
});

Deno.test("ContactRepository throws DatabaseError on failure", async () => {
  const mockClient = createMockSupabaseClient(
    true,
  ) as unknown as SupabaseClient;
  const repo = new ContactRepository(mockClient);

  await assertRejects(
    async () => {
      await repo.insertContact(validContactData);
    },
    DatabaseError,
    "Failed to save contact information",
  );
});
