# TraceGraphAI — Graph Intelligence & Outage Simulation Platform

TraceGraphAI is a microservices dependency graph intelligence and incident simulation platform. Built for engineering teams, SREs, and architects, it visualizes complex service topologies in real time using **FalkorDB**, calculates heuristic service risk scores, performs blast radius failure simulations, and grounds an AI incident copilot in graph evidence.

---

## 1. System Architecture & Tech Stack

```
                     ┌──────────────────────────────────────────────┐
                     │          React + TypeScript Frontend         │
                     │          (@xyflow/react + Vite SPA)          │
                     └───────────────────────┬──────────────────────┘
                                             │ REST API (JSON)
                                             ▼
                     ┌──────────────────────────────────────────────┐
                     │           Spring Boot Backend (Java 21)      │
                     │           Maven + WebMVC + Actuator          │
                     └───────────────┬──────────────┬───────────────┘
                                     │              │
                   Cypher Queries    │              │ HTTP REST
                  (jfalkordb / jedis)│              │ (Ollama / OpenAI API)
                                     ▼              ▼
                     ┌──────────────────────┐  ┌────────────────────┐
                     │      FalkorDB        │  │ AI Incident Copilot│
                     │ (Graph DB on Redis)  │  │(llama3.2:3b / Groq)│
                     └──────────────────────┘  └────────────────────┘
```

### Technology Highlights
- **Frontend**: React 19, TypeScript 5.9, `@xyflow/react` (v12), Vite 8, Vanilla CSS design system.
- **Backend**: Spring Boot 4.1.1, Java 21, Maven, `com.falkordb:jfalkordb` (0.13.0), Spring WebClient / RestClient.
- **Graph Database**: FalkorDB (Redis graph database module) running Cypher graph queries.
- **AI Copilot**: Local Ollama running `llama3.2:3b` (development) or configurable OpenAI/Groq-compatible cloud inference endpoint (production).

---

## 2. Complete TypeScript / TSX Migration

The frontend was migrated from JavaScript/JSX to strictly typed TypeScript/TSX:
- **Strict Domain Models** (`src/types/index.ts`): Explicit interfaces for service nodes, dependency relationships, criticality bands, risk metrics, blast radius impact trees, and AI payload structures.
- **Central Typed API Client** (`src/api.ts`): Reusable, fully typed HTTP communication with automatic base URL detection via `VITE_API_BASE_URL`.
- **Custom React Flow Components** (`src/components/ServiceNode.tsx`, `src/components/GraphCanvas.tsx`): Fully typed custom nodes with automatic hierarchical graph layout (`src/utils/graphLayout.ts`).
- **Interactive UI Components**: Fully typed sidebar, top navigation, incident copilot, blast radius impact panel, and architecture overview dashboard.
- **Build Verification**: `npm run build` runs `tsc && vite build` with strict checking and zero errors.

---

## 3. Demo Microservices Architecture

TraceGraphAI comes seeded with a realistic 17-service e-commerce microservices architecture:

### Service Inventory
| Category | Service Name | Criticality | Role & Description |
| :--- | :--- | :---: | :--- |
| **Customer-Facing** | `frontend-service` | `high` | Customer web client & SPA UI |
| **Customer-Facing** | `api-gateway` | `high` | Ingress router, rate limiter & reverse proxy |
| **Customer-Facing** | `authentication-service` | `high` | JWT authentication, RBAC & security tokens |
| **Customer-Facing** | `user-service` | `medium` | User profiles, account settings & preferences |
| **Business** | `product-service` | `medium` | Product catalog, pricing & inventory metadata |
| **Business** | `inventory-service` | `high` | Real-time warehouse stock tracking & reservation |
| **Business** | `cart-service` | `medium` | Shopping cart sessions & checkout staging |
| **Business** | `order-service` | `high` | Order workflow orchestration & order history |
| **Business** | `payment-service` | `high` | Payment gateway integration & authorization |
| **Business** | `notification-service` | `low` | Email & SMS dispatch, templating engine |
| **Business** | `shipping-service` | `medium` | Carrier logistics, tracking & fulfillment |
| **Infrastructure** | `database-service` | `high` | Primary relational database cluster (PostgreSQL) |
| **Infrastructure** | `cache-service` | `medium` | Distributed in-memory session store (Redis) |
| **Infrastructure** | `message-queue` | `high` | Asynchronous event broker & message bus (Kafka) |
| **Infrastructure** | `search-service` | `medium` | Product search index & query engine (Elasticsearch) |
| **Infrastructure** | `object-storage-service` | `low` | Product images, assets & invoice storage (S3) |
| **Infrastructure** | `email-provider` | `low` | External transactional email relay (SendGrid) |

### Graph Dependency Semantics
> **CRITICAL DIRECTION RULE**:
> An edge `A -[:DEPENDS_ON]-> B` means **A depends on B**.
> If **B experiences an outage**, **A is impacted**.
>
> In failure simulation, when simulating an outage of target service **T**, the engine finds all affected services `(affected)-[:DEPENDS_ON*1..]->(T)`.
> - **Distance 1**: Direct Dependent (directly calls target service).
> - **Distance > 1**: Indirect Dependent (transitive upstream caller).
> - The target service itself is the **Outage Origin**, never its own dependent.

---

## 4. Local Development Setup

### Prerequisites
- Docker (for FalkorDB)
- Java 21 JDK + Maven
- Node.js (v18+) & npm
- Ollama (optional, for local AI incident assistant): `ollama run llama3.2:3b`

### Step 1: Start FalkorDB
```bash
docker run -p 6379:6379 -p 3000:3000 -it --rm --name tracegraph-falkordb falkordb/falkordb:latest
```

### Step 2: Start the Spring Boot Backend
```bash
cd backend
mvn spring-boot:run
```
Backend runs on `http://localhost:8080`.
- Health check: `http://localhost:8080/api/health`
- Graph test: `http://localhost:8080/api/graph/test`
- Graph data: `http://localhost:8080/api/graph`

### Step 3: Seed the Graph (Idempotent)
You can seed the database anytime via:
```bash
# Via curl
curl -X POST http://localhost:8080/api/graph/seed

# Or via PowerShell script
.\scripts\seed-graph.ps1 -BackendUrl "http://localhost:8080"

# Or via Bash script
./scripts/seed-graph.sh http://localhost:8080
```
*Note: Seeding uses Cypher `MERGE` and `COALESCE` to ensure existing nodes, custom properties, and user relationships are preserved and never duplicated.*

### Step 4: Start the TypeScript Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

---

## 5. Environment Variables Reference

### Backend (`backend/.env` or Render Dashboard)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `8080` | Port assigned by Render / hosting environment |
| `FALKORDB_HOST` | `localhost` | FalkorDB server hostname |
| `FALKORDB_PORT` | `6379` | FalkorDB server port |
| `FALKORDB_GRAPH` | `tracegraph` | Graph name inside FalkorDB |
| `FALKORDB_USERNAME` | *(empty)* | Username for FalkorDB authentication (default is `default`) |
| `FALKORDB_PASSWORD` | *(empty)* | Password for FalkorDB authentication |
| `FALKORDB_URL` | *(empty)* | Alternative full connection URI (`rediss://...`) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated list of allowed origins (e.g. Vercel domain) |
| `AI_INFERENCE_URL` | `http://localhost:11434` | Ollama or OpenAI-compatible inference base URL |
| `AI_INFERENCE_MODEL` | `llama3.2:3b` | Model name for chat completions |
| `AI_INFERENCE_API_KEY` | *(empty)* | Optional API token for cloud inference (e.g. Groq) |
| `GRAPH_SEED_ON_STARTUP` | `false` | If `true`, seeds sample graph automatically on startup |

### Frontend (`frontend/.env` or Vercel Dashboard)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Base URL of deployed Spring Boot backend on Render |

---

## 6. Production Deployment Guide

### A. Deploy FalkorDB with Persistent Remote Storage
1. **Option 1: FalkorDB Cloud (Recommended Free Tier)**
   - Sign up at [https://app.falkordb.cloud](https://app.falkordb.cloud).
   - Create a free database instance.
   - Note the **Endpoint** (host, port) and **Password**.
   - Set `FALKORDB_HOST`, `FALKORDB_PORT`, and `FALKORDB_PASSWORD` in your Render backend settings.
2. **Option 2: Docker on Cloud VM / Render Private Service**
   - Run `falkordb/falkordb:latest` with a persistent disk mounted to `/var/lib/falkordb/data`.

### B. Deploy Spring Boot Backend to Render
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your GitHub repository: `https://github.com/Anirudh-786/TraceGraphAI`.
3. Configure the service:
   - **Root Directory**: `backend`
   - **Environment**: `Java` (or `Docker` using `backend/Dockerfile`)
   - **Build Command**: `./mvnw clean package -DskipTests`
   - **Start Command**: `java -jar target/backend-0.0.1-SNAPSHOT.jar`
   - **Health Check Path**: `/api/health`
4. Set Environment Variables:
   - `FALKORDB_HOST` = `<your-hosted-falkordb-host>`
   - `FALKORDB_PORT` = `<your-hosted-falkordb-port>`
   - `FALKORDB_PASSWORD` = `<your-hosted-falkordb-password>`
   - `FALKORDB_GRAPH` = `tracegraph`
   - `CORS_ALLOWED_ORIGINS` = `https://<your-app>.vercel.app,http://localhost:5173`
   - `GRAPH_SEED_ON_STARTUP` = `true` *(for initial deploy to seed the remote database)*
5. Deploy the service and copy the deployed URL (e.g. `https://tracegraphai-backend.onrender.com`).

### C. Deploy Frontend to Vercel
1. Create a new project on [Vercel](https://vercel.com) and import the repository.
2. Set project settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   - `VITE_API_BASE_URL` = `https://<your-render-backend-url>.onrender.com`
4. Deploy the frontend.

### D. Remote Database Seeding
After your Render backend is live, seed the remote FalkorDB instance:
```bash
curl -X POST https://<your-render-backend-url>.onrender.com/api/graph/seed
```
Or trigger it directly from the interactive frontend UI using the **Seed Sample Architecture Demo** button.

---

## 7. Production AI Configuration

- **Local Development**: Runs with zero cloud dependencies using local Ollama (`llama3.2:3b`).
- **Production on Render**: Since local Ollama cannot be called from a remote Render container, configure a cloud endpoint in Render environment variables:
  ```env
  AI_INFERENCE_URL=https://api.groq.com/openai/v1
  AI_INFERENCE_MODEL=llama-3.1-8b-instant
  AI_INFERENCE_API_KEY=gsk_...
  ```
  The Spring Boot `AiController` automatically adapts to OpenAI/Groq compatible chat formats while preserving strict grounding in FalkorDB evidence.
- If AI inference is unavailable or not configured, the platform displays a clear error banner while keeping graph visualization, blast radius simulation, and risk scoring **100% operational**.

---

## 8. Verification & Test Evidence

All automated checks were executed and passed:
- **Frontend TypeScript Check**: `npx tsc --noEmit` exited with code `0` (zero errors).
- **Frontend Production Build**: `npm run build` compiled client bundle with `@xyflow/react` in 287ms.
- **Backend Test Suite**: `mvn test` executed 5 integration tests with `0 failures, 0 errors`:
  - `testIdempotentSeedAndGraphExpansion`: Verified 17 services, 21 relationships, and zero duplicate mutations on repeated seeding.
  - `testImpactAnalysisOnCoreServices`: Outage simulation on `database-service` verified direct (distance 1) and indirect (distance > 1) blast radius.
  - `testServiceRiskCalculations`: Verified heuristic risk scoring formula and descending risk sorting.
  - `testDependencyPath`: Verified shortest dependency traversal from `frontend-service` to `database-service`.
- **FalkorDB Consistency**: Verified live Redis Cypher graph state in Docker container.

---

## 9. Known Limitations
- Graph distance measures topological hops across `DEPENDS_ON` edges; it does not represent network latency or physical server distance.
- Risk scoring is a heuristic calculation based on criticality weight and downstream blast radius, not a real-time monitoring telemetry stream.
