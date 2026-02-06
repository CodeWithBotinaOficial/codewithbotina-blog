import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { ContactService } from "../../../services/contact.service.ts";
import { ContactRepository } from "../../../repositories/contact.repository.ts";
import { EmailService } from "../../../services/email.service.ts";
import { validContactData } from "../../fixtures/testData.ts";
import { restore, stub } from "https://deno.land/std@0.216.0/testing/mock.ts";

Deno.test("ContactService processes submission successfully", async () => {
  const _insertStub = stub(
    ContactRepository.prototype,
    "insertContact",
    () => Promise.resolve({ id: "1", ...validContactData, created_at: "" }),
  );
  const _emailStub = stub(
    EmailService.prototype,
    "sendContactNotification",
    () => Promise.resolve(),
  );

  const service = new ContactService();
  const result = await service.processContactSubmission(validContactData);

  assertEquals(result.success, true);
  assertEquals(result.data?.id, "1");

  restore();
});

Deno.test("ContactService handles database failure", async () => {
  const _insertStub = stub(
    ContactRepository.prototype,
    "insertContact",
    () => Promise.reject(new Error("DB fail")),
  );
  const _emailStub = stub(
    EmailService.prototype,
    "sendContactNotification",
    () => Promise.resolve(),
  );

  const service = new ContactService();
  const result = await service.processContactSubmission(validContactData);

  assertEquals(result.success, false);
  assertEquals(result.error?.message, "DB fail");

  restore();
});

Deno.test("ContactService handles email failure but returns success", async () => {
  const _insertStub = stub(
    ContactRepository.prototype,
    "insertContact",
    () => Promise.resolve({ id: "1", ...validContactData, created_at: "" }),
  );
  const _emailStub = stub(
    EmailService.prototype,
    "sendContactNotification",
    () => Promise.reject(new Error("Email fail")),
  );

  const service = new ContactService();
  const result = await service.processContactSubmission(validContactData);

  // The contact was saved, so the operation is considered a success for the user
  assertEquals(result.success, true);
  assertEquals(result.data?.id, "1");

  restore();
});
