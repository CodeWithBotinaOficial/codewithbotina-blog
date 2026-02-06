import { assertRejects } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { EmailService } from "../../../services/email.service.ts";
import { createMockResendClient } from "../../mocks/resend.mock.ts";
import { validContactData } from "../../fixtures/testData.ts";
import { EmailServiceError } from "../../../utils/errors.ts";
import { Resend } from "resend";

Deno.test("EmailService sends email successfully", async () => {
  const mockClient = createMockResendClient(false) as unknown as Resend;
  const service = new EmailService(mockClient);
  // Should not throw
  await service.sendContactNotification(validContactData);
});

Deno.test("EmailService throws EmailServiceError on failure", async () => {
  const mockClient = createMockResendClient(true) as unknown as Resend;
  const service = new EmailService(mockClient);

  await assertRejects(
    async () => {
      await service.sendContactNotification(validContactData);
    },
    EmailServiceError,
    "Failed to send email notification",
  );
});
