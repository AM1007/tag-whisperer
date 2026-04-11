# Tag Whisperer

**GitHub Release Notification API** – subscribe to email alerts when your favorite repositories ship new versions.

🔗 **Live demo:** [tag-whisperer.onrender.com](https://tag-whisperer.onrender.com)

![Subscription Form](docs/screenshots/01-subscription-form.png)

---

## What it does

Tag Whisperer monitors GitHub repositories for new releases and sends email notifications to subscribers. The entire flow – subscribing, confirming via email, scanning for releases, and notifying – runs as a single monolithic service.

**User flow:**

1. Enter a repository (`owner/repo`) and email on the web form
2. Receive a confirmation email with a one-click link
3. Once confirmed, the scanner checks for new releases every 10 minutes
4. When a new release appears, you get an email with a direct link to the GitHub release page
5. Every notification includes an unsubscribe link

---

## API Endpoints

Built to match the [Swagger specification](https://mykhailo-hrynko.github.io/se-school/task/swagger.yaml) – no contract modifications.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/subscribe` | Subscribe to release notifications | API Key |
| `GET` | `/api/confirm/{token}` | Confirm subscription via email link | – |
| `GET` | `/api/unsubscribe/{token}` | Unsubscribe via email link | – |
| `GET` | `/api/subscriptions?email={email}` | List active subscriptions | API Key |
| `GET` | `/health` | Health check | – |
| `GET` | `/metrics` | Prometheus metrics | – |

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
┌─────────────────────────────────────────────────┐
│                   Express Server                 │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Routes   │  │ Scanner  │  │   Notifier    │  │
│  │ (REST API)│  │ (10 min) │  │  (Nodemailer) │  │
│  └────┬──────┘  └────┬─────┘  └───────┬───────┘  │
│       │              │                │           │
│  ┌────┴──────────────┴────────────────┴────────┐ │
│  │            Service Layer                     │ │
│  │  subscriptionService · githubService         │ │
│  │  emailService                                │ │
│  └────┬──────────────┬────────────────┬────────┘ │
│       │              │                │           │
│  ┌────┴────┐   ┌─────┴─────┐   ┌─────┴─────┐    │
│  │ PostgreSQL│  │   Redis   │   │ GitHub API│    │
│  │  (Neon)  │  │ (Upstash) │   │           │    │
│  └──────────┘  └───────────┘   └───────────┘    │
└─────────────────────────────────────────────────┘
```

**Key design decisions:**

- **Repositories table separated from subscriptions** – one repo is scanned once for all its subscribers, avoiding redundant GitHub API calls
- **Redis caching** with 10-minute TTL on all GitHub API responses reduces rate limit consumption
- **Graceful degradation** – if Redis is unavailable, the service continues without caching
- **Scanner stops on 429** – when rate-limited, the entire scan halts instead of burning remaining quota
- **Transactions** in subscription creation – repo lookup + subscription insert are atomic

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 22 |
| Framework | Express |
| Database | PostgreSQL (Neon) |
| Cache | Redis (Upstash) |
| Email | Resend (HTTP API) |
| Tests | Vitest |
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
GITHUB_TOKEN=                  # optional, raises rate limit to 5000/hr
RESEND_API_KEY=re_xxxxxxxxxxxx
API_KEY=                       # optional, leave empty for public access
BASE_URL=https://your-domain.com
```

---

## Features in Detail

### Email Notifications

Real emails delivered via Gmail SMTP. Confirmation and release notification templates include direct action links.

![Gmail Confirmation](docs/screenshots/03-gmail-confirmation.png)

![Release Notification](docs/screenshots/11-release-notification.png)

### Confirmation & Unsubscribe Pages

Browser users see styled HTML pages instead of raw JSON. API consumers (curl, Postman) still receive JSON – the server checks the `Accept` header.

| Confirmed | Unsubscribed | Error |
|-----------|-------------|-------|
| ![Confirm](docs/screenshots/05-confirm-page.png) | ![Unsubscribe](docs/screenshots/04-unsubscribe-page.png) | ![Error](docs/screenshots/05-error-page.png) |

### Redis Caching

All GitHub API responses are cached with a 10-minute TTL, reducing rate limit usage and improving response times.

![Redis Cache](docs/screenshots/10-redis-cache.png)

### API Key Authentication

Protected endpoints require an `X-API-Key` header. Authentication is optional – when `API_KEY` is not set, all endpoints are publicly accessible. Confirm and unsubscribe endpoints are always open (users click links from email).

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
│   │   ├── index.js
│   │   ├── config/        (db, redis, metrics)
│   │   ├── controllers/   (request handlers)
│   │   ├── db/migrations/ (SQL schema)
│   │   ├── middleware/     (apiKey, metricsMiddleware)
│   │   ├── routes/        (Express routers)
│   │   ├── scanner/       (release polling)
│   │   ├── services/      (business logic)
│   │   ├── utils/         (validation, tokens)
│   │   └── public/        (HTML pages)
│   └── tests/
└── frontend/              (reserved)
```

---

## Deployment

Hosted on [Render](https://render.com) (free tier) with:

- **Database:** [Neon](https://neon.tech) – serverless PostgreSQL, fast cold start
- **Cache:** [Upstash](https://upstash.com) – serverless Redis with TLS
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
- [x] Redis caching (TTL 10 min)
- [x] API key authentication
- [x] Prometheus metrics (`/metrics`)
- [x] GitHub Actions CI (lint + tests on push)
- [ ] gRPC interface

---

## License

MIT