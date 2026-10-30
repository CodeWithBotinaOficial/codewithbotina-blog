# Performance Optimizations

Applied in branch: `feature/perf-refactor-e2e`

## 1. Client-Side Search (#1)

Public reader search queries published posts through the frontend Supabase
client, bypassing the Deno API. Admin search remains on the backend so it can
include drafts and scheduled posts.

**Impact:** Public search requests no longer use backend CPU.

## 2. Post API Projections (#2)

`GET /api/posts` returns the metadata needed for post lists without the `body`
field. `GET /api/posts/[slug]` continues to return the complete post.

**Impact:** Reduces Supabase data transfer and JSON payload size for paginated
post lists.

## 3. Cache-Control Headers (#3)

The backend applies Cache-Control policies to eligible GET responses:

- `/api/tags`: 5 minutes
- `/api/posts` list: 1 minute
- Published `/api/posts/[slug]` detail: 2 minutes
- `/api/reactions`: 30 seconds
- Search endpoints: 30 seconds
- Poll results: 1 minute
- Auth, admin, user, scheduled-publishing, and credentialed requests: `no-store`
- Health checks: `no-cache`

Mutation methods do not receive caching directives. Post detail responses set
their own policy based on publication status. Cloudflare Pages also has caching
rules for fingerprinted static assets and locale files.

**Impact:** Cache-aware clients and intermediaries can reuse eligible public
responses, reducing repeated backend work.

## 4. In-Flight Request Deduplication (#4)

Concurrent identical GET requests through the frontend API wrapper share a
single pending network request. Each caller receives a cloned response, so
callers can independently consume the response body. Mutations and requests
with a body, an abort signal, or an explicit Authorization header bypass
deduplication.

**Impact:** Reduces redundant backend calls when multiple islands request the
same resource simultaneously.

## 5. Supabase Connection Pooling (#5)

The backend uses `createClient` from `supabase-js`, which communicates with
Supabase over HTTP/REST (PostgREST), not through direct PostgreSQL connections.
The application therefore does not need a PostgreSQL pooler URL. Supabase
manages HTTP connection handling on its infrastructure; pgBouncer applies to
PostgreSQL connections and is not applicable to this client.

No connection configuration was changed. If direct PostgreSQL queries are
introduced later, use a Supabase pooler connection URL for runtime access.
