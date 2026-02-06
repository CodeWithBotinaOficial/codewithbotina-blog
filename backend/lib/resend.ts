import { Resend } from "resend";

const resendApiKey = Deno.env.get("RESEND_API_KEY");

if (!resendApiKey) {
  console.error("Missing RESEND_API_KEY environment variable");
}

export const resend = new Resend(resendApiKey || "re_123");

export const EMAIL_CONFIG = {
  FROM: Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev",
  TO: Deno.env.get("RESEND_TO_EMAIL") || "support@codewithbotina.com",
};
