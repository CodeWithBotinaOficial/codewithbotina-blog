import { Resend } from "resend";

const resendApiKey = Deno.env.get("RESEND_API_KEY") || "re_placeholder_key";

if (!Deno.env.get("RESEND_API_KEY")) {
  console.warn(
    "Missing RESEND_API_KEY environment variable - using placeholder for build/dev",
  );
}

export const resend = new Resend(resendApiKey);

export const EMAIL_CONFIG = {
  FROM: Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev",
  TO: Deno.env.get("RESEND_TO_EMAIL") || "support@codewithbotina.com",
};
