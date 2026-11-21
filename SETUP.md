# CertiFlow – Setup & Installation Guide

This guide walks you through setting up, configuring, running, and testing the **CertiFlow** platform on a fresh developer machine.

---

## 1. Prerequisites & Required Software

Make sure the following tools are installed on your workstation:

| Software | Minimum Version | Verification Command |
| :--- | :--- | :--- |
| **Node.js** | v20.x or v22.x LTS | `node -v` |
| **npm** | v10.x or later | `npm -v` |
| **Docker Desktop** | Latest (Windows with WSL2 backend) | `docker -v` |
| **Docker Compose** | v2.20+ or v5+ | `docker-compose -v` |

---

## 2. Environment Configuration

CertiFlow uses environment files for database strings, Redis ports, JWT secrets, and workflow thresholds.

From the project root:

```bash
# Copy root environment file
cp .env.example .env

# Copy backend environment file
cp .env.example backend/.env
```

### Environment Variables Reference

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `PORT` | `5000` | Port for Express backend API |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin and base URL for verification links |
| `DATABASE_URL` | `postgresql://certiflow_user:certiflow_password@localhost:5432/certiflow?schema=public` | PostgreSQL connection string |
| `REDIS_HOST` | `localhost` (in Docker: `redis`) | Redis hostname for BullMQ queues |
| `REDIS_PORT` | `6379` | Redis TCP port |
| `JWT_SECRET` | `certiflow_super_secret_jwt_key_pragati_skills_2026` | Symmetric key for signing JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `QUALITY_REVIEW_THRESHOLD` | `50` | Candidate count requiring Quality Review team scrutiny |
| `DELAYED_BATCH_THRESHOLD_HOURS` | `24` | Hours of inaction before delayed SLA alert triggers |

---

## 3. Option A: Running via Docker Compose (Recommended)

Docker Compose starts all 5 platform services with health checks and persistent storage:

```bash
# From the project root c:\Certiflow
docker-compose up -d --build
```

### Services Started:
1. `certiflow_postgres` (Port 5432) – PostgreSQL 16 database.
2. `certiflow_redis` (Port 6379) – Redis 7 instance for BullMQ background queues.
3. `certiflow_backend` (Port 5000) – Express.js API server.
4. `certiflow_worker` – Dedicated BullMQ worker for async PDF generation and WhatsApp delivery.
5. `certiflow_frontend` (Port 5173) – Nginx serving production-built React SPA.

### Viewing Service Logs:
```bash
# View backend API logs
docker-compose logs -f backend

# View worker processing logs
docker-compose logs -f worker
```

### Stopping Services:
```bash
docker-compose down
```

---

## 4. Option B: Running Locally on Windows Host

If you wish to run the Node.js server and Vite dev server directly on your host machine while using Docker for PostgreSQL and Redis:

### Step 1: Start PostgreSQL and Redis Containers
```bash
docker-compose up -d postgres redis
```

### Step 2: Install Backend Dependencies & Run Database Migrations
```bash
cd backend
npm install

# Push schema to PostgreSQL and generate Prisma client
npx prisma db push

# Seed database with demo accounts, districts, and cohorts
node prisma/seed.js
```

### Step 3: Start the Backend API Server
```bash
# Starts Express API on http://localhost:5000
npm start
# Or with auto-reload:
npm run dev
```

### Step 4: Start the Background Worker Process
Open a second terminal:
```bash
cd backend
npm run worker
```

### Step 5: Start the Frontend Vite Development Server
Open a third terminal:
```bash
cd frontend
npm install
npm run dev
```
Access the frontend at [http://localhost:5173](http://localhost:5173).

---

## 5. Running Automated Tests

CertiFlow includes a complete Jest test suite covering all mandatory evaluation criteria:

```bash
cd backend
npm test
```

To run individual test suites:
```bash
# Test atomic spreadsheet validation (TEST 1)
npx jest tests/spreadsheet.test.js

# Test dual district officer concurrency (TEST 2)
npx jest tests/concurrentApproval.test.js

# Test certificate generation and revocation (TEST 3 & 4)
npx jest tests/certificates.test.js

# Test delayed batch SLA detection (TEST 5)
npx jest tests/delayedBatch.test.js

# Test return and resubmission cycle increment (TEST 6)
npx jest tests/resubmission.test.js

# Test role-based authorization guards (TEST 7)
npx jest tests/authorization.test.js

# Test worker reliability and simulated WhatsApp (TEST 8)
npx jest tests/workerReliability.test.js
```

---

## 6. Troubleshooting Common Issues

### Issue: "Port 5432 or 6379 already in use"
- **Cause:** Another local PostgreSQL or Redis service is running on the host.
- **Fix:** Stop the existing service using Windows Services (`services.msc`) or change the host port mapping in `docker-compose.yml` (e.g. `"5433:5432"`).

### Issue: "Can't reach database server at localhost:5432"
- **Cause:** PostgreSQL container has not completed initialization yet.
- **Fix:** Verify container status with `docker ps`. Wait 5 seconds for healthcheck to pass, or re-run `docker-compose up -d postgres`.

### Issue: "Certificate PDF missing on storage server"
- **Cause:** Certificate directory permissions or volume mount not bound.
- **Fix:** CertiFlow automatically creates `backend/certificates/` on startup. Ensure write permissions exist on the directory.
