# CodeWithBotina API Backend

[![Deno Version](https://img.shields.io/badge/deno-2.6.8-black?logo=deno)](https://deno.land)
[![Fresh Version](https://img.shields.io/badge/fresh-1.7.3-yellow)](https://fresh.deno.dev)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](../LICENSE)
[![Deployment](https://img.shields.io/badge/deployed-Deno%20Deploy-black)](https://api.codewithbotina.com)

> Edge-deployed RESTful API for blog contact form submissions and backend
> services.\
> Built with Deno, Fresh, Supabase, and Resend.

**Live API:** [api.codewithbotina.com](https://api.codewithbotina.com)\
**Main Blog:** [blog.codewithbotina.com](https://blog.codewithbotina.com)

## ✨ Features

- 📬 Contact form submission handling with validation
- 📧 Email notifications via Resend
- 📝 Post creation, update, delete, and slug validation
- 📃 Post listing and single-post fetch with language filters
- 🏷️ Tag system (suggest, autocomplete, create, tag → posts)
- 💬 Comments with admin pinning and moderation
- 👍👎 Reactions (like/dislike) with user tracking
- 🔐 Auth endpoints (Google OAuth, session refresh, sign-out)
- 🍪 Cookie consent tracking endpoint
- 🖼️ Image upload endpoint for Supabase Storage
- 💾 PostgreSQL data persistence via Supabase
- 🔒 CORS protection and origin validation
- ⏱️ Rate limiting to prevent abuse
- 📚 Self-hosted interactive API documentation
- 🏥 Health check endpoint for monitoring
- 🌍 Edge computing deployment (global CDN)
- 🔐 Row Level Security (RLS) for data protection

## 🏗️ Architecture

### Design Patterns

- **Repository Pattern:** Data access abstraction layer
- **Service Layer Pattern:** Business logic separation from HTTP handlers
- **Dependency Injection:** Explicit dependencies for testability
- **Centralized Error Handling:** Consistent error responses across all
  endpoints

### Tech Stack

| Component     | Technology             | Version      |
| ------------- | ---------------------- | ------------ |
| Runtime       | Deno                   | 2.6.8        |
| Framework     | Fresh                  | 1.7.3        |
| Database      | PostgreSQL (Supabase)  | Latest       |
| Email Service | Resend API             | v1           |
| Deployment    | Deno Deploy            | Edge Runtime |
| Domain        | api.codewithbotina.com | -            |

### Request Flow

```
Client (blog.codewithbotina.com)
    ↓
CORS Middleware (validate origin)
    ↓
Rate Limit Middleware (check IP limits)
    ↓
Route Handler (/api/contact)
    ↓
Service Layer (business logic)
    ↓
Repository Layer (database operations)
    ↓
Supabase (data persistence) + Resend (email notification)
```

## 📁 Project Structure

```
backend/
├── lib/                      # Core libraries and configurations
│   ├── supabase.ts          # Supabase client (service role key)
│   ├── resend.ts            # Resend email client configuration
│   └── validation.ts        # Input validation schemas
│
├── middleware/              # Request interceptors
│   ├── cors.ts             # CORS validation (allows blog.codewithbotina.com)
│   └── rateLimit.ts        # Rate limiting (100 req/hour per IP)
│
├── repositories/            # Data access layer (Repository pattern)
│   └── contact.repository.ts # Contact data persistence
│
├── services/                # Business logic layer
│   ├── contact.service.ts  # Contact form processing orchestration
│   └── email.service.ts    # Email notification service
│
├── routes/                  # Fresh routes (HTTP handlers)
│   ├── index.tsx           # API documentation page
│   ├── _app.tsx            # Fresh app wrapper
│   ├── _404.tsx            # 404 error page
│   └── api/
│       ├── auth/                  # Google OAuth, session, signout
│       ├── posts/                 # create/update/delete/exists/tags
│       ├── tags/                  # suggest/autocomplete/create
│       ├── comments/              # create/update/delete/pin
│       ├── reactions/             # like/dislike counters
│       ├── cookies/consent.ts     # consent tracking
│       ├── contact.ts             # POST /api/contact endpoint
│       └── health.ts              # GET /api/health endpoint
│
├── islands/                 # Interactive Preact components
│   ├── TryItOut.tsx        # API testing form (documentation page)
│   └── StatusIndicator.tsx # Real-time health status indicator
│
├── types/                   # TypeScript type definitions
│   └── api.types.ts        # API contracts and interfaces
│
├── utils/                   # Helper functions
│   ├── errors.ts           # Custom error classes with HTTP codes
│   └── responses.ts        # Standardized API response builders
│
├── static/                  # Static assets for documentation page
│   ├── favicon.ico
│   └── styles.css
│
├── deno.json                # Deno configuration and dependencies
├── .env.example             # Environment variables template
├── fresh.config.ts          # Fresh framework configuration
└── README.md                # This file
```

## 🛠️ Development Setup

### Prerequisites

- [Deno](https://deno.land) 2.6+ installed
- Supabase account with project created
- Resend account with verified domain (codewithbotina.com)
- Code editor (VS Code recommended with Deno extension)

### Local Installation

1. **Clone the repository:**

```bash
git clone https://github.com/yourusername/codewithbotina-blog.git
cd codewithbotina-blog/backend
```

2. **Configure environment variables:**

```bash
cp .env.example .env
nano .env  # Edit with your credentials
```

3. **Install dependencies (automatic via Deno):**

```bash
deno cache dev.ts
```

4. **Run development server:**

```bash
deno task start
```

5. **Access locally:**

- API Documentation: http://localhost:8000
- Health Check: http://localhost:8000/api/health
- Contact Endpoint: http://localhost:8000/api/contact

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```bash
# Supabase Configuration (get from Supabase Dashboard → Settings → API)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret_key_here

# Resend Email Service (get from Resend Dashboard → API Keys)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@codewithbotina.com
RESEND_TO_EMAIL=support@codewithbotina.com

# CORS Configuration
ALLOWED_ORIGIN=https://blog.codewithbotina.com

# Optional: For local development
# ALLOWED_ORIGIN=http://localhost:4321
```

⚠️ **Security Note:** Never commit the `.env` file to version control. Use
`.env.example` as a template.

## 📡 API Endpoints

### Base URL

- **Production:** `https://api.codewithbotina.com`
- **Development:** `http://localhost:8000`

### Post Endpoints

- `GET /api/posts` (optional `language`, `limit`, `offset`)
- `GET /api/posts/:slug` (optional `language`, includes tags)

### Endpoints

#### POST /api/contact

Submit contact form data from the blog.

**Authentication:** None (CORS-protected)

**Headers:**

```http
Content-Type: application/json
Origin: https://blog.codewithbotina.com
```

**Request Body:**

```json
{
  "nombre": "string (1-100 characters, required)",
  "correo": "string (valid email, required)",
  "mensaje": "string (10-1000 characters, required)"
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "Contact form submitted successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Error Responses:**

| Status | Error                 | Description                      |
| ------ | --------------------- | -------------------------------- |
| 400    | Validation failed     | Invalid input data (see details) |
| 403    | CORS violation        | Request origin not allowed       |
| 405    | Method not allowed    | Only POST accepted               |
| 429    | Rate limit exceeded   | Too many requests from IP        |
| 500    | Internal server error | Server-side error occurred       |

**Error Response Format:**

```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "correo": "Invalid email format"
  }
}
```

### Additional Endpoints (Summary)

- **Auth:** `GET /api/auth/google`, `GET /api/auth/callback`, `GET /api/auth/me`,
  `POST /api/auth/refresh`, `POST /api/auth/signout`
- **Posts:** `POST /api/posts/create`, `PUT /api/posts/:slug/update`,
  `DELETE /api/posts/:slug/delete`, `GET /api/posts/:slug/exists`,
  `POST /api/posts/upload-image`
- **Tags:** `GET /api/tags`, `GET /api/tags/:slug`, `POST /api/tags/suggest`,
  `GET /api/tags/autocomplete`, `POST /api/tags/create`,
  `GET /api/posts/:slug/tags`
- **Comments:** `POST /api/comments`, `PUT /api/comments/:commentId`,
  `DELETE /api/comments/:commentId`, `POST /api/comments/:commentId/pin`,
  `POST /api/comments/:commentId/unpin`
- **Reactions:** `GET /api/reactions/:postId`, `POST /api/reactions/:postId/like`,
  `POST /api/reactions/:postId/dislike`, `GET /api/reactions/user/:postId`
- **Cookies:** `POST /api/cookies/consent`

**Example (cURL):**

```bash
curl -X POST https://api.codewithbotina.com/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: https://blog.codewithbotina.com" \
  -d '{
    "nombre": "Diego Botina",
    "correo": "test@example.com",
    "mensaje": "Hello from the API documentation!"
  }'
```

**Example (JavaScript/Fetch):**

```javascript
const response = await fetch("https://api.codewithbotina.com/api/contact", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    nombre: "Diego Botina",
    correo: "test@example.com",
    mensaje: "Hello from JavaScript!",
  }),
});

const result = await response.json();
console.log(result);
```

---

#### GET /api/health

Health check endpoint for monitoring and uptime checks.

**Authentication:** None

**Success Response (200 OK):**

```json
{
  "status": "ok",
  "timestamp": "2026-02-05T22:30:00.000Z",
  "version": "1.0.0"
}
```

**Example (cURL):**

```bash
curl https://api.codewithbotina.com/api/health
```

---

## Post Management API

Admin-only endpoints for managing blog posts.

**Authorization:**
All endpoints require a valid access token and the user must exist in the
`admin_users` table.

**Endpoints:**
- `POST /api/posts/create` - Create a new post
- `PUT /api/posts/:slug/update` - Update an existing post
- `DELETE /api/posts/:slug/delete` - Delete a post (requires `confirm=true`)
- `GET /api/posts/:slug/exists` - Check slug uniqueness
- `POST /api/posts/upload-image` - Upload featured image (multipart/form-data)
- `GET /api/posts/:slug/tags` - Fetch tags for a post

**Payload notes:**
- `language` is required for bilingual posts (`en`/`es`).
- `tag_ids` accepts an array of tag UUIDs and drives the many-to-many
  `post_tags` junction table.

**Delete confirmation flow:**
1. Call `DELETE /api/posts/:slug/delete` without `confirm=true` to retrieve
   comment/reaction counts.
2. Call the same endpoint with `confirm=true` to delete.

## 🧪 Testing

### Run Tests

```bash
# Run all tests
deno task test

# Run tests with coverage
deno task test:coverage

# Run tests in watch mode
deno task test:watch

# Type checking only
deno task check
```

### Manual Testing

1. **Test health endpoint:**

```bash
curl https://api.codewithbotina.com/api/health
```

2. **Test contact endpoint locally:**

```bash
curl -X POST http://localhost:8000/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:4321" \
  -d '{
    "nombre": "Test User",
    "correo": "test@example.com",
    "mensaje": "This is a test message"
  }'
```

3. **Verify email delivery:** Check `support@codewithbotina.com` inbox for
   notification.

4. **Verify database persistence:** Check Supabase Dashboard → Table Editor →
   contacts

## 🚢 Deployment to Deno Deploy

### Prerequisites

- Deno Deploy account (sign up at https://deno.com/deploy)
- GitHub repository connected to Deno Deploy
- Custom domain configured (api.codewithbotina.com)

### Deployment Steps

1. **Create project in Deno Deploy:**
   - Go to https://dash.deno.com/projects
   - Click "New Project"
   - Connect your GitHub repository
   - Select the `backend` directory as the root
   - Set entry point: `main.ts`

2. **Configure environment variables:** In Deno Deploy Dashboard → Settings →
   Environment Variables, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `RESEND_TO_EMAIL`
   - `ALLOWED_ORIGIN` = `https://blog.codewithbotina.com`

3. **Configure custom domain:**
   - Deno Deploy Dashboard → Settings → Domains
   - Add domain: `api.codewithbotina.com`
   - Deno will provide a CNAME record
   - Add to Cloudflare DNS (see below)

4. **Configure Cloudflare DNS:**
   - Type: `CNAME`
   - Name: `api`
   - Target: `your-project.deno.dev`
   - Proxy status: **DNS only** (gray cloud)
   - TTL: Auto

5. **Deploy:**

```bash
git push origin main
```

Deno Deploy will automatically build and deploy.

6. **Verify deployment:**

```bash
curl https://api.codewithbotina.com/api/health
```

### Continuous Deployment

Every push to the `main` branch automatically triggers a new deployment. Monitor
deployments in the Deno Deploy dashboard.

### Rollback

If a deployment fails, use Deno Deploy's dashboard to rollback to a previous
deployment.

## 🔐 Security

### Implemented Security Measures

1. **CORS Protection:**
   - Only `blog.codewithbotina.com` can make API requests
   - Prevents cross-origin attacks

2. **Rate Limiting:**
   - 100 requests per hour per IP address
   - Prevents spam and DoS attacks

3. **Input Validation:**
   - All inputs sanitized to prevent XSS attacks
   - Email format validation
   - String length limits enforced

4. **Row Level Security (RLS):**
   - Database access controlled by Supabase policies
   - Service role key required for writes

5. **Environment Variables:**
   - All sensitive keys stored in Deno Deploy (never in code)
   - `.env` file excluded from version control

6. **HTTPS Only:**
   - All traffic encrypted via TLS
   - Automatic certificate management

### Security Best Practices

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code
- Rotate API keys regularly (every 90 days)
- Monitor Deno Deploy logs for suspicious activity
- Keep dependencies updated (`deno task update`)

## 📊 Monitoring

### Health Checks

Use the `/api/health` endpoint for uptime monitoring:

- UptimeRobot: https://uptimerobot.com
- Better Uptime: https://betteruptime.com
- Pingdom: https://pingdom.com

### Logs

Access logs in Deno Deploy Dashboard → Logs tab.

### Common Issues

**Issue:** CORS error when calling from frontend

- **Solution:** Verify `ALLOWED_ORIGIN` environment variable is set to
  `https://blog.codewithbotina.com`
- **Check:** Ensure request includes `Origin` header

**Issue:** Rate limit errors (429)

- **Solution:** Wait 1 hour or contact admin to reset limits
- **Prevention:** Implement retry logic with exponential backoff

**Issue:** Email not sending

- **Solution:** Verify Resend API key is valid
- **Check:** Resend dashboard for failed deliveries
- **Verify:** Domain `codewithbotina.com` is verified in Resend

**Issue:** Database connection errors

- **Solution:** Verify Supabase URL and service key
- **Check:** Supabase project is active (not paused)
- **Verify:** RLS policies allow service role access

**Issue:** 500 Internal Server Error

- **Solution:** Check Deno Deploy logs for stack traces
- **Debug:** Enable additional logging in production

## 🤝 Contributing

This is a personal project, but feedback and suggestions are welcome!

- **Email:** support@codewithbotina.com
- **Issues:** GitHub Issues (if public repository)

## 📄 License

MIT License - see [LICENSE](../LICENSE) file for details.

Copyright (c) 2026 CodeWithBotina Official

## 👤 Author

**Diego Alejandro Botina**

- Website: [blog.codewithbotina.com](https://blog.codewithbotina.com)
- Email: support@codewithbotina.com
- API Docs: [api.codewithbotina.com](https://api.codewithbotina.com)

---

**Built with ❤️ using Deno and Fresh**

Deployed on [Deno Deploy](https://deno.com/deploy) - The edge runtime for
JavaScript and TypeScript
