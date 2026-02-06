import { Head } from "$fresh/runtime.ts";
import TryItOut from "../islands/TryItOut.tsx";
import StatusIndicator from "../islands/StatusIndicator.tsx";

export default function ApiDocumentation() {
  const baseUrl = "https://api-codewithbotina.deno.dev"; // In a real app, this might come from env or request context

  return (
    <>
      <Head>
        <title>CodeWithBotina API Documentation</title>
        <meta
          name="description"
          content="Official API documentation for CodeWithBotina backend services."
        />
        <link rel="stylesheet" href="/styles.css" />
      </Head>

      <div class="container">
        <header>
          <div class="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1>CodeWithBotina API</h1>
              <p class="text-gray-600">v1.0 • Edge-deployed RESTful API</p>
            </div>
            <StatusIndicator />
          </div>
          <p class="mt-4">
            Backend services for the{" "}
            <a href="https://blog.codewithbotina.com" target="_blank">
              CodeWithBotina Blog
            </a>. Built with Deno, Fresh, Supabase, and Resend.
          </p>
        </header>

        <main>
          <section id="quick-start">
            <h2>🚀 Quick Start</h2>
            <p>
              This API provides public endpoints for the blog's contact form and
              other dynamic features. No authentication is required for public
              endpoints.
            </p>
            <div class="card">
              <strong>Base URL:</strong> <code>{baseUrl}</code>
            </div>
          </section>

          <section id="endpoints">
            <h2>📡 Endpoints</h2>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>
                /api/contact
              </h3>
              <p>
                Submit a new contact form message. The data is validated, saved
                to the database, and an email notification is triggered.
              </p>

              <div class="card">
                <h4>Request Headers</h4>
                <ul>
                  <li>
                    <code>Content-Type: application/json</code>
                  </li>
                  <li>
                    <code>Origin: https://blog.codewithbotina.com</code>{" "}
                    (CORS enforced)
                  </li>
                </ul>

                <h4>Request Body</h4>
                <pre><code>{`{
  "nombre": "string (1-100 chars, required)",
  "correo": "valid email (required)",
  "mensaje": "string (10-1000 chars, required)"
}`}</code></pre>

                <h4>Success Response (201 Created)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Contact form submitted successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombre": "Diego Botina",
    "correo": "test@example.com",
    "mensaje": "...",
    "created_at": "2023-10-27T10:00:00Z"
  }
}`}</code></pre>
              </div>

              <TryItOut />
            </div>
          </section>

          <section id="errors">
            <h2>⚠️ Error Handling</h2>
            <p>All API errors follow a standardized JSON format:</p>
            <pre><code>{`{
  "success": false,
  "error": "Error message description",
  "details": {
    "field_name": "Specific validation error"
  }
}`}</code></pre>

            <h4 class="mt-4">Common Status Codes</h4>
            <ul class="list-disc pl-5">
              <li>
                <strong>400 Bad Request:</strong> Validation failed (check{" "}
                <code>details</code> object)
              </li>
              <li>
                <strong>403 Forbidden:</strong> Invalid CORS origin
              </li>
              <li>
                <strong>429 Too Many Requests:</strong> Rate limit exceeded
              </li>
              <li>
                <strong>500 Internal Server Error:</strong> Server-side issue
              </li>
            </ul>
          </section>

          <section id="rate-limiting">
            <h2>🛑 Rate Limiting</h2>
            <p>
              To prevent abuse, endpoints are rate-limited by IP address. If you
              exceed the limit, you will receive a{" "}
              <code>429 Too Many Requests</code> response.
            </p>
          </section>

          <section id="cors">
            <h2>🔒 CORS Policy</h2>
            <p>
              Access is strictly limited to allowed origins. Currently allowed:
              {" "}
              <code>https://blog.codewithbotina.com</code>
            </p>
          </section>
        </main>

        <footer>
          <p>
            &copy; {new Date().getFullYear()}{" "}
            CodeWithBotina. All rights reserved.<br />
            <a href="mailto:support@codewithbotina.com">
              support@codewithbotina.com
            </a>
          </p>
        </footer>
      </div>
    </>
  );
}
