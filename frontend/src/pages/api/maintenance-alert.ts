import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async () => {
  const apiKey = import.meta.env.RESEND_API_KEY;
  const fromEmail = import.meta.env.RESEND_FROM_EMAIL || "noreply@codewithbotina.com";
  const toEmail = import.meta.env.RESEND_TO_EMAIL || "support@codewithbotina.com";

  if (!apiKey) {
    return new Response(
      JSON.stringify({ ok: false, message: "Service temporarily unavailable." }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
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
        <p><strong>Detected at:</strong> ${new Date().toISOString()}</p>
        <p>The backend is currently unavailable and the site entered maintenance mode.</p>
      `,
    }),
    });
  } catch {
    return new Response(
      JSON.stringify({ ok: false, message: "Service temporarily unavailable." }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (!response.ok) {
    return new Response(
      JSON.stringify({ ok: false, message: "Service temporarily unavailable." }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
