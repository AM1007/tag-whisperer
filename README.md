# Tag Whisperer

**GitHub Release Notification API** – subscribe to email alerts when your favorite repositories ship new versions.

🔗 **Live demo:** [tag-whisperer.onrender.com](https://tag-whisperer.onrender.com)
📘 **API docs:** [tag-whisperer.onrender.com/api-docs](https://tag-whisperer.onrender.com/api-docs)

![Subscription Form](docs/screenshots/01-subscription-form.png)

---

## What it does

Tag Whisperer monitors GitHub repositories for new releases and sends email notifications to subscribers. The entire flow – subscribing, confirming via email, scanning for releases, and notifying – runs as a single monolithic service.

**User flow:**

1. Enter a repository (`owner/repo`) and your email on the web form
2. Receive a confirmation email with a one-click link
3. Once confirmed, the scanner checks for new releases every 10 minutes
4. When a new release appears, you get an email with a direct link to the GitHub release page
5. Every notification includes an unsubscribe link

![Subscription Success](docs/screenshots/02-subscription-success.png)

---

## API Endpoints

Built to match the [Swagger specification](https://mykhailo-hrynko.github.io/se-school/task/swagger.yaml). Interactive documentation available at [`/api-docs`](https://tag-whisperer.onrender.com/api-docs).

![Swagger UI](docs/screenshots/14-swagger-ui.png)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/subscribe` | Subscribe to release notifications | API Key |
| `GET` | `/api/confirm/{token}` | Confirm subscription via email link | – |
| `GET` | `/api/unsubscribe/{token}` | Unsubscribe via email link | – |
| `GET` | `/api/subscriptions?email={email}` | List active subscriptions | API Key |
| `GET` | `/health` | Health check | – |
| `GET` | `/metrics` | Prometheus metrics | – |
| `GET` | `/api-docs` | Swagger UI documentation | – |

### Request & Response Examples

![API Request Tests](docs/screenshots/06-request-tests.png)

**Subscribe** (200 / 400 / 404 / 409):
```bash
curl -X POST https://tag-whisperer.onrender.com/api/subscribe \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{"email": "user@example.com", "repo": "facebook/react"}'
```

**List subscriptions:**
```bash
curl -H "X-API-Key: your-key" \
  "https://tag-whisperer.onrender.com/api/subscriptions?email=user@example.com"
```

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Node.js Server                     │
│                                                       │
│  ┌───────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │  REST API  │  │  gRPC API  │  │     Scanner     │  │
│  │  (Express) │  │ (:50051)  │  │   (10 min cron) │  │
│  └─────┬──────┘  └─────┬─────┘  └───────┬─────────┘  │
│        │               │                │             │
│  ┌─────┴───────────────┴────────────────┴──────────┐  │
│  │               Service Layer                      │  │
│  │  subscriptionService · githubService             │  │
│  │  emailService (Resend API)                       │  │
│  └─────┬───────────────┬────────────────┬──────────┘  │
│        │               │                │             │
│  ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴──────┐     │
│  │ PostgreSQL │   │   Redis   │   │ GitHub API │     │
│  │   (Neon)   │   │ (Upstash) │   │            │     │
│  └───────────┘   └───────────┘   └────────────┘     │
└──────────────────────────────────────────────────────┘
```

**Key design decisions:**

- **Repositories table separated from subscriptions** – one repo is scanned once for all its subscribers, avoiding redundant GitHub API calls
- **Redis caching** with 10-minute TTL on all GitHub API responses reduces rate limit consumption
- **Graceful degradation** – if Redis is unavailable, the service continues without caching
- **Scanner stops on 429** – when rate-limited, the entire scan halts instead of burning remaining quota
- **Transactions** in subscription creation – repo lookup + subscription insert are atomic
- **Dual API interface** – REST (Express) and gRPC run side by side, sharing the same service layer

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 22 |
| Framework | Express |
| Database | PostgreSQL (Neon) |
| Cache | Redis (Upstash) |
| Email | Resend (HTTP API) |
| API Docs | Swagger UI |
| RPC | gRPC (port 50051) |
| Tests | Vitest (19 tests) |
| Lint | ESLint |
| CI/CD | GitHub Actions |
| Hosting | Render |
| Monitoring | UptimeRobot |

---

## Database Schema

```sql
CREATE TABLE repositories (
  id SERIAL PRIMARY KEY,
  owner VARCHAR(255) NOT NULL,
  repo VARCHAR(255) NOT NULL,
  last_seen_tag VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(owner, repo)
);

CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  repository_id INTEGER REFERENCES repositories(id),
  confirmed BOOLEAN DEFAULT FALSE,
  confirm_token VARCHAR(255) NOT NULL,
  unsubscribe_token VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(email, repository_id)
);
```

Migrations run automatically on service startup (`CREATE TABLE IF NOT EXISTS`).

![Neon Database](docs/screenshots/13-neon-database.png)

---

## Getting Started

### Prerequisites

- Node.js 22+
- Docker & Docker Compose (for containerized setup)

### Local Development

```bash
git clone https://github.com/AM1007/tag-whisperer.git
cd tag-whisperer/backend
cp .env.example .env    # fill in your credentials
npm install
npm run dev             # starts with hot reload
```

### Docker

```bash
# From project root
docker-compose up --build
```

This spins up three containers: the app, PostgreSQL, and Redis. The API is available at `http://localhost:3000`.

![Docker Compose](docs/screenshots/08-docker-compose.png)

### Environment Variables

```env
PORT=3000
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
REDIS_URL=rediss://default:pass@host:6379
RESEND_API_KEY=re_xxxxxxxxxxxx # email delivery via Resend HTTP API
GITHUB_TOKEN=                  # optional, raises rate limit to 5000/hr
API_KEY=                       # optional, leave empty for public access
BASE_URL=https://your-domain.com
GRPC_PORT=50051                # optional, default 50051
```

---

## Features in Detail

### Email Notifications

Real emails delivered via [Resend](https://resend.com) HTTP API. Confirmation emails include a one-click confirm link. Release notifications include a GitHub release link and an unsubscribe link.

![Gmail Confirmation](docs/screenshots/03-gmail-confirmation.png)

### Confirmation & Unsubscribe Pages

Browser users see styled HTML pages instead of raw JSON. API consumers (curl, Postman) still receive JSON responses – the server checks the `Accept` header to decide.

| Confirmed | Unsubscribed | Error |
|-----------|-------------|-------|
| ![Confirm](docs/screenshots/05-confirm-page.png) | ![Unsubscribe](docs/screenshots/04-unsubscribe-page.png) | ![Error](docs/screenshots/05-error-page.png) |

### Redis Caching

All GitHub API responses are cached with a 10-minute TTL, reducing rate limit usage and improving response times. If Redis is unavailable, the service continues without caching.

![Redis Cache](docs/screenshots/10-redis-cache.png)

### API Key Authentication

Protected endpoints (`/api/subscribe`, `/api/subscriptions`) require an `X-API-Key` header. Authentication is optional – when `API_KEY` is not set, all endpoints are publicly accessible. Confirm and unsubscribe endpoints are always open since users access them via email links.

### Prometheus Metrics

`GET /metrics` exposes:

- `http_requests_total` – counter by method, route, status
- `http_request_duration_seconds` – histogram by method, route
- `active_subscriptions_total` – gauge of monitored repositories
- `scanner_runs_total` – counter by status (started/completed)
- Default Node.js metrics (CPU, memory, event loop, GC)

![Prometheus Metrics](docs/screenshots/12-prometheus-metrics.png)

### Release Scanner

Runs every 10 minutes via `setInterval`. Checks only repositories with confirmed subscriptions. Compares `tag_name` from GitHub's latest release API against `last_seen_tag` in the database. On mismatch – notifies all subscribers and updates the tag.

Rate limit handling: on HTTP 429, the scanner stops immediately and resumes at the next interval.

### gRPC Interface

Available on port `50051` as an alternative to REST API. Both interfaces share the same service layer and database.

**Supported methods:**

| gRPC Method | REST Equivalent |
|-------------|----------------|
| `Subscribe` | `POST /api/subscribe` |
| `Confirm` | `GET /api/confirm/{token}` |
| `Unsubscribe` | `GET /api/unsubscribe/{token}` |
| `GetSubscriptions` | `GET /api/subscriptions?email=` |

Proto file: `backend/src/grpc/subscription.proto`

### GitHub API Rate Limit Handling

- Without token: 60 requests/hour
- With `GITHUB_TOKEN`: 5,000 requests/hour
- HTTP 403/429 responses trigger an error with `retryAfter` from response headers
- Scanner halts on rate limit; individual subscription failures don't block others

---

## Testing

```bash
cd backend
npm test
```

19 unit tests covering validation logic, token generation, and scanner behavior.

![Unit Tests](docs/screenshots/07-unit-tests.png)

### CI Pipeline

Lint and tests run on every push to `main` via GitHub Actions.

![CI GitHub Actions](docs/screenshots/09-ci-github-actions.png)

---

## Project Structure

```
tag-whisperer/
├── docker-compose.yml
├── .github/workflows/ci.yml
├── backend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── index.js              entry point (Express + gRPC)
│   │   ├── config/               db, redis, metrics
│   │   ├── controllers/          REST request handlers
│   │   ├── db/migrations/        SQL schema
│   │   ├── grpc/                 proto file + gRPC server
│   │   ├── middleware/           apiKey, metricsMiddleware
│   │   ├── routes/               Express routers
│   │   ├── scanner/              release polling logic
│   │   ├── services/             business logic layer
│   │   ├── utils/                validation, token generation
│   │   └── public/               HTML pages (form, results)
│   └── tests/                    unit tests + gRPC test client
└── docs/screenshots/             README screenshots
```

---

## Deployment

Hosted on [Render](https://render.com) (free tier) with:

- **Database:** [Neon](https://neon.tech) – serverless PostgreSQL, fast cold start
- **Cache:** [Upstash](https://upstash.com) – serverless Redis with TLS
- **Email:** [Resend](https://resend.com) – HTTP-based email delivery (no SMTP needed)
- **Monitoring:** [UptimeRobot](https://uptimerobot.com) – pings `/health` every 5 minutes to prevent cold starts

---

## Checklist

### Mandatory Requirements

- [x] API matches Swagger specification (4 endpoints, correct status codes)
- [x] Monolith architecture (API + Scanner + Notifier)
- [x] PostgreSQL with migrations on startup
- [x] Dockerfile + docker-compose.yml
- [x] Release scanner with `last_seen_tag` tracking
- [x] GitHub repo validation via API (404/400 handling)
- [x] Rate limit handling (429 with retry logic)
- [x] Express framework (thin, allowed)
- [x] Unit tests (19 tests, Vitest)
- [x] README with architecture documentation

### Bonus Features

- [x] Deployed to Render + HTML subscription page
- [x] gRPC interface (port 50051)
- [x] Redis caching (TTL 10 min)
- [x] API key authentication
- [x] Prometheus metrics (`/metrics`)
- [x] GitHub Actions CI (lint + tests on push)

---

## License

MIT