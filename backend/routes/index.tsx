import { Head } from "$fresh/runtime.ts";
import TryItOut from "../islands/TryItOut.tsx";
import StatusIndicator from "../islands/StatusIndicator.tsx";

export default function ApiDocumentation() {
  const baseUrl = "https://api.codewithbotina.com";

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

            <section id="contact-api">
              <h2>Contact API</h2>
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

            <section id="auth-api">
              <h2>Authentication API</h2>

              <div class="card mb-6">
                <h4>Authentication Flow (Text Diagram)</h4>
                <pre><code>{`Client → GET /api/auth/google
        ↘ Redirect to Google OAuth
Google → GET /api/auth/callback?code=...
Backend → Exchange code for session + set cookies
Backend → Redirect to https://blog.codewithbotina.com/auth/success`}</code></pre>
              </div>

              <div class="endpoint-block mb-8">
                <h3>
                  <span class="endpoint-badge badge-get">GET</span>
                  /api/auth/google
                </h3>
                <p>Initiates the Google OAuth flow and redirects the user.</p>

                <div class="card">
                  <h4>Request Headers</h4>
                  <ul>
                    <li>
                      <code>Origin: https://blog.codewithbotina.com</code>{" "}
                      (CORS enforced)
                    </li>
                  </ul>

                  <h4>Response</h4>
                  <p>HTTP 302 Redirect to Google OAuth consent screen.</p>
                </div>
              </div>

              <div class="endpoint-block mb-8">
                <h3>
                  <span class="endpoint-badge badge-get">GET</span>
                  /api/auth/callback
                </h3>
                <p>
                  OAuth callback handler. Exchanges the authorization code for
                  session tokens, sets secure cookies, and redirects to the
                  frontend.
                </p>

                <div class="card">
                  <h4>Request</h4>
                  <pre><code>{`GET /api/auth/callback?code=AUTH_CODE`}</code></pre>

                  <h4>Response</h4>
                  <p>HTTP 302 Redirect to <code>https://blog.codewithbotina.com/auth/success</code></p>
                </div>
              </div>

              <div class="endpoint-block mb-8">
                <h3>
                  <span class="endpoint-badge badge-get">GET</span>
                  /api/auth/me
                </h3>
                <p>Returns the current authenticated user profile.</p>

                <div class="card">
                  <h4>Request Headers</h4>
                  <ul>
                    <li>
                      <code>Authorization: Bearer {"{access_token}"}</code>{" "}
                      (required)
                    </li>
                  </ul>

                  <h4>Success Response (200 OK)</h4>
                  <pre><code>{`{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "diego@example.com",
    "full_name": "Diego Alejandro Botina",
    "avatar_url": "https://lh3.googleusercontent.com/...",
    "google_id": "1234567890",
    "created_at": "2026-02-01T10:00:00Z",
    "last_login": "2026-02-07T15:30:00Z",
    "is_admin": false
  }
}`}</code></pre>

                  <h4>Error Response (401 Unauthorized)</h4>
                  <pre><code>{`{
  "success": false,
  "error": "Unauthorized"
}`}</code></pre>
                </div>
              </div>

              <div class="endpoint-block mb-8">
                <h3>
                  <span class="endpoint-badge badge-post">POST</span>
                  /api/auth/signout
                </h3>
                <p>Invalidates the session and clears auth cookies.</p>

                <div class="card">
                  <h4>Request Headers</h4>
                  <ul>
                    <li>
                      <code>Authorization: Bearer {"{access_token}"}</code>{" "}
                      (required)
                    </li>
                  </ul>

                  <h4>Success Response (200 OK)</h4>
                  <pre><code>{`{
  "success": true,
  "message": "Signed out successfully"
}`}</code></pre>
                </div>
              </div>

              <div class="endpoint-block mb-8">
                <h3>
                  <span class="endpoint-badge badge-post">POST</span>
                  /api/auth/refresh
                </h3>
                <p>Refreshes an access token using a refresh token.</p>

                <div class="card">
                  <h4>Request Headers</h4>
                  <ul>
                    <li>
                      <code>Content-Type: application/json</code>
                    </li>
                  </ul>

                  <h4>Request Body</h4>
                  <pre><code>{`{
  "refresh_token": "v1.MR..."
}`}</code></pre>

                  <h4>Success Response (200 OK)</h4>
                  <pre><code>{`{
  "success": true,
  "access_token": "eyJhbG...",
  "refresh_token": "v1.MR...",
  "expires_in": 3600
}`}</code></pre>
                </div>
              </div>
            </section>
          </section>

          <section id="post-management">
            <h2>📝 Post Management API (Admin Only)</h2>
            <p>
              Admin-only endpoints for creating, updating, deleting posts, and
              uploading featured images.
            </p>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>
                /api/posts/create
              </h3>
              <p>Create a new blog post.</p>

              <div class="card">
                <h4>Request Headers</h4>
                <ul>
                  <li>
                    <code>Authorization: Bearer {"{access_token}"}</code>{" "}
                    (required)
                  </li>
                  <li>
                    <code>Content-Type: application/json</code>
                  </li>
                </ul>

                <h4>Request Body</h4>
                <pre><code>{`{
  "titulo": "My New Post",
  "slug": "my-new-post",
  "body": "# Content\\n\\nMarkdown here...",
  "imagen_url": "https://example.com/image.jpg"
}`}</code></pre>

                <h4>Success Response (201 Created)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "titulo": "My New Post",
    "slug": "my-new-post",
    "fecha": "2026-02-26T10:00:00Z"
  }
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-put">PUT</span>
                /api/posts/{"{slug}"}/update
              </h3>
              <p>Update an existing post.</p>

              <div class="card">
                <h4>Request Headers</h4>
                <ul>
                  <li>
                    <code>Authorization: Bearer {"{access_token}"}</code>{" "}
                    (required)
                  </li>
                  <li>
                    <code>Content-Type: application/json</code>
                  </li>
                </ul>

                <h4>Request Body</h4>
                <pre><code>{`{
  "titulo": "Updated Title",
  "slug": "updated-title",
  "body": "# Updated content",
  "imagen_url": null
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-delete">DELETE</span>
                /api/posts/{"{slug}"}/delete
              </h3>
              <p>
                Fetch delete confirmation info, then delete when{" "}
                <code>confirm=true</code> is provided.
              </p>

              <div class="card">
                <h4>Request Headers</h4>
                <ul>
                  <li>
                    <code>Authorization: Bearer {"{access_token}"}</code>{" "}
                    (required)
                  </li>
                </ul>

                <h4>Confirmation Info</h4>
                <pre><code>{`DELETE /api/posts/my-post/delete

Response:
{
  "success": true,
  "message": "Confirmation required",
  "data": {
    "post_id": "uuid",
    "titulo": "My Post",
    "comments_count": 12,
    "reactions_count": 30,
    "likes_count": 22,
    "dislikes_count": 8,
    "requires_confirmation": true
  }
}`}</code></pre>

                <h4>Delete Request</h4>
                <pre><code>{`DELETE /api/posts/my-post/delete?confirm=true`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>
                /api/posts/{"{slug}"}/exists
              </h3>
              <p>Check if a slug already exists (for validation).</p>

              <div class="card">
                <h4>Success Response (200 OK)</h4>
                <pre><code>{`{
  "exists": true
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>
                /api/posts/upload-image
              </h3>
              <p>Upload and optimize a featured image.</p>

              <div class="card">
                <h4>Request Headers</h4>
                <ul>
                  <li>
                    <code>Authorization: Bearer {"{access_token}"}</code>{" "}
                    (required)
                  </li>
                  <li>
                    <code>Content-Type: multipart/form-data</code>
                  </li>
                </ul>

                <h4>Success Response (201 Created)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://.../blog-images/my-post-123456.webp",
    "filename": "my-post-123456.webp",
    "size": 456789
  }
}`}</code></pre>
              </div>
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
