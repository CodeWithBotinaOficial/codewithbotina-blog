import type { CreateEmailOptions, CreateEmailResponse } from "resend";

export const createMockResendClient = (shouldFail = false) => ({
  emails: {
    send: (
      _emailData: CreateEmailOptions,
    ): Promise<CreateEmailResponse> => {
      if (shouldFail) {
        return Promise.resolve({
          data: null,
          error: {
            message: "Failed to send email",
            name: "validation_error",
            statusCode: 500,
          },
          headers: {},
        });
      }
      return Promise.resolve({
        data: {
          id: "mock-email-id",
        },
        error: null,
        headers: {},
      });
    },
  },
});
