import { Head } from "$fresh/runtime.ts";
import StatusIndicator from "../islands/StatusIndicator.tsx";
import TryItOut from "../islands/TryItOut.tsx";

export default function ApiDocumentation() {
  const baseUrl = "https://api.codewithbotina.com";

  return (
    <>
      <Head>
        <title>CodeWithBotina API</title>
        <meta
          name="description"
          content="API documentation for CodeWithBotina backend services."
        />
        <link rel="stylesheet" href="/styles.css" />
      </Head>

      <div class="container">
        <header>
          <div class="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1>CodeWithBotina API</h1>
              <p class="text-gray-600">
                JSON API for{" "}
                <a href="https://blog.codewithbotina.com">
                  blog.codewithbotina.com
                </a>
              </p>
            </div>
            <StatusIndicator />
          </div>
          <p class="mt-4">
            Built with Deno, Fresh, Supabase, and Resend.
          </p>
        </header>

        <main>
          <section id="quick-start">
            <h2>Quick Start</h2>
            <div class="card">
              <p>
                <strong>Base URL:</strong> <code>{baseUrl}</code>
              </p>
              <p>
                <strong>Auth header:</strong>{" "}
                <code>Authorization: Bearer {"<access_token>"}</code>
              </p>
              <p>
                <strong>Auth cookies:</strong> <code>cwb_access</code>{" "}
                (access token), <code>cwb_refresh</code> (refresh token)
              </p>
              <p>
                <strong>Admin endpoints:</strong>{" "}
                require an authenticated user with <code>is_admin=true</code>.
              </p>
              <p>
                <strong>CORS:</strong>{" "}
                production responses include CORS headers for the configured
                frontend origin (defaults to{" "}
                <code>https://blog.codewithbotina.com</code>).
              </p>
              <p>
                <strong>Responses:</strong>{" "}
                many endpoints return a wrapped JSON shape{" "}
                <code>{"{ success, message, data }"}</code>. Some endpoints
                return custom JSON on success (explicitly marked below).
              </p>
            </div>
          </section>

          <section id="auth">
            <h2>Authentication</h2>

            <div class="card mb-6">
              <h4>OAuth Flow (as implemented)</h4>
              <pre>
                <code>{`1) Browser navigates to: GET /api/auth/google?next={frontendUrl}
2) Backend sets PKCE cookie and 302 redirects to Supabase OAuth authorize URL
3) Supabase redirects to: {frontendUrl}/auth/callback?code=...&pkce=...&next=...
4) Frontend forwards the code to: GET /api/auth/callback?code=...&pkce=...&next=...
5) Backend exchanges code, sets auth cookies, and 302 redirects to next (or /{lang}/)`}</code>
              </pre>
            </div>

            <div class="endpoint-block mb-8" id="auth-google">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/auth/google</code>
              </h3>
              <p>Initiate Google OAuth with PKCE and redirect the user.</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <p>
                  <strong>Query:</strong> <code>next</code>{" "}
                  (optional; must be same origin as the configured frontend or
                  it is ignored)
                </p>
                <h4>Example</h4>
                <pre><code>{`GET /api/auth/google?next=https://blog.codewithbotina.com/es/`}</code></pre>
                <h4>Success</h4>
                <p>
                  302 redirect to Supabase OAuth authorize URL. Sets a
                  short-lived <code>cwb_pkce</code> cookie.
                </p>
                <h4>Errors</h4>
                <ul>
                  <li>429 Too many requests</li>
                  <li>500 Internal server error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="auth-callback">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/auth/callback</code>
              </h3>
              <p>
                Finalize OAuth: exchange <code>code</code>{" "}
                for a session, set auth cookies, clear PKCE cookie, then
                redirect to the frontend.
              </p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <p>
                  <strong>Query:</strong> <code>code</code> (required),{" "}
                  <code>pkce</code> (optional token), <code>next</code>{" "}
                  (optional)
                </p>
                <h4>Example</h4>
                <pre><code>{`GET /api/auth/callback?code=AUTH_CODE&pkce=PKCE_TOKEN&next=https://blog.codewithbotina.com/es/`}</code></pre>
                <h4>Success</h4>
                <p>
                  302 redirect to <code>next</code> (if valid) or to{" "}
                  <code>/{`{lang}`}/</code>{" "}
                  on the configured frontend origin (defaults to{" "}
                  <code>/en/</code>).
                </p>
                <h4>Errors</h4>
                <ul>
                  <li>400 Missing authorization code</li>
                  <li>400 Missing PKCE code verifier</li>
                  <li>500 Internal server error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="auth-me">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/auth/me</code>
              </h3>
              <p>
                Get the current user. If the access token is invalid/expired but
                a refresh cookie exists, this endpoint attempts a refresh and
                sets updated cookies.
              </p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Authenticated user
                </p>
                <h4>Auth</h4>
                <pre><code>{`Authorization: Bearer <access_token>
or Cookie: cwb_access=...; cwb_refresh=...`}</code></pre>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Name",
    "avatar_url": "https://...",
    "google_id": "123456",
    "created_at": "2026-02-01T10:00:00Z",
    "last_login": "2026-02-07T15:30:00Z",
    "is_admin": false
  }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>401 Unauthorized</li>
                  <li>500 Internal server error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="auth-refresh">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>{" "}
                <code>{baseUrl}/api/auth/refresh</code>
              </h3>
              <p>
                Refresh an access token. Refresh token is taken from the JSON
                body (<code>refresh_token</code>) or the{" "}
                <code>cwb_refresh</code> cookie.
              </p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public (refresh token required)
                </p>
                <h4>Request body (optional)</h4>
                <pre><code>{`{ "refresh_token": "v1.MR..." }`}</code></pre>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{
  "success": true,
  "access_token": "eyJhbG...",
  "refresh_token": "v1.MR...",
  "expires_in": 3600
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>401 Missing refresh token</li>
                  <li>500 Internal server error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="auth-signout">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>{" "}
                <code>{baseUrl}/api/auth/signout</code>
              </h3>
              <p>Sign out (Supabase global sign-out) and clear auth cookies.</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Authenticated user
                </p>
                <h4>Auth</h4>
                <pre><code>{`Authorization: Bearer <access_token>
or Cookie: cwb_access=...`}</code></pre>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{ "success": true, "message": "Signed out successfully" }`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>401 Unauthorized</li>
                  <li>500 Internal server error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="auth-debug">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/auth/debug</code>
              </h3>
              <p>
                Debug endpoint: reports whether auth header/cookies exist and
                resolves the user if a token is present.
              </p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{
  "hasAuthHeader": true,
  "hasCookies": true,
  "hasAccessCookie": true,
  "hasPkceCookie": false,
  "user": { "id": "...", "email": "...", "is_admin": false },
  "error": null
}`}</code></pre>
              </div>
            </div>
          </section>

          <section id="posts">
            <h2>Posts</h2>

            <div class="endpoint-block mb-8" id="posts-index">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/posts</code>
              </h3>
              <p>
                List posts. Supports language filtering and a basic autocomplete
                query on <code>titulo</code>/<code>slug</code>.
              </p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <p>
                  <strong>Query:</strong> <code>language</code> (optional),{" "}
                  <code>q</code> (optional), <code>limit</code>,{" "}
                  <code>offset</code>
                </p>
                <h4>Example</h4>
                <pre><code>{`GET /api/posts?language=es&q=react&limit=20&offset=0`}</code></pre>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Posts fetched successfully",
  "data": {
    "posts": [
      { "id": "uuid", "titulo": "...", "slug": "...", "body": "...", "imagen_url": null, "fecha": "...", "updated_at": "...", "language": "es" }
    ],
    "limit": 20,
    "offset": 0
  }
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="posts-slug">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/posts/{"{slug}"}</code>
              </h3>
              <p>
                Fetch a post by slug, optionally by language, and include its
                tags.
              </p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <p>
                  <strong>Query:</strong> <code>language</code> (optional)
                </p>
                <h4>Example</h4>
                <pre><code>{`GET /api/posts/my-post?language=en`}</code></pre>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Post fetched successfully",
  "data": {
    "id": "uuid",
    "titulo": "...",
    "slug": "my-post",
    "body": "...",
    "imagen_url": null,
    "fecha": "...",
    "updated_at": "...",
    "language": "en",
    "tags": [{ "id": "uuid", "name": "Tag", "slug": "tag", "usage_count": 3 }]
  }
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="posts-search">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/posts/search</code>
              </h3>
              <p>Advanced search with optional date/language/tag filters.</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <p>
                  <strong>Query:</strong> <code>q</code>, <code>from</code>,
                  {" "}
                  <code>to</code>, <code>language</code> or{" "}
                  <code>languages</code>, <code>tag_ids</code> or{" "}
                  <code>tags</code> or <code>tag_slug</code>,{" "}
                  <code>scope</code>, <code>sort</code>, <code>relevance</code>,
                  {" "}
                  <code>limit</code>, <code>offset</code>
                </p>
                <h4>Notes</h4>
                <ul>
                  <li>
                    Default <code>scope=title</code>{" "}
                    uses sequential fallback: title → content → tags.
                  </li>
                  <li>
                    Response includes{" "}
                    <code>phase</code>: title|content|tags|none.
                  </li>
                  <li>
                    Tag filters apply AND logic (post must contain all selected
                    tags).
                  </li>
                  <li>
                    <code>languages=all</code> disables language filtering.
                  </li>
                </ul>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Posts fetched successfully",
  "data": {
    "posts": [{ "id": "uuid", "titulo": "...", "slug": "...", "body": "...", "imagen_url": null, "fecha": "...", "language": "en" }],
    "total": 123,
    "limit": 10,
    "offset": 0,
    "phase": "title",
    "relevance": "most_recent",
    "sort": "newest"
  }
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="posts-create">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>{" "}
                <code>{baseUrl}/api/posts/create</code>
              </h3>
              <p>
                Create posts (admin only). Accepts single post or a batch
                payload.
              </p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Admin
                </p>
                <h4>Request body (single)</h4>
                <pre><code>{`{
  "titulo": "Title",
  "slug": "title",
  "body": "Min 100 chars...",
  "language": "en",
  "imagen_url": "https://...",
  "tag_ids": ["uuid"]
}`}</code></pre>
                <h4>Request body (batch)</h4>
                <pre><code>{`{
  "posts": [
    { "titulo": "Hola", "slug": "hola", "body": "Min 100 chars...", "language": "es", "tag_ids": [] },
    { "titulo": "Hello", "slug": "hello", "body": "Min 100 chars...", "language": "en", "tag_ids": [] }
  ]
}`}</code></pre>
                <h4>Success (wrapped, single)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Post created successfully",
  "data": { "id": "uuid", "titulo": "Title", "slug": "title", "fecha": "..." }
}`}</code></pre>
                <h4>Success (wrapped, batch)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Posts created successfully",
  "data": {
    "posts": [{ "id": "uuid", "titulo": "Hola", "slug": "hola", "fecha": "...", "language": "es" }],
    "translation_group_id": "uuid-or-null"
  }
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="posts-update">
              <h3>
                <span class="endpoint-badge badge-put">PUT</span>{" "}
                <code>{baseUrl}/api/posts/{"{slug}"}/update</code>
              </h3>
              <p>Update a post by slug (admin only).</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Admin
                </p>
                <h4>Request body</h4>
                <pre><code>{`{
  "titulo": "Updated",
  "slug": "updated",
  "body": "Min 100 chars...",
  "language": "en",
  "imagen_url": null,
  "tag_ids": ["uuid"]
}`}</code></pre>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Post updated successfully",
  "data": { "id": "uuid", "titulo": "Updated", "slug": "updated" }
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="posts-bulk-update">
              <h3>
                <span class="endpoint-badge badge-put">PUT</span>{" "}
                <code>{baseUrl}/api/posts/bulk-update</code>
              </h3>
              <p>Bulk update/create/unlink translations (admin only).</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Admin
                </p>
                <h4>Request body</h4>
                <pre><code>{`{
  "updates": [{ "post_id": "uuid", "post": { "titulo": "...", "slug": "...", "body": "...", "language": "en" } }],
  "creates": [{ "base_post_id": "uuid", "post": { "titulo": "...", "slug": "...", "body": "...", "language": "es" } }],
  "unlinks": [{ "post_id": "uuid", "linked_post_id": "uuid" }]
}`}</code></pre>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Posts updated successfully",
  "data": {
    "updated_post_ids": ["uuid"],
    "created_post_ids": ["uuid"],
    "unlinked_post_ids": ["uuid"],
    "translation_group_id_by_base_post_id": { "uuid": "uuid-or-null" }
  }
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="posts-delete">
              <h3>
                <span class="endpoint-badge badge-delete">DELETE</span>{" "}
                <code>{baseUrl}/api/posts/{"{slug}"}/delete</code>
              </h3>
              <p>
                Delete a post (admin only). Requires <code>confirm=true</code>
                {" "}
                to execute.
              </p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Admin
                </p>
                <p>
                  <strong>Query:</strong> <code>confirm</code> (optional),{" "}
                  <code>language</code> (optional)
                </p>
                <h4>Success (wrapped, confirm missing/false)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Confirmation required",
  "data": { "post_id": "uuid", "titulo": "...", "comments_count": 12, "reactions_count": 30, "likes_count": 25, "dislikes_count": 5, "imagen_url": null, "requires_confirmation": true }
}`}</code></pre>
                <h4>Success (wrapped, confirm=true)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Post deleted successfully",
  "data": { "post_id": "uuid", "comments_deleted": 12, "reactions_deleted": 30 }
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="posts-exists">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/posts/{"{slug}"}/exists</code>
              </h3>
              <p>Check whether a slug exists.</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <p>
                  <strong>Query:</strong> <code>language</code> (optional)
                </p>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{ "exists": true }`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="posts-upload-image">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>{" "}
                <code>{baseUrl}/api/posts/upload-image</code>
              </h3>
              <p>
                Upload a featured image (admin only). Uses{" "}
                <code>multipart/form-data</code>.
              </p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Admin
                </p>
                <h4>Form fields</h4>
                <pre><code>{`image: file
title: string
slug: string`}</code></pre>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Image uploaded successfully",
  "data": { "url": "https://...", "filename": "file.webp", "size": 123 }
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="posts-tags">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/posts/{"{slug}"}/tags</code>
              </h3>
              <p>Fetch tags for a post slug.</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{
  "success": true,
  "data": { "tags": [{ "id": "uuid", "name": "Tag", "slug": "tag", "description": null, "usage_count": 3 }] }
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="posts-translations">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/posts/{"{postId}"}/translations</code>
              </h3>
              <p>
                List translations for a post by UUID. Note: the route param name
                is <code>slug</code> in code, but this endpoint expects a UUID.
              </p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Translations fetched successfully",
  "data": {
    "translations": [
      { "post_id": "uuid", "language": "es", "slug": "hola", "titulo": "Hola", "fecha": "...", "imagen_url": null, "translation_group_id": "uuid" }
    ]
  }
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="posts-translations-link">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>{" "}
                <code>{baseUrl}/api/posts/{"{postId}"}/translations</code>
              </h3>
              <p>
                Link/unlink translations (admin only). Empty{" "}
                <code>linked_post_ids</code> unlinks the post from its group.
              </p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Admin
                </p>
                <h4>Request body</h4>
                <pre><code>{`{ "linked_post_ids": ["uuid", "uuid"] }`}</code></pre>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Translations linked successfully",
  "data": { "translation_group_id": "uuid-or-null", "translations": [] }
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="posts-translation-language">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>
                  {baseUrl}/api/posts/{"{postId}"}/translation/{"{language}"}
                </code>
              </h3>
              <p>Fetch the translation summary for a given target language.</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Translation fetched successfully",
  "data": { "post_id": "uuid", "language": "en", "slug": "hello", "titulo": "Hello", "fecha": "...", "imagen_url": null, "translation_group_id": "uuid" }
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="posts-translations-unlink">
              <h3>
                <span class="endpoint-badge badge-delete">DELETE</span>{" "}
                <code>
                  {baseUrl}/api/posts/{"{postId}"}/translations/{"{linkedPostId}"}
                </code>
              </h3>
              <p>Unlink a translation (admin only).</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Admin
                </p>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Translation unlinked successfully",
  "data": { "translation_group_id": "uuid-or-null" }
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="posts-test">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/posts/test</code>
              </h3>
              <p>
                Diagnostics endpoint for Supabase connectivity and auth
                decoding.
              </p>
              <div class="card">
                <p>
                  <strong>Auth:</strong>{" "}
                  Public (Authorization header is optional)
                </p>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{ "success": true, "logs": ["..."], "timestamp": "..." }`}</code></pre>
              </div>
            </div>
          </section>

          <section id="tags">
            <h2>Tags</h2>

            <div class="endpoint-block mb-8" id="tags-index">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/tags</code>
              </h3>
              <p>
                List tags with optional query/sort/pagination and optional
                language filter.
              </p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <p>
                  <strong>Query:</strong> <code>q</code> (optional),{" "}
                  <code>sort</code> (most_used|az|za|recent),{" "}
                  <code>limit</code>, <code>offset</code>, <code>language</code>
                  {" "}
                  (optional; use <code>all</code> to disable)
                </p>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{
  "success": true,
  "data": { "tags": [{ "id": "uuid", "name": "Tag", "slug": "tag", "description": null, "created_at": null, "usage_count": 3 }], "total": 1, "limit": 20, "offset": 0 }
}`}</code></pre>
                <h4>Note</h4>
                <p>
                  When <code>language</code> is set (and not{" "}
                  <code>all</code>), tags are filtered to those used by posts in
                  that language and each tag includes{" "}
                  <code>usage_count_language</code>.
                </p>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="tags-slug">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/tags/{"{slug}"}</code>
              </h3>
              <p>Fetch a tag and its posts.</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <p>
                  <strong>Query:</strong> <code>language</code> (optional),{" "}
                  <code>limit</code> (10|50|100; defaults to 20),{" "}
                  <code>offset</code>
                </p>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{
  "success": true,
  "data": { "tag": { "id": "uuid", "name": "Tag", "slug": "tag", "description": null, "created_at": null }, "posts": [], "total_posts": 0 }
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="tags-autocomplete">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/tags/autocomplete</code>
              </h3>
              <p>Autocomplete tag names (min 2 characters).</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <p>
                  <strong>Query:</strong> <code>q</code>
                </p>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{ "success": true, "data": { "tags": [{ "id": "uuid", "name": "DevOps", "slug": "devops", "usage_count": 8 }] } }`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="tags-suggest">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>{" "}
                <code>{baseUrl}/api/tags/suggest</code>
              </h3>
              <p>Suggest tags based on a title/body payload.</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <h4>Request body</h4>
                <pre><code>{`{ "title": "Post title", "body": "Post body" }`}</code></pre>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{ "success": true, "data": { "suggestions": [{ "id": "uuid", "name": "Tag", "slug": "tag", "usage_count": 3 }] } }`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="tags-create">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>{" "}
                <code>{baseUrl}/api/tags/create</code>
              </h3>
              <p>Create a tag (admin only).</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Admin
                </p>
                <h4>Request body</h4>
                <pre><code>{`{ "name": "New Tag", "description": "Optional" }`}</code></pre>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{ "success": true, "message": "Tag created", "data": { "tag": { "id": "uuid", "name": "New Tag", "slug": "new-tag", "usage_count": 0, "description": null } } }`}</code></pre>
              </div>
            </div>
          </section>

          <section id="comments">
            <h2>Comments</h2>
            <div class="card mb-6">
              <p>
                Route note: <code>/api/comments/{"{commentId}"}</code>{" "}
                is used for all methods. In the implementation, <code>GET</code>
                {" "}
                and <code>POST</code> treat that parameter as a{" "}
                <strong>post id</strong>, while <code>PUT</code> and{" "}
                <code>DELETE</code> treat it as a <strong>comment id</strong>.
              </p>
            </div>

            <div class="endpoint-block mb-8" id="comments-list">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/comments/{"{postId}"}</code>
              </h3>
              <p>List comments for a post.</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{ "success": true, "data": [], "meta": { "total": 0, "pinned_count": 0 } }`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="comments-create">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>{" "}
                <code>{baseUrl}/api/comments/{"{postId}"}</code>
              </h3>
              <p>Create a comment for a post.</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Authenticated user
                </p>
                <h4>Request body</h4>
                <pre><code>{`{ "content": "Min 10 chars..." }`}</code></pre>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{ "success": true, "data": { "id": "uuid", "post_id": "uuid", "user_id": "uuid", "content": "...", "is_pinned": false, "created_at": "...", "updated_at": "...", "user": { "id": "uuid", "full_name": "Name", "avatar_url": null } } }`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="comments-update">
              <h3>
                <span class="endpoint-badge badge-put">PUT</span>{" "}
                <code>{baseUrl}/api/comments/{"{commentId}"}</code>
              </h3>
              <p>Update a comment (author only).</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Authenticated user
                </p>
                <h4>Request body</h4>
                <pre><code>{`{ "content": "Min 10 chars..." }`}</code></pre>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{ "success": true, "data": { "id": "uuid", "post_id": "uuid", "user_id": "uuid", "content": "...", "created_at": "...", "updated_at": "...", "is_pinned": false } }`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="comments-delete">
              <h3>
                <span class="endpoint-badge badge-delete">DELETE</span>{" "}
                <code>{baseUrl}/api/comments/{"{commentId}"}</code>
              </h3>
              <p>Delete a comment (author or admin).</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Authenticated user
                </p>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{ "success": true, "message": "Comment deleted successfully" }`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="comments-pin">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>{" "}
                <code>{baseUrl}/api/comments/{"{commentId}"}/pin</code>
              </h3>
              <p>Pin a comment (admin only).</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Admin
                </p>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{ "success": true, "data": { "id": "uuid", "is_pinned": true, "updated_at": "..." } }`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="comments-unpin">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>{" "}
                <code>{baseUrl}/api/comments/{"{commentId}"}/unpin</code>
              </h3>
              <p>Unpin a comment (admin only).</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Admin
                </p>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{ "success": true, "data": { "id": "uuid", "is_pinned": false, "updated_at": "..." } }`}</code></pre>
              </div>
            </div>
          </section>

          <section id="reactions">
            <h2>Reactions</h2>

            <div class="endpoint-block mb-8" id="reactions-counts">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/reactions/{"{postId}"}</code>
              </h3>
              <p>Get like/dislike counts for a post.</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{ "success": true, "data": { "post_id": "uuid", "likes": 10, "dislikes": 2, "total": 12 } }`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="reactions-like">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>{" "}
                <code>{baseUrl}/api/reactions/{"{postId}"}/like</code>
              </h3>
              <p>Toggle like (authenticated user).</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Authenticated user
                </p>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{ "success": true, "data": { "reaction": "like", "counts": { "likes": 11, "dislikes": 2, "total": 13 } } }`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="reactions-dislike">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>{" "}
                <code>{baseUrl}/api/reactions/{"{postId}"}/dislike</code>
              </h3>
              <p>Toggle dislike (authenticated user).</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Authenticated user
                </p>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{ "success": true, "data": { "reaction": "dislike", "counts": { "likes": 10, "dislikes": 3, "total": 13 } } }`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="reactions-user">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/reactions/user/{"{postId}"}</code>
              </h3>
              <p>Get the current user reaction for a post.</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Authenticated user
                </p>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{ "success": true, "data": { "user_reaction": "like" } }`}</code></pre>
              </div>
            </div>
          </section>

          <section id="storage">
            <h2>Storage</h2>

            <div class="endpoint-block mb-8" id="storage-images">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/storage/images</code>
              </h3>
              <p>List images in the storage bucket (admin only).</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Admin
                </p>
                <p>
                  <strong>Query:</strong> <code>limit</code>,{" "}
                  <code>offset</code>, <code>q</code> (optional)
                </p>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Images fetched successfully",
  "data": { "bucket": "blog-images", "images": [], "limit": 48, "offset": 0, "next_offset": 48, "has_more": false }
}`}</code></pre>
              </div>
            </div>
          </section>

          <section id="users">
            <h2>Users</h2>

            <div class="endpoint-block mb-8" id="users-profile">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/users/profile</code>
              </h3>
              <p>Fetch the current user profile stats and liked posts.</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Authenticated user
                </p>
                <p>
                  <strong>Query:</strong> <code>limit</code> (1..200),{" "}
                  <code>offset</code>
                </p>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Profile fetched successfully",
  "data": { "stats": { "likes_given": 0, "dislikes_given": 0, "comments_posted": 0 }, "liked_posts_total": 0, "liked_posts": [], "pagination": { "limit": 20, "offset": 0 } }
}`}</code></pre>
              </div>
            </div>

            <div class="endpoint-block mb-8" id="users-delete-account">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>{" "}
                <code>{baseUrl}/api/users/delete-account</code>
              </h3>
              <p>
                Delete the current user account (authenticated user) and clear
                auth cookies.
              </p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Authenticated user
                </p>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{ "success": true, "message": "Account deleted successfully", "data": { "deleted": true } }`}</code></pre>
              </div>
            </div>
          </section>

          <section id="cookies">
            <h2>Cookie Consent</h2>

            <div class="endpoint-block mb-8" id="cookies-consent">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>{" "}
                <code>{baseUrl}/api/cookies/consent</code>
              </h3>
              <p>
                Store cookie consent preferences. If not authenticated,{" "}
                <code>session_id</code> is required. If authenticated,{" "}
                <code>session_id</code> may be omitted.
              </p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public (optional authentication)
                </p>
                <h4>Request body</h4>
                <pre><code>{`{
  "session_id": "uuid",
  "functional_cookies": true,
  "analytics_cookies": false,
  "marketing_cookies": false
}`}</code></pre>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{ "success": true, "data": { "saved": true } }`}</code></pre>
              </div>
            </div>
          </section>

          <section id="contact">
            <h2>Contact</h2>

            <div class="endpoint-block mb-8" id="contact-submit">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>{" "}
                <code>{baseUrl}/api/contact</code>
              </h3>
              <p>Submit a contact form message.</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <h4>Request body</h4>
                <pre><code>{`{
  "nombre": "string (max 100 chars)",
  "correo": "valid email",
  "mensaje": "string (10-1000 chars)"
}`}</code></pre>
                <h4>Success (wrapped)</h4>
                <pre><code>{`{
  "success": true,
  "message": "Contact form submitted successfully",
  "data": { "id": "uuid", "nombre": "Name", "correo": "email@example.com", "mensaje": "...", "created_at": "..." }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>400 Validation failed (details provided)</li>
                  <li>429 Too many requests</li>
                  <li>500 Internal server error</li>
                </ul>
              </div>
              <TryItOut />
            </div>
          </section>

          <section id="health">
            <h2>Health</h2>

            <div class="endpoint-block mb-8" id="health-check">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>{" "}
                <code>{baseUrl}/api/health</code>
              </h3>
              <p>Service health check for monitoring.</p>
              <div class="card">
                <p>
                  <strong>Auth:</strong> Public
                </p>
                <h4>Success (custom JSON)</h4>
                <pre><code>{`{ "status": "ok", "timestamp": "2026-03-01T12:00:00Z" }`}</code></pre>
              </div>
            </div>
          </section>

          <section id="errors">
            <h2>Error Handling</h2>
            <p>
              Most endpoints return errors using the backend helper{" "}
              <code>errorResponse</code>:
            </p>
            <pre><code>{`{
  "success": false,
  "error": "Error message",
  "details": { "field": "optional detail" }
}`}</code></pre>
            <p class="text-gray-600">
              Endpoints marked “custom JSON” still use{" "}
              <code>errorResponse</code> for errors.
            </p>
          </section>
        </main>
      </div>
    </>
  );
}
