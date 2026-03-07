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
            <h2>Quick Start</h2>
            <p>
              All endpoints are served from the base URL below. Requests must be
              sent as JSON unless noted otherwise. Admin endpoints require a
              bearer token obtained from OAuth.
            </p>
            <div class="card">
              <p>
                <strong>Base URL:</strong> <code>{baseUrl}</code>
              </p>
              <p>
                <strong>Auth Header:</strong>{" "}
                <code>Authorization: Bearer {"{access_token}"}</code>
              </p>
              <p>
                <strong>CORS:</strong> Origin restricted to
                <code>https://blog.codewithbotina.com</code> in production.
              </p>
              <p>
                <strong>Rate limits:</strong> Contact form and OAuth initiation
                are rate limited (HTTP 429 on abuse).
              </p>
            </div>
          </section>

          <section id="auth-api">
            <h2>Authentication</h2>
            <div class="card mb-6">
              <h4>OAuth Flow</h4>
              <pre><code>{`Client → GET /api/auth/google
       ↘ Redirect to Google OAuth
Google → GET /api/auth/callback?code=...
Backend → Exchange code + set cookies
Backend → Redirect to /{lang}/auth/success (frontend)`}</code></pre>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>
                <code>{baseUrl}/api/auth/google</code>
              </h3>
              <p>Initiate Google OAuth with PKCE and redirect the user.</p>
              <div class="card">
                <p><strong>Auth:</strong> Public</p>
                <p><strong>Query:</strong> <code>next</code> (optional full URL)</p>
                <h4>Example Request</h4>
                <pre><code>{`GET /api/auth/google?next=https://blog.codewithbotina.com/es/`}</code></pre>
                <h4>Response</h4>
                <p>302 redirect to Google OAuth consent screen.</p>
                <h4>Errors</h4>
                <ul>
                  <li>429 Too Many Requests</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>
                <code>{baseUrl}/api/auth/callback</code>
              </h3>
              <p>OAuth callback handler. Exchanges the code for a session.</p>
              <div class="card">
                <p><strong>Auth:</strong> Public</p>
                <p><strong>Query:</strong> <code>code</code> (required), <code>next</code> (optional)</p>
                <h4>Example Request</h4>
                <pre><code>{`GET /api/auth/callback?code=AUTH_CODE&next=https://blog.codewithbotina.com/es/`}</code></pre>
                <h4>Response</h4>
                <p>302 redirect to frontend auth success page.</p>
                <h4>Errors</h4>
                <ul>
                  <li>400 Missing authorization code</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>
                <code>{baseUrl}/api/auth/me</code>
              </h3>
              <p>Return the authenticated user profile.</p>
              <div class="card">
                <p><strong>Auth:</strong> Authenticated user</p>
                <h4>Headers</h4>
                <pre><code>{`Authorization: Bearer {access_token}`}</code></pre>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "diego@example.com",
    "full_name": "Diego Alejandro Botina",
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
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>
                <code>{baseUrl}/api/auth/refresh</code>
              </h3>
              <p>Refresh an access token using a refresh token.</p>
              <div class="card">
                <p><strong>Auth:</strong> Public (refresh token required)</p>
                <h4>Request Body</h4>
                <pre><code>{`{
  "refresh_token": "v1.MR..."
}`}</code></pre>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "access_token": "eyJhbG...",
  "refresh_token": "v1.MR...",
  "expires_in": 3600
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>400 Invalid JSON</li>
                  <li>401 Unauthorized</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>
                <code>{baseUrl}/api/auth/signout</code>
              </h3>
              <p>Invalidate the current session and clear cookies.</p>
              <div class="card">
                <p><strong>Auth:</strong> Authenticated user</p>
                <h4>Headers</h4>
                <pre><code>{`Authorization: Bearer {access_token}`}</code></pre>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "message": "Signed out successfully"
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>401 Unauthorized</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="posts-api">
            <h2>Posts</h2>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>
                <code>{baseUrl}/api/posts</code>
              </h3>
              <p>List posts with optional language filtering.</p>
              <div class="card">
                <p><strong>Auth:</strong> Public</p>
                <p><strong>Query:</strong> <code>language</code>, <code>limit</code>, <code>offset</code></p>
                <h4>Example Request</h4>
                <pre><code>{`GET /api/posts?language=es&limit=20&offset=0`}</code></pre>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "uuid",
        "titulo": "Mi Post",
        "slug": "mi-post",
        "body": "...",
        "imagen_url": null,
        "fecha": "2026-03-01T12:00:00Z",
        "updated_at": null,
        "language": "es"
      }
    ],
    "limit": 20,
    "offset": 0
  }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>400 Unsupported language</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>
                <code>{baseUrl}/api/posts/{"{slug}"}</code>
              </h3>
              <p>Fetch a single post and its tags.</p>
              <div class="card">
                <p><strong>Auth:</strong> Public</p>
                <p><strong>Query:</strong> <code>language</code> (optional)</p>
                <h4>Example Request</h4>
                <pre><code>{`GET /api/posts/mi-post?language=es`}</code></pre>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "data": {
    "id": "uuid",
    "titulo": "Mi Post",
    "slug": "mi-post",
    "body": "...",
    "imagen_url": null,
    "fecha": "2026-03-01T12:00:00Z",
    "updated_at": null,
    "language": "es",
    "tags": [
      { "id": "uuid", "name": "Tag", "slug": "tag", "usage_count": 3 }
    ]
  }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>400 Unsupported language</li>
                  <li>404 Post not found</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>
                <code>{baseUrl}/api/posts/create</code>
              </h3>
              <p>Create a new post (admin only).</p>
              <div class="card">
                <p><strong>Auth:</strong> Admin</p>
                <h4>Request Body</h4>
                <pre><code>{`{
  "titulo": "My Post Title",
  "slug": "my-post-title",
  "body": "Post content here...",
  "language": "en",
  "imagen_url": "https://...",
  "tag_ids": ["uuid1", "uuid2"]
}`}</code></pre>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "id": "uuid",
    "titulo": "My Post Title",
    "slug": "my-post-title",
    "fecha": "2026-03-01T12:00:00Z"
  }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>400 Validation failed</li>
                  <li>401 Unauthorized</li>
                  <li>403 Forbidden</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-put">PUT</span>
                <code>{baseUrl}/api/posts/{"{slug}"}/update</code>
              </h3>
              <p>Update an existing post (admin only).</p>
              <div class="card">
                <p><strong>Auth:</strong> Admin</p>
                <h4>Request Body</h4>
                <pre><code>{`{
  "titulo": "Updated Title",
  "slug": "updated-title",
  "body": "Updated content",
  "language": "en",
  "imagen_url": null,
  "tag_ids": ["uuid1", "uuid2"]
}`}</code></pre>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "message": "Post updated successfully",
  "data": {
    "id": "uuid",
    "titulo": "Updated Title",
    "slug": "updated-title"
  }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>400 Validation failed</li>
                  <li>401 Unauthorized</li>
                  <li>403 Forbidden</li>
                  <li>404 Post not found</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-delete">DELETE</span>
                <code>{baseUrl}/api/posts/{"{slug}"}/delete</code>
              </h3>
              <p>Delete a post (admin only). Requires confirmation.</p>
              <div class="card">
                <p><strong>Auth:</strong> Admin</p>
                <h4>Example Request</h4>
                <pre><code>{`DELETE /api/posts/my-post/delete
DELETE /api/posts/my-post/delete?confirm=true`}</code></pre>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "message": "Confirmation required",
  "data": {
    "requires_confirmation": true,
    "comments_count": 12,
    "reactions_count": 30
  }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>401 Unauthorized</li>
                  <li>403 Forbidden</li>
                  <li>404 Post not found</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>
                <code>{baseUrl}/api/posts/{"{slug}"}/exists</code>
              </h3>
              <p>Check if a slug already exists.</p>
              <div class="card">
                <p><strong>Auth:</strong> Public</p>
                <p><strong>Query:</strong> <code>language</code> (optional)</p>
                <h4>Success Response</h4>
                <pre><code>{`{
  "exists": true
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>
                <code>{baseUrl}/api/posts/upload-image</code>
              </h3>
              <p>Upload and optimize a featured image (admin only).</p>
              <div class="card">
                <p><strong>Auth:</strong> Admin</p>
                <h4>Headers</h4>
                <pre><code>{`Content-Type: multipart/form-data`}</code></pre>
                <h4>Form Fields</h4>
                <pre><code>{`image: file
slug: string
title: string`}</code></pre>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://.../blog-images/my-post.webp",
    "filename": "my-post.webp",
    "size": 456789
  }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>400 Invalid file</li>
                  <li>401 Unauthorized</li>
                  <li>403 Forbidden</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>
                <code>{baseUrl}/api/posts/{"{slug}"}/tags</code>
              </h3>
              <p>Fetch tags attached to a post.</p>
              <div class="card">
                <p><strong>Auth:</strong> Public</p>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "data": {
    "tags": [
      { "id": "uuid", "name": "Tag", "slug": "tag" }
    ]
  }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>404 Post not found</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>
                <code>{baseUrl}/api/posts/test</code>
              </h3>
              <p>Diagnostic endpoint for admin auth + Supabase connectivity.</p>
              <div class="card">
                <p><strong>Auth:</strong> Admin</p>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "message": "Admin access confirmed",
  "data": {
    "connected": true
  }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>401 Unauthorized</li>
                  <li>403 Forbidden</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="tags-api">
            <h2>Tags</h2>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>
                <code>{baseUrl}/api/tags</code>
              </h3>
              <p>List all tags ordered by usage count.</p>
              <div class="card">
                <p><strong>Auth:</strong> Public</p>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "data": {
    "tags": [
      { "id": "uuid", "name": "Tag", "slug": "tag", "usage_count": 3 }
    ]
  }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>
                <code>{baseUrl}/api/tags/{"{slug}"}</code>
              </h3>
              <p>Fetch tag details and posts for a tag.</p>
              <div class="card">
                <p><strong>Auth:</strong> Public</p>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "data": {
    "tag": { "id": "uuid", "name": "Tag", "slug": "tag", "usage_count": 3 },
    "posts": [
      { "id": "uuid", "titulo": "Post", "slug": "post", "fecha": "2026-03-01T12:00:00Z" }
    ]
  }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>404 Tag not found</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>
                <code>{baseUrl}/api/tags/suggest</code>
              </h3>
              <p>Generate tag suggestions based on title and body.</p>
              <div class="card">
                <p><strong>Auth:</strong> Public</p>
                <h4>Request Body</h4>
                <pre><code>{`{
  "title": "Post title",
  "body": "Post body"
}`}</code></pre>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "data": { "suggestions": [{ "id": "uuid", "name": "Tag", "slug": "tag" }] }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>400 Invalid request</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>
                <code>{baseUrl}/api/tags/autocomplete</code>
              </h3>
              <p>Autocomplete tag names.</p>
              <div class="card">
                <p><strong>Auth:</strong> Public</p>
                <p><strong>Query:</strong> <code>q</code> (min 2 chars)</p>
                <h4>Example Request</h4>
                <pre><code>{`GET /api/tags/autocomplete?q=dev`}</code></pre>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "data": {
    "tags": [
      { "id": "uuid", "name": "DevOps", "slug": "devops", "usage_count": 8 }
    ]
  }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>400 Query too short</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>
                <code>{baseUrl}/api/tags/create</code>
              </h3>
              <p>Create a new tag (admin only).</p>
              <div class="card">
                <p><strong>Auth:</strong> Admin</p>
                <h4>Request Body</h4>
                <pre><code>{`{
  "name": "New Tag"
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>401 Unauthorized</li>
                  <li>403 Forbidden</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="comments-api">
            <h2>Comments</h2>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>
                <code>{baseUrl}/api/comments/{"{postId}"}</code>
              </h3>
              <p>List comments for a post.</p>
              <div class="card">
                <p><strong>Auth:</strong> Public</p>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "data": [
    { "id": "uuid", "content": "Great post", "user_id": "uuid", "is_pinned": false }
  ],
  "meta": { "total": 1, "pinned_count": 0 }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>404 Post not found</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>
                <code>{baseUrl}/api/comments/{"{postId}"}</code>
              </h3>
              <p>Create a comment for a post.</p>
              <div class="card">
                <p><strong>Auth:</strong> Authenticated user</p>
                <h4>Request Body</h4>
                <pre><code>{`{
  "content": "Great post!"
}`}</code></pre>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "data": { "id": "uuid", "content": "Great post!", "user_id": "uuid" }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>400 Validation failed</li>
                  <li>401 Unauthorized</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-put">PUT</span>
                <code>{baseUrl}/api/comments/{"{commentId}"}</code>
              </h3>
              <p>Update a comment (author only).</p>
              <div class="card">
                <p><strong>Auth:</strong> Authenticated user</p>
                <h4>Request Body</h4>
                <pre><code>{`{
  "content": "Updated comment"
}`}</code></pre>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "data": { "id": "uuid", "content": "Updated comment" }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>401 Unauthorized</li>
                  <li>403 Forbidden</li>
                  <li>404 Comment not found</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-delete">DELETE</span>
                <code>{baseUrl}/api/comments/{"{commentId}"}</code>
              </h3>
              <p>Delete a comment (author or admin).</p>
              <div class="card">
                <p><strong>Auth:</strong> Authenticated user</p>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "message": "Comment deleted successfully"
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>401 Unauthorized</li>
                  <li>403 Forbidden</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>
                <code>{baseUrl}/api/comments/{"{commentId}"}/pin</code>
              </h3>
              <p>Pin a comment (admin only).</p>
              <div class="card">
                <p><strong>Auth:</strong> Admin</p>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "data": { "id": "uuid", "is_pinned": true }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>401 Unauthorized</li>
                  <li>403 Forbidden</li>
                  <li>404 Comment not found</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>
                <code>{baseUrl}/api/comments/{"{commentId}"}/unpin</code>
              </h3>
              <p>Unpin a comment (admin only).</p>
              <div class="card">
                <p><strong>Auth:</strong> Admin</p>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "data": { "id": "uuid", "is_pinned": false }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>401 Unauthorized</li>
                  <li>403 Forbidden</li>
                  <li>404 Comment not found</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="reactions-api">
            <h2>Reactions</h2>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>
                <code>{baseUrl}/api/reactions/{"{postId}"}</code>
              </h3>
              <p>Get like/dislike counts for a post.</p>
              <div class="card">
                <p><strong>Auth:</strong> Public</p>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "data": { "post_id": "uuid", "likes": 10, "dislikes": 2, "total": 12 }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>404 Post not found</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>
                <code>{baseUrl}/api/reactions/{"{postId}"}/like</code>
              </h3>
              <p>Toggle a like reaction (authenticated users).</p>
              <div class="card">
                <p><strong>Auth:</strong> Authenticated user</p>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "data": { "reaction": "like", "counts": { "likes": 11, "dislikes": 2, "total": 13 } }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>401 Unauthorized</li>
                  <li>404 Post not found</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>
                <code>{baseUrl}/api/reactions/{"{postId}"}/dislike</code>
              </h3>
              <p>Toggle a dislike reaction (authenticated users).</p>
              <div class="card">
                <p><strong>Auth:</strong> Authenticated user</p>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "data": { "reaction": "dislike", "counts": { "likes": 10, "dislikes": 3, "total": 13 } }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>401 Unauthorized</li>
                  <li>404 Post not found</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>
                <code>{baseUrl}/api/reactions/user/{"{postId}"}</code>
              </h3>
              <p>Get the current user reaction for a post.</p>
              <div class="card">
                <p><strong>Auth:</strong> Authenticated user</p>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "data": { "reaction": "like" }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>401 Unauthorized</li>
                  <li>404 Post not found</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="cookies-api">
            <h2>Cookie Consent</h2>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>
                <code>{baseUrl}/api/cookies/consent</code>
              </h3>
              <p>Store GDPR/CCPA consent preferences.</p>
              <div class="card">
                <p><strong>Auth:</strong> Public (session_id required)</p>
                <h4>Request Body</h4>
                <pre><code>{`{
  "session_id": "uuid",
  "functional_cookies": true,
  "analytics_cookies": false,
  "marketing_cookies": false
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>400 Missing session_id</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="contact-api">
            <h2>Contact</h2>

            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-post">POST</span>
                <code>{baseUrl}/api/contact</code>
              </h3>
              <p>Submit a contact form message.</p>
              <div class="card">
                <p><strong>Auth:</strong> Public</p>
                <h4>Request Body</h4>
                <pre><code>{`{
  "nombre": "string (1-100 chars)",
  "correo": "valid email",
  "mensaje": "string (10-1000 chars)"
}`}</code></pre>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "message": "Contact form submitted successfully",
  "data": {
    "id": "uuid",
    "nombre": "Diego Botina",
    "correo": "test@example.com",
    "mensaje": "...",
    "created_at": "2023-10-27T10:00:00Z"
  }
}`}</code></pre>
                <h4>Errors</h4>
                <ul>
                  <li>400 Validation failed</li>
                  <li>429 Too Many Requests</li>
                  <li>500 Internal Server Error</li>
                </ul>
              </div>

              <TryItOut />
            </div>
          </section>

          <section id="health-api">
            <h2>Health</h2>
            <div class="endpoint-block mb-8">
              <h3>
                <span class="endpoint-badge badge-get">GET</span>
                <code>{baseUrl}/api/health</code>
              </h3>
              <p>Service health check for monitoring.</p>
              <div class="card">
                <p><strong>Auth:</strong> Public</p>
                <h4>Success Response</h4>
                <pre><code>{`{
  "success": true,
  "status": "ok",
  "timestamp": "2026-03-01T12:00:00Z"
}`}</code></pre>
              </div>
            </div>
          </section>

          <section id="errors">
            <h2>Error Handling</h2>
            <p>All API errors follow a consistent JSON format:</p>
            <pre><code>{`{
  "success": false,
  "error": "Error message description",
  "details": {
    "field_name": "Specific validation error"
  }
}`}</code></pre>

            <h4 class="mt-4">Common Status Codes</h4>
            <ul class="list-disc pl-5">
              <li><strong>400 Bad Request:</strong> Validation failed</li>
              <li><strong>401 Unauthorized:</strong> Missing or invalid token</li>
              <li><strong>403 Forbidden:</strong> Admin access required</li>
              <li><strong>404 Not Found:</strong> Resource missing</li>
              <li><strong>429 Too Many Requests:</strong> Rate limit exceeded</li>
              <li><strong>500 Internal Server Error:</strong> Unexpected server error</li>
            </ul>
          </section>
        </main>
      </div>
    </>
  );
}
