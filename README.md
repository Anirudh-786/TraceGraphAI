TraceGraphAI — Local Setup & Demo Guide
Presentation mode: local installation only. This guide runs TraceGraphAI on your own computer using Docker, FalkorDB, the Spring Boot backend, and the React/Vite frontend. Cloud deployment is not required for the demo.

Repository: https://github.com/Anirudh-786/TraceGraphAI
Expected project folder: D:\TraceGraphAI
Local graph name: tracegraph
What is TraceGraphAI?
TraceGraphAI is a graph-based microservice dependency exploration platform. It represents services as graph nodes and their dependencies as directed relationships in FalkorDB. The backend exposes the graph through an API, and the frontend provides a visual interface for exploring the architecture.
Technology stack
- Frontend: React, TypeScript, Vite, @xyflow/react
- Backend: Java 21, Spring Boot, Maven Wrapper
- Graph database: FalkorDB
- Local database runtime: Docker Desktop
Architecture
Browser
  http://localhost:5173
          |
          | HTTP API
          v
Spring Boot backend
  http://localhost:8080
          |
          | FalkorDB connection
          v
FalkorDB graph database
  localhost:6379
  graph: tracegraph
All components run locally. Keep the database, backend, and frontend running in separate terminal windows during the presentation.
1. Prerequisites
Install these tools before the demo:
1. Git for Windows — to clone the repository.
2. Docker Desktop — to run FalkorDB locally.
3. Java JDK 21 — required by the backend.
4. Node.js LTS and npm — required by the frontend.
Open PowerShell and verify the installations:
git --version
docker --version
docker info
java -version
node --version
npm --version
If docker info fails, open Docker Desktop and wait until its engine is running.
2. Get the project
Option A — clone the repository
Run this only if you do not already have the project folder:
cd D:\
git clone https://github.com/Anirudh-786/TraceGraphAI.git
cd D:\TraceGraphAI
Option B — use your existing checkout
cd D:\TraceGraphAI
git status
Do not clone the repository inside its own existing folder.
3. Start FalkorDB
Start Docker Desktop first. Then check whether the database container already exists:
docker ps -a --filter "name=tracegraph-falkordb"
If the container exists, start it:
docker start tracegraph-falkordb
If no such container exists, create one:
docker run -d --name tracegraph-falkordb -p 6379:6379 -p 3000:3000 falkordb/falkordb:latest
Confirm that it is running and responds:
docker ps
docker exec tracegraph-falkordb redis-cli PING
Expected response to PING:
PONG
The local development setup described here uses FalkorDB on localhost:6379 without authentication. Do not expose this database port to an untrusted network.
Optional: FalkorDB Browser
If you want to inspect the graph in a browser, you can run the separate browser container. The following uses port 3001 on your computer so it does not conflict with the database container's published port:
docker run -d --name tracegraph-browser --network tracegraph-net -p 3001:3000 -e FALKORDB_HOST=tracegraph-falkordb -e FALKORDB_PORT=6379 -e FALKORDB_USERNAME=default falkordb/falkordb-browser:latest
This optional command assumes a Docker network named tracegraph-net already exists. If it does not, create the network and attach the database to it before running the browser:
docker network create tracegraph-net
docker network connect tracegraph-net tracegraph-falkordb
Open http://localhost:3001 if the browser container starts successfully. The main TraceGraphAI demo does not require the separate browser UI.
4. Start the backend
Open a new PowerShell window:
cd D:\TraceGraphAI\backend
.\mvnw.cmd spring-boot:run
Wait for Spring Boot to finish starting. The backend should be available at:
- API health: http://localhost:8080/api/health
- Graph test: http://localhost:8080/api/graph/test
Keep this terminal open while presenting.
If the Maven wrapper reports that Java is missing or the wrong version, verify java -version and make sure JDK 21 is installed and selected in PATH.

5. Seed the local demo graph
With the backend running and connected to the local FalkorDB instance, open another PowerShell window and run:
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/graph/seed"
During the development session, the backend seed log reported 17 service definitions and 20 dependency definitions. Check the actual response/logs from your current checkout before quoting those counts in your presentation.
If the frontend shows no services, verify that the backend is connected to localhost:6379, seed the intended local graph, and refresh the frontend. Avoid repeatedly reseeding unless you need to restore the demo data.
6. Start the frontend
Open a third PowerShell window:
cd D:\TraceGraphAI\frontend
npm install
npm run dev
Vite prints a local URL in the terminal. Open the URL it provides, usually:
http://localhost:5173
Keep this terminal open. If Vite prints a different port because 5173 is already occupied, use the URL printed by Vite.
7. Quick start — later demo sessions
After the first-time installation, you normally only need to start the database, backend, and frontend again. Use three terminals.
Terminal 1 — database
docker start tracegraph-falkordb
docker ps
Terminal 2 — backend
cd D:\TraceGraphAI\backend
.\mvnw.cmd spring-boot:run
Terminal 3 — frontend
cd D:\TraceGraphAI\frontend
npm run dev
Then open http://localhost:5173. If the local graph is empty, seed it using the command in Section 5.
8. API endpoints
Method	Endpoint	Purpose
GET	/api/health	Check backend health
GET	/api/graph/test	Test graph/backend connectivity
GET	/api/graph	Retrieve graph data
POST	/api/graph/seed	Seed demo graph data


Base URL: http://localhost:8080
9. Graph model — presentation explanation
- Node label: Service
- Relationship: DEPENDS_ON
- Graph: tracegraph
The relationship direction is important:
A -[:DEPENDS_ON]-> B
means service A depends on service B. If B fails, A may be affected because one of its dependencies is unavailable.
The demo architecture includes services such as frontend-service, api-gateway, authentication-service, order-service, payment-service, database-service, cache-service, and message-queue, along with other supporting services.
Example Cypher queries you can run individually in the FalkorDB query console:
MATCH (s:Service)
RETURN count(s) AS services
MATCH ()-[r:DEPENDS_ON]->()
RETURN count(r) AS dependencies
MATCH (a:Service)-[:DEPENDS_ON]->(b:Service)
RETURN a.name AS service, b.name AS dependsOn
LIMIT 50
These examples illustrate the data model. Before your presentation, confirm they run in the console/version you are using and, where possible, show the actual graph query used by the application.
10. Presentation walkthrough
A short, repeatable demo can follow this order:
1. Introduce the problem: understanding service dependencies and possible failure impact becomes difficult as systems grow.
2. Show the architecture: React/Vite frontend → Spring Boot API → FalkorDB.
3. Show Docker Desktop: confirm the local FalkorDB container is running.
4. Show backend startup: point out port 8080 and the local database connection.
5. Show seeding: show the seed response or log and quote only the counts confirmed in that run.
6. Open the frontend: demonstrate the graph view, service search/filter, and node inspection that work in your current build.
7. Explain the graph direction: A DEPENDS_ON B means A relies on B.
8. Show a graph query: count service nodes or inspect dependency edges.
9. Demonstrate risk/impact/AI panels only if they work in your current local setup. If an optional panel is not working, skip it rather than presenting it as verified.
Before the presentation, close unrelated windows and ensure no passwords, API keys, or private connection strings are visible.
11. Troubleshooting
Docker or database is not responding
docker info
docker ps -a
docker logs --tail 50 tracegraph-falkordb
docker exec tracegraph-falkordb redis-cli PING
Open Docker Desktop if the engine is stopped. If the container exists but is stopped, run docker start tracegraph-falkordb.
Backend cannot connect to FalkorDB
- Confirm the database responds with PONG.
- Confirm the backend is configured for localhost:6379 and graph tracegraph.
- Review the backend startup logs for the host and connection error.
- Ensure port 6379 is not occupied by an unrelated service.
Frontend cannot reach the backend
- Confirm the backend is running at http://localhost:8080.
- Check the frontend API base URL/configuration and CORS settings.
- Inspect the browser developer console and backend logs.
- Refresh the page after the backend is ready.
No services appear
- Check GET http://localhost:8080/api/graph.
- Check backend logs to confirm which database it connected to.
- Run the seed endpoint against the local backend.
- Refresh the frontend.
Node.js dependencies or Vite fail
cd D:\TraceGraphAI\frontend
npm install
npm run dev
Check node --version and npm --version. Use the URL printed by Vite.
Backend port is already in use
Check which process is listening before stopping anything:
Get-NetTCPConnection -LocalPort 8080 -State Listen
Stop only a process you recognize, or configure the backend to use a different port and update the frontend API URL accordingly.
Optional AI panel does not work
The example local inference configuration uses Ollama at http://localhost:11434 with model llama3.2:3b. The AI panel requires the inference service/model and matching backend configuration to be available. The core local graph demo does not require you to present the AI panel; skip it if it is not working.
12. Local demo checklist
Before presenting, confirm each item:
- [ ] Docker Desktop is running.
- [ ] tracegraph-falkordb is running and PING returns PONG.
- [ ] Backend starts and /api/health responds.
- [ ] The local seed operation succeeds.
- [ ] /api/graph returns the expected graph data.
- [ ] Frontend starts and opens at the Vite URL.
- [ ] Search, filtering, and service inspection work in the current build.
- [ ] Any risk, impact, or AI feature you plan to show has been tested in advance.
- [ ] You can explain the DEPENDS_ON direction and why FalkorDB is used.
- [ ] No secrets are visible in the presentation.
Scope note
This README intentionally documents a local installation and presentation workflow. It does not claim that cloud deployment is complete. The local setup assumes Windows PowerShell, project folder D:\TraceGraphAI, Java 21, Docker Desktop, a local FalkorDB service on port 6379, backend port 8080, and a Vite frontend. If your current checkout uses different scripts, ports, or environment settings, follow the actual project configuration.
