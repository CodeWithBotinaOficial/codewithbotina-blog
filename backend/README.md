# CodeWithBotina API Backend

![Deno](https://img.shields.io/badge/Deno-2.6.8-white?logo=deno&logoColor=black)
![Fresh](https://img.shields.io/badge/Fresh-1.7.3-lemon?logo=fresh&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue)

> Edge-deployed RESTful API for blog contact form submissions. Built with Deno,
> Fresh, Supabase, and Resend.

## 🚀 Overview

This backend serves as the serverless edge computing layer for the
**CodeWithBotina** technical blog. It handles dynamic functionality that cannot
be processed by the static frontend alone, primarily focusing on secure contact
form submissions, data persistence, and transactional email notifications.

Designed with a clean architecture approach, it separates concerns into
repositories, services, and controllers, ensuring maintainability and
scalability while running on the global Deno Deploy network.

## 📋 Features

- **Contact Form Processing**: Validates and sanitizes user input.
- **Data Persistence**: Securely stores submissions in PostgreSQL via Supabase.
- **Email Notifications**: Sends instant alerts via Resend API.
- **Security**:
  - CORS protection restricted to the blog domain.
  - Rate limiting to prevent abuse.
  - Input validation and sanitization.
- **Self-Documenting**: Interactive API documentation page at the root URL.
- **Health Monitoring**: Dedicated health check endpoint.
- **Edge Deployment**: Optimized for Deno Deploy's global edge network.

## 🏗️ Architecture

### Design Patterns

- **Repository Pattern**: Abstracts database operations
  (`repositories/contact.repository.ts`).
- **Service Layer Pattern**: Encapsulates business logic
  (`services/contact.service.ts`).
- **Dependency Injection**: Promotes testability and loose coupling.
- **Standardized Responses**: Consistent JSON response structure for success and
  errors.

### Tech Stack

- **Runtime**: [Deno](https://deno.com) (v2.6.8)
- **Framework**: [Fresh](https://fresh.deno.dev) (v1.7.3)
- **Database**: [Supabase](https://supabase.com) (PostgreSQL)
- **Email Service**: [Resend](https://resend.com)
- **Deployment**: [Deno Deploy](https://deno.com/deploy)

## 📁 Project Structure

```
backend/
├── lib/                    # Core libraries and configurations
│   ├── supabase.ts        # Supabase client with service role
│   ├── resend.ts          # Email service configuration
│   └── validation.ts      # Input validation schemas
├── middleware/            # Request interceptors
│   ├── cors.ts           # CORS validation middleware
│   └── rateLimit.ts      # Rate limiting middleware
├── repositories/          # Data access layer
│   └── contact.repository.ts
├── services/              # Business logic layer
│   ├── contact.service.ts
│   └── email.service.ts
├── routes/                # API endpoints and pages
│   ├── index.tsx         # API documentation page
│   └── api/
│       ├── contact.ts    # POST /api/contact endpoint
│       └── health.ts     # GET /api/health endpoint
├── islands/               # Interactive components
│   ├── TryItOut.tsx      # API testing form
│   └── StatusIndicator.tsx # Health status indicator
├── types/                 # TypeScript definitions
│   └── api.types.ts
├── utils/                 # Helper functions
│   ├── errors.ts         # Custom error classes
│   └── responses.ts      # Standardized API responses
├── static/                # Static assets
│   └── styles.css
└── deno.json              # Deno configuration
```

## 🛠️ Development Setup

### Prerequisites

- [Deno](https://deno.com/installation) installed (v1.40+)
- Supabase project created
- Resend account with verified domain

### Installation

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Configure Environment Variables:** Copy the example file and fill in your
   credentials.
   ```bash
   cp .env.example .env
   ```

3. **Install Dependencies:** Deno downloads dependencies on the first run, but
   you can cache them upfront:
   ```bash
   deno cache dev.ts
   ```

### Environment Variables

| Variable                    | Description                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `SUPABASE_URL`              | Your Supabase project URL                                                            |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (keep secret!)                                                      |
| `RESEND_API_KEY`            | API key from Resend dashboard                                                        |
| `RESEND_FROM_EMAIL`         | Verified sender email (e.g., `noreply@yourdomain.com`)                               |
| `RESEND_TO_EMAIL`           | Email address to receive notifications                                               |
| `ALLOWED_ORIGIN`            | Frontend origin (e.g., `http://localhost:4321` or `https://blog.codewithbotina.com`) |

### Running Locally

Start the development server with hot reloading:

```bash
deno task start
```

- **Documentation**: Open [http://localhost:8000](http://localhost:8000)
- **API Endpoint**: `http://localhost:8000/api/contact`

## 🧪 Testing

Run the test suite:

```bash
deno task check
```

_Note: Comprehensive unit tests are planned for future updates._

## 📡 API Endpoints

### POST `/api/contact`

Submit a new contact form message.

**Request Headers:**

- `Content-Type`: `application/json`
- `Origin`: Must match `ALLOWED_ORIGIN`

**Request Body:**

```json
{
  "nombre": "Diego Botina",
  "correo": "test@example.com",
  "mensaje": "Hello, this is a test message."
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "Contact form submitted successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombre": "Diego Botina",
    "correo": "test@example.com",
    "mensaje": "Hello, this is a test message.",
    "created_at": "2023-10-27T10:00:00Z"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Validation failed (missing fields, invalid email).
- `403 Forbidden`: CORS origin not allowed.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Database or email service failure.

### GET `/api/health`

Check the operational status of the API.

**Response (200 OK):**

```json
{
  "status": "ok",
  "timestamp": "2023-10-27T10:00:00.000Z"
}
```

## 🚢 Deployment

### Deno Deploy

This project is optimized for Deno Deploy.

1. **Install DeployCTL (Optional):**
   ```bash
   deno install --allow-all --no-check -r -f https://deno.land/x/deploy/deployctl.ts
   ```

2. **Deploy via CLI:**
   ```bash
   deployctl deploy --project=codewithbotina-api --prod main.ts
   ```

Alternatively, connect your GitHub repository to Deno Deploy for automatic
deployments.

### Production Environment Variables

Ensure the following variables are set in your Deno Deploy project settings:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_TO_EMAIL`
- `ALLOWED_ORIGIN` (Set to `https://blog.codewithbotina.com`)

## 🔐 Security

- **Service Role Keys**: Never exposed to the client; used only server-side.
- **CORS**: Strictly enforced to prevent unauthorized cross-origin requests.
- **Input Sanitization**: HTML tags and scripts are stripped from inputs to
  prevent XSS.
- **Rate Limiting**: Basic IP-based rate limiting is implemented to mitigate
  spam.

## 📚 Documentation

- **Local**: [http://localhost:8000](http://localhost:8000)
- **Production**:
  [https://api-codewithbotina.deno.dev](https://api-codewithbotina.deno.dev)

## 🤝 Contributing

This is a personal project, but suggestions are welcome!

- **Email**: [support@codewithbotina.com](mailto:support@codewithbotina.com)

## 📄 License

MIT License - see the [LICENSE](../LICENSE) file for details.

## 👤 Author

**Diego Alejandro Botina**

- Website: [blog.codewithbotina.com](https://blog.codewithbotina.com)
- Email: [support@codewithbotina.com](mailto:support@codewithbotina.com)

---

Made with ❤️ using **Deno** and **Fresh**.
