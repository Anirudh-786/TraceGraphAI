
import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:8080/api/graph";

function App() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadGraph() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      setGraph(data);
    } catch (err) {
      setError(err.message || "Could not load graph data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGraph();
  }, []);

  const getServiceName = (node) =>
    node.properties?.name || `Service ${node.id}`;

  const getCriticality = (node) =>
    node.properties?.criticality || "Not specified";

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">TG</div>
          <div>
            <h1>TraceGraphAI</h1>
            <p>Service dependency intelligence</p>
          </div>
        </div>

        <button className="refresh-button" onClick={loadGraph}>
          Refresh graph
        </button>
      </header>

      <section className="intro">
        <p className="eyebrow">SYSTEM OVERVIEW</p>
        <h2>Understand your service architecture.</h2>
        <p>
          Explore services and the dependencies connecting them,
          powered by your FalkorDB graph.
        </p>
      </section>

      {loading && <p className="message">Loading graph data...</p>}

      {error && (
        <div className="error-panel">
          <p>Unable to load the graph: {error}</p>
          <button onClick={loadGraph}>Try again</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="stats">
            <article className="stat-card">
              <span>Services</span>
              <strong>{graph.nodes.length}</strong>
            </article>
            <article className="stat-card">
              <span>Dependencies</span>
              <strong>{graph.edges.length}</strong>
            </article>
            <article className="stat-card">
              <span>Graph database</span>
              <strong>{graph.graph || "tracegraph"}</strong>
            </article>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Service dependency graph</h3>
                <p>Relationships loaded from the backend API</p>
              </div>
              <span className="live-status">API CONNECTED</span>
            </div>

            <div className="graph-canvas">
              {graph.nodes.length === 0 ? (
                <p className="message">No services found in this graph.</p>
              ) : (
                <div className="dependency-visual">
                  {graph.nodes.map((node) => (
                    <article className="service-node" key={node.id}>
                      <div className="node-top">
                        <span className="node-icon">S</span>
                        <span className="node-type">
                          {node.labels?.[0] || "Node"}
                        </span>
                      </div>

                      <h4>{getServiceName(node)}</h4>

                      <div className="node-details">
                        <span>ID</span>
                        <code>{node.id}</code>
                      </div>

                      <div className="node-details">
                        <span>Criticality</span>
                        <strong
                          className={
                            getCriticality(node).toLowerCase() === "high"
                              ? "criticality-high"
                              : ""
                          }
                        >
                          {getCriticality(node)}
                        </strong>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {graph.edges.length > 0 && (
                <div className="dependency-list">
                  <h4>Dependency relationships</h4>

                  {graph.edges.map((edge, index) => {
                    const source = graph.nodes.find(
                      (node) => node.id === edge.source,
                    );
                    const target = graph.nodes.find(
                      (node) => node.id === edge.target,
                    );

                    return (
                      <div
                        className="dependency-row"
                        key={`${edge.source}-${edge.target}-${index}`}
                      >
                        <strong>{source ? getServiceName(source) : edge.source}</strong>
                        <span className="edge-arrow">→</span> 
                        <span className="edge-label">{edge.label}</span>
                        <span className="edge-arrow">→</span>
                        <strong>{target ? getServiceName(target) : edge.target}</strong>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <footer>
        TraceGraphAI · Graph data supplied by Spring Boot and FalkorDB
      </footer>
    </main>
  );
}

export default App;
