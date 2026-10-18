
# TraceGraphAI — Local Setup & Demo Guide

<p align="center">
  <strong>Graph Intelligence for Microservice Dependencies</strong><br/>
  Explore service relationships, understand architecture, and prepare a local graph-powered demo.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Mode-Local%20Demo-blue?style=for-the-badge" alt="Local Demo"/>
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React and TypeScript"/>
  <img src="https://img.shields.io/badge/Backend-Java%2021-orange?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java 21"/>
  <img src="https://img.shields.io/badge/Graph%20DB-FalkorDB-7B61FF?style=for-the-badge" alt="FalkorDB"/>
  <img src="https://img.shields.io/badge/Runtime-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
</p>

> [!IMPORTANT]
> **This README is focused on local installation and presentation.** All required components run on your computer. A successful cloud deployment is not required for the local demo.

**Repository:** [Anirudh-786/TraceGraphAI](https://github.com/Anirudh-786/TraceGraphAI)  
**Local project folder:** `D:\TraceGraphAI`  
**FalkorDB graph:** `tracegraph`

---

## Table of Contents

- [About the Project](#-about-the-project)
- [Technology Stack](#-technology-stack)
- [Architecture](#️-architecture)
- [Prerequisites](#️-prerequisites)
- [Installation](#-installation)
- [Start FalkorDB](#️-start-falkordb)
- [Start the Backend](#-start-the-backend)
- [Seed the Demo Graph](#-seed-the-demo-graph)
- [Start the Frontend](#-start-the-frontend)
- [Quick Start for Future Sessions](#-quick-start-for-future-sessions)
- [API Endpoints](#-api-endpoints)
- [Understanding the Graph Model](#️-understanding-the-graph-model)
- [Presentation Walkthrough](#-presentation-walkthrough)
- [Troubleshooting](#️-troubleshooting)
- [Pre-Demo Checklist](#-pre-demo-checklist)

---

## About the Project

**TraceGraphAI** is a graph-based microservice dependency exploration platform. It represents services as graph nodes and their dependencies as directed relationships in **FalkorDB**.

The Spring Boot backend exposes graph data through REST APIs, while the React frontend provides a visual interface for exploring the service architecture.

###  Project Goals

-  Represent microservices and their dependencies as a graph.
-  Explore service relationships and inspect individual services.
-  Make dependency direction easier to understand.
-  Provide a local environment for demonstrating graph-based architecture.
-  Explore graph-backed risk or impact features when they are working in the current build.

---

##  Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Graph Visualization | `@xyflow/react` |
| Backend | Java 21, Spring Boot |
| Build Tool | Maven Wrapper |
| Graph Database | FalkorDB |
| Local Database Runtime | Docker Desktop |
| Frontend Package Manager | npm |

---

##  Architecture

TraceGraphAI runs as three main components on your local machine.

```text
┌──────────────────────────────────────┐
│             Web Browser              │
│        React + TypeScript + Vite     │
│          localhost:5173               │
└──────────────────┬───────────────────┘
                   │
                   │ HTTP / REST API
                   ▼
┌──────────────────────────────────────┐
│          Spring Boot Backend         │
│          Java 21 · Port 8080         │
└──────────────────┬───────────────────┘
                   │
                   │ Graph connection
                   ▼
┌──────────────────────────────────────┐
│             FalkorDB                 │
│          localhost:6379               │
│          Graph: tracegraph            │
└──────────────────────────────────────┘
```

> [!NOTE]
> Keep the database, backend, and frontend running in separate terminal windows during your presentation.

---

## ⚙️ Prerequisites

Install the following tools before starting.

| Tool | Purpose |
|---|---|
| [Git for Windows](https://git-scm.com/download/win) | Clone and manage the repository |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Run FalkorDB locally |
| [Java JDK 21](https://adoptium.net/) | Run the Spring Boot backend |
| [Node.js LTS](https://nodejs.org/) | Run the React frontend and npm |

### Verify your installations

Open **PowerShell** and execute:

```powershell
git --version
docker --version
docker info
java -version
node --version
npm --version
```

If `docker info` fails, open Docker Desktop and wait until its engine is running.

---

##  Installation

### Option A — Clone the repository

Use this option only if you do not already have the project folder.

```powershell
cd D:\
git clone https://github.com/Anirudh-786/TraceGraphAI.git
cd D:\TraceGraphAI
```

### Option B — Use your existing project

If the repository is already present:

```powershell
cd D:\TraceGraphAI
git status
```

> [!TIP]
> Do not clone the repository inside its own existing project folder.

---

##  Start FalkorDB

First, start **Docker Desktop**.

### Step 1: Check whether the container exists

```powershell
docker ps -a --filter "name=tracegraph-falkordb"
```

### Step 2: Start the existing container

If the container already exists:

```powershell
docker start tracegraph-falkordb
```

### Or create the container for the first time

If no container exists:

```powershell
docker run -d --name tracegraph-falkordb -p 6379:6379 -p 3000:3000 falkordb/falkordb:latest
```

### Step 3: Verify the database

```powershell
docker ps
docker exec tracegraph-falkordb redis-cli PING
```

Expected response:

```text
PONG
```

**Local database settings**

| Setting | Value |
|---|---|
| Host | `localhost` |
| Port | `6379` |
| Graph name | `tracegraph` |
| Authentication | No authentication in this local example |

> [!WARNING]
> Do not expose an unauthenticated local database port to an untrusted network.

### Optional: FalkorDB Browser

The separate FalkorDB Browser UI is optional. TraceGraphAI's frontend does not require it.

If you want to use the browser container, first ensure the Docker network exists and the database is attached to it:

```powershell
docker network create tracegraph-net
docker network connect tracegraph-net tracegraph-falkordb
```

If the network already exists, Docker may report that it already exists; continue if the database is attached successfully.

Start the browser:

```powershell
docker run -d --name tracegraph-browser --network tracegraph-net -p 3001:3000 -e FALKORDB_HOST=tracegraph-falkordb -e FALKORDB_PORT=6379 -e FALKORDB_USERNAME=default falkordb/falkordb-browser:latest
```

Open:

**http://localhost:3001**

If the browser container already exists, inspect it and start it rather than creating a duplicate.

---

##  Start the Backend

Open a **new PowerShell terminal**.

Navigate to the backend folder:

```powershell
cd D:\TraceGraphAI\backend
```

Start Spring Boot:

```powershell
.\mvnw.cmd spring-boot:run
```

Wait until the backend finishes starting. Keep this terminal open during the demo.

### Backend URLs

| Purpose | URL |
|---|---|
| Health check | [http://localhost:8080/api/health](http://localhost:8080/api/health) |
| Graph connectivity test | [http://localhost:8080/api/graph/test](http://localhost:8080/api/graph/test) |

> [!TIP]
> If Java is missing or the wrong version is selected, verify `java -version` and confirm that JDK 21 is installed and configured in your `PATH`.

---

##  Seed the Demo Graph

With the backend running and connected to the local FalkorDB instance, open another PowerShell window.

Execute:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/graph/seed"
```

During the development session, backend logs reported **17 service definitions and 20 dependency definitions**. Check the current seed response or logs before quoting these counts during your presentation.

If no services appear in the frontend:

1. Verify FalkorDB is running.
2. Confirm the backend is connected to `localhost:6379`.
3. Run the seed endpoint.
4. Refresh the frontend.

Avoid repeatedly reseeding unless you need to restore the demo graph.

---

##  Start the Frontend

Open a **third PowerShell terminal**.

Navigate to the frontend directory:

```powershell
cd D:\TraceGraphAI\frontend
```

Install dependencies:

```powershell
npm install
```

Start Vite:

```powershell
npm run dev
```

Open the URL printed by Vite. It is usually:

###  [http://localhost:5173](http://localhost:5173)

Keep the frontend terminal open. If port `5173` is occupied, use the alternative URL printed by Vite.

---

##  Quick Start for Future Sessions

After the initial installation, you normally only need to start the database, backend, and frontend again.

<details>
<summary><strong>Terminal 1 — Start FalkorDB</strong></summary>

```powershell
docker start tracegraph-falkordb
docker ps
```

Verify that the database is responding:

```powershell
docker exec tracegraph-falkordb redis-cli PING
```

</details>

<details>
<summary><strong>Terminal 2 — Start the backend</strong></summary>

```powershell
cd D:\TraceGraphAI\backend
.\mvnw.cmd spring-boot:run
```

</details>

<details>
<summary><strong>Terminal 3 — Start the frontend</strong></summary>

```powershell
cd D:\TraceGraphAI\frontend
npm run dev
```

</details>

Then open [http://localhost:5173](http://localhost:5173).

If the local graph is empty, use the seed command in the previous section.

---

##  API Endpoints

The backend base URL is `http://localhost:8080`.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check backend health |
| `GET` | `/api/graph/test` | Test graph/backend connectivity |
| `GET` | `/api/graph` | Retrieve graph data |
| `POST` | `/api/graph/seed` | Seed demo graph data |

---

##  Understanding the Graph Model

TraceGraphAI uses graph nodes to represent services and directed relationships to represent dependencies.

| Element | Meaning |
|---|---|
| Node label | `Service` |
| Relationship | `DEPENDS_ON` |
| Graph name | `tracegraph` |

### Relationship direction

```text
A -[:DEPENDS_ON]-> B
```

This means **service A depends on service B**.

If B fails, A may be affected because one of its dependencies is unavailable.

Example services in the demo architecture include:

- `frontend-service`
- `api-gateway`
- `authentication-service`
- `order-service`
- `payment-service`
- `database-service`
- `cache-service`
- `message-queue`

Additional supporting services are also included in the demo graph.

### Example Cypher queries

Run each query separately in the FalkorDB query console.

**1. Count service nodes**

```cypher
MATCH (s:Service)
RETURN count(s) AS services
```

**2. Count dependency relationships**

```cypher
MATCH ()-[r:DEPENDS_ON]->()
RETURN count(r) AS dependencies
```

**3. Inspect dependency edges**

```cypher
MATCH (a:Service)-[:DEPENDS_ON]->(b:Service)
RETURN a.name AS service, b.name AS dependsOn
LIMIT 50
```

These examples illustrate the graph data model. Confirm they work in your current FalkorDB console and, when possible, show the actual graph query used by the application.

---

##  Troubleshooting

<details>
<summary><strong> Docker or database is not responding</strong></summary>

Run:

```powershell
docker info
docker ps -a
docker logs --tail 50 tracegraph-falkordb
docker exec tracegraph-falkordb redis-cli PING
```

If the Docker engine is stopped, open Docker Desktop. If the container exists but is stopped, run:

```powershell
docker start tracegraph-falkordb
```

</details>

<details>
<summary><strong> Backend cannot connect to FalkorDB</strong></summary>

- Confirm that the database returns `PONG`.
- Confirm the backend uses `localhost:6379` and graph `tracegraph`.
- Review backend startup logs for connection errors.
- Ensure port `6379` is not occupied by an unrelated service.

</details>

<details>
<summary><strong> Frontend cannot reach the backend</strong></summary>

- Confirm the backend is running at `http://localhost:8080`.
- Check the frontend API base URL and CORS configuration.
- Inspect the browser developer console and backend logs.
- Refresh the frontend after the backend is ready.

</details>

<details>
<summary><strong> No services appear in the graph</strong></summary>

Check the graph API:

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/graph"
```

Then:

1. Check backend logs to confirm which database it connected to.
2. Seed the intended local graph.
3. Refresh the frontend.

</details>

<details>
<summary><strong> npm or Vite fails</strong></summary>

```powershell
cd D:\TraceGraphAI\frontend
npm install
npm run dev
```

Check `node --version` and `npm --version`. Open the URL printed by Vite.

</details>

<details>
<summary><strong> Backend port 8080 is already in use</strong></summary>

Check which process is listening:

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen
```

Stop only a process you recognize, or configure a different backend port and update the frontend API URL accordingly.

</details>

<details>
<summary><strong> Optional AI panel does not work</strong></summary>

The example local inference configuration uses Ollama at `http://localhost:11434` with model `llama3.2:3b`.

The AI panel requires the inference service, model, and matching backend configuration to be available. The core local graph demo does not require you to present this panel. Skip it if it is not working.

</details>

---

##  Scope & Environment

This README documents a **local installation and presentation workflow**. It does not claim that cloud deployment is complete.

The instructions assume:

- Windows PowerShell
- Project folder: `D:\TraceGraphAI`
- Java JDK 21
- Docker Desktop
- Local FalkorDB on port `6379`
- Spring Boot backend on port `8080`
- React/Vite frontend, usually on port `5173`

If your current checkout uses different scripts, ports, or environment settings, follow the actual project configuration.

---

<p align="center">
  <strong>Built for exploring service dependencies with graph technology.</strong><br/>
  <sub>TraceGraphAI · Local Demo Edition</sub>
</p>
