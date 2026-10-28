import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.RESEND_API_KEY;
  const fromEmail = import.meta.env.RESEND_FROM_EMAIL || "noreply@codewithbotina.com";
  const toEmail = import.meta.env.RESEND_TO_EMAIL || "support@codewithbotina.com";

  if (!apiKey) {
    return new Response(
      JSON.stringify({ ok: false, message: "Missing Resend API key." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch (_error) {
    payload = {};
  }

  const detectedAt =
    typeof payload.detectedAt === "string" ? payload.detectedAt : new Date().toISOString();
  const userAgent =
    typeof payload.userAgent === "string" ? payload.userAgent : "Unknown user agent";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: "CodeWithBotina backend maintenance detected",
      html: `
        <h2>CodeWithBotina backend maintenance detected</h2>
        <p><strong>Detected at:</strong> ${detectedAt}</p>
        <p><strong>User Agent:</strong> ${userAgent}</p>
        <p>The backend is currently unavailable and the site entered maintenance mode.</p>
      `,
    }),
  });

  const body = await response.json().catch(() => ({ ok: false }));

  if (!response.ok) {
    return new Response(
      JSON.stringify({ ok: false, message: "Email delivery failed.", details: body }),
      {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return new Response(JSON.stringify({ ok: true, data: body }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
