
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:8080/api/graph";

function App() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [risks, setRisks] = useState([]);
  const [riskLoading, setRiskLoading] = useState(true);
  const [riskError, setRiskError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [relationshipFilter, setRelationshipFilter] = useState("ALL");
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [impactService, setImpactService] = useState("");
  const [impactResult, setImpactResult] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState("");

  async function loadGraph() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      setGraph({
        ...data,
        nodes: Array.isArray(data.nodes) ? data.nodes : [],
        edges: Array.isArray(data.edges) ? data.edges : [],
      });
    } catch (err) {
      setError(err.message || "Could not load graph data.");
    } finally {
      setLoading(false);
    }
  }

  
async function analyzeImpact() {
  if (!impactService) {
    setImpactError("Please select a service first.");
    return;
  }

  try {
    setImpactLoading(true);
    setImpactError("");
    setImpactResult(null);

    const response = await fetch(
      `${API_URL}/impact?service=${encodeURIComponent(impactService)}`
    );

    if (!response.ok) {
      throw new Error(`Impact API returned ${response.status}`);
    }

    const data = await response.json();
    setImpactResult(data);
  } catch (err) {
    setImpactError(err.message || "Could not analyze service impact.");
  } finally {
    setImpactLoading(false);
  }
}


  
async function loadRisks() {
  try {
    setRiskLoading(true);
    setRiskError("");

    const response = await fetch(
      "http://localhost:8080/api/graph/risks"
    );

    if (!response.ok) {
      throw new Error(`Risk API returned ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Unexpected risk API response.");
    }

    setRisks(
      [...data].sort(
        (a, b) => b.riskScore - a.riskScore
      )
    );
  } catch (err) {
    setRiskError(err.message || "Could not load service risks.");
  } finally {
    setRiskLoading(false);
  }
}

  useEffect(() => {
    loadGraph();
    loadRisks();
  }, []);

  const getServiceName = (node) =>
    node.properties?.name || `Service ${node.id}`;

  const getCriticality = (node) =>
    node.properties?.criticality || "Not specified";

  const relationshipTypes = useMemo(
    () => [...new Set(graph.edges.map((edge) => edge.label).filter(Boolean))].sort(),
    [graph.edges],
  );

  const normalizedSearch = search.trim().toLowerCase();

  const matchesSearch = (node) => {
    if (!normalizedSearch) return true;

    const searchableText = [
      node.id,
      getServiceName(node),
      ...(node.labels || []),
      ...Object.entries(node.properties || {}).flatMap(([key, value]) => [
        key,
        String(value),
      ]),
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearch);
  };

  const filteredNodes = graph.nodes.filter(matchesSearch);
  
  
const getImpactNodeClass = (node) => {
  if (!impactResult || !impactService) return "";

  const serviceName = getServiceName(node);

  if (serviceName === impactService) {
    return "service-node-impact-source";
  }

  const affectedService = (
    impactResult.affectedServices || []
  ).find((service) => {
    const name =
      typeof service === "string"
        ? service
        : service.properties?.name ??
          service.properties?.id ??
          service.id;

    return name === serviceName;
  });

  if (affectedService?.impactType === "DIRECT") {
    return "service-node-direct-impact";
  }

  if (affectedService?.impactType === "INDIRECT") {
    return "service-node-indirect-impact";
  }

  return "";
};



  const filteredEdges = graph.edges.filter((edge) => {
    const matchesRelationship =
      relationshipFilter === "ALL" || edge.label === relationshipFilter;

    const source = graph.nodes.find(
      (node) => String(node.id) === String(edge.source),
    );
    const target = graph.nodes.find(
      (node) => String(node.id) === String(edge.target),
    );

    const matchesNodeSearch =
      !normalizedSearch ||
      (source && matchesSearch(source)) ||
      (target && matchesSearch(target));

    return matchesRelationship && matchesNodeSearch;
  });

  const selectedNode = graph.nodes.find(
    (node) => String(node.id) === String(selectedNodeId),
  );

  const getConnectedEdges = (nodeId, direction) =>
    graph.edges.filter((edge) => {
      if (direction === "outgoing") {
        return String(edge.source) === String(nodeId);
      }

      return String(edge.target) === String(nodeId);
    });

  const getRelatedServiceName = (nodeId) => {
    const node = graph.nodes.find(
      (item) => String(item.id) === String(nodeId),
    );

    return node ? getServiceName(node) : `Node ${nodeId}`;
  };

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

        <button
  className="refresh-button"
  onClick={() => {
    loadGraph();
    loadRisks();
  }}
  disabled={loading}
>
          {loading ? "Refreshing..." : "Refresh graph"}
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

          
<section className="panel impact-panel">
  <div className="panel-heading">
    <div>
      <p className="eyebrow">IMPACT ANALYSIS</p>
      <h3>What happens if a service fails?</h3>
      <p>Find services that depend directly or indirectly on a selected service.</p>
    </div>
  </div>

  <div className="graph-tools">
    <label className="control-field">
      <span>Service to analyze</span>
      <select
        value={impactService}
        onChange={(event) => {
          setImpactService(event.target.value);
          setImpactResult(null);
          setImpactError("");
        }}
      >
        <option value="">Select a service</option>
        {graph.nodes.map((node) => (
          <option key={node.id} value={getServiceName(node)}>
            {getServiceName(node)}
          </option>
        ))}
      </select>
    </label>

    <button
      className="refresh-button"
      onClick={analyzeImpact}
      disabled={!impactService || impactLoading}
    >
      {impactLoading ? "Analyzing..." : "Analyze impact"}
    </button>
  </div>

  {impactError && (
    <div className="error-panel">
      <p>{impactError}</p>
    </div>
  )}

  {impactResult && (
    <div className="impact-results">
     
<div className="simulation-summary">
  <p className="eyebrow">SIMULATION RESULTS</p>
  <h4>Failure of {impactResult.service}</h4>

  <div className="simulation-stats">
    <div className="simulation-stat">
      <span>Total affected</span>
      <strong>{impactResult.affectedCount}</strong>
    </div>

    <div className="simulation-stat">
      <span>Direct impact</span>
      <strong>{impactResult.directCount ?? 0}</strong>
    </div>

    <div className="simulation-stat">
      <span>Indirect impact</span>
      <strong>{impactResult.indirectCount ?? 0}</strong>
    </div>
  </div>

  <p className="message">
    This is a simulated failure. No services have been stopped or modified.
  </p>
</div>


     {impactResult.affectedServices?.length > 0 ? (
  <ul>
    {impactResult.affectedServices.map((service, index) => {
      const serviceName =
        typeof service === "string"
          ? service
          : service.properties?.name ??
            service.properties?.id ??
            service.id ??
            `Affected service ${index + 1}`;

      return (
        <li key={`${serviceName}-${index}`}>
          {serviceName}
        </li>
      );
    })}
  </ul>
) : (
        <p className="message">
          No dependent services were found.
        </p>
      )}
    </div>
  )}
</section>


          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Service dependency graph</h3>
                <p>Search services, filter relationships, and inspect nodes</p>
              </div>
              <span className="live-status">API CONNECTED</span>
            </div>

            <div className="graph-tools">
              <label className="control-field">
                <span>Search services</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, ID, label, or property..."
                />
              </label>

              <label className="control-field">
                <span>Relationship type</span>
                <select
                  value={relationshipFilter}
                  onChange={(event) => setRelationshipFilter(event.target.value)}
                >
                  <option value="ALL">All relationships</option>
                  {relationshipTypes.map((type) => (
                    <option value={type} key={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="clear-button"
                onClick={() => {
                  setSearch("");
                  setRelationshipFilter("ALL");
                }}
              >
                Clear filters
              </button>
            </div>

            <div className="results-summary">
              Showing {filteredNodes.length} of {graph.nodes.length} services
              {" · "}
              {filteredEdges.length} of {graph.edges.length} relationships
            </div>

            <div className="graph-canvas">
              {filteredNodes.length === 0 ? (
                <p className="message">
                  No services match your search. Try another term or clear filters.
                </p>
              ) : (
                <div className="dependency-visual">
                  {filteredNodes.map((node) => (
                    <button
                      type="button"
                      className={`service-node ${
                        String(selectedNodeId) === String(node.id)
                          ? "service-node-selected"
                          : ""
                      }${getImpactNodeClass(node)}`}
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      aria-pressed={String(selectedNodeId) === String(node.id)}
                    >
                      <span className="node-top">
                        <span className="node-icon">S</span>
                        <span className="node-type">
                          {node.labels?.[0] || "Node"}
                        </span>
                      </span>

                      <span className="node-name">{getServiceName(node)}</span>

                      <span className="node-details">
                        <span>ID</span>
                        <code>{node.id}</code>
                      </span>

                      <span className="node-details">
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
                      </span>

                      <span className="inspect-hint">Click to inspect →</span>
                    </button>
                  ))}
                </div>
              )}

              <section className="dependency-list">
                <h4>Dependency relationships</h4>

                {filteredEdges.length === 0 ? (
                  <p className="message">No matching relationships.</p>
                ) : (
                  filteredEdges.map((edge, index) => (
                    <div
                      className="dependency-row"
                      key={`${edge.source}-${edge.target}-${edge.label}-${index}`}
                    >
                      <strong>{getRelatedServiceName(edge.source)}</strong>
                      <span className="edge-arrow">→</span>
                      <span className="edge-label">{edge.label || "RELATED_TO"}</span>
                      <span className="edge-arrow">→</span>
                      <strong>{getRelatedServiceName(edge.target)}</strong>
                    </div>
                  ))
                )}
              </section>
            </div>
          </section>

          {selectedNode && (
            <section className="panel inspector-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">NODE INSPECTOR</p>
                  <h3>{getServiceName(selectedNode)}</h3>
                  <p>Inspect this service and its connections.</p>
                </div>
                <button
                  className="clear-button"
                  onClick={() => setSelectedNodeId(null)}
                >
                  Close inspector
                </button>
              </div>

              <div className="inspector-content">
                <div className="inspector-section">
                  <h4>Node details</h4>
                  <dl className="property-list">
                    <div>
                      <dt>Node ID</dt>
                      <dd>{selectedNode.id}</dd>
                    </div>
                    <div>
                      <dt>Labels</dt>
                      <dd>{selectedNode.labels?.join(", ") || "None"}</dd>
                    </div>
                    {Object.entries(selectedNode.properties || {}).map(
                      ([key, value]) => (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd>
                            {typeof value === "object" && value !== null
                              ? JSON.stringify(value)
                              : String(value)}
                          </dd>
                        </div>
                      ),
                    )}
                  </dl>
                </div>

                <div className="inspector-section">
                  <h4>
                    Outgoing dependencies (
                    {getConnectedEdges(selectedNode.id, "outgoing").length})
                  </h4>
                  {getConnectedEdges(selectedNode.id, "outgoing").length === 0 ? (
                    <p className="message">No outgoing dependencies.</p>
                  ) : (
                    getConnectedEdges(selectedNode.id, "outgoing").map(
                      (edge, index) => (
                        <div className="connection-row" key={`${edge.target}-${index}`}>
                          <span className="edge-label">{edge.label}</span>
                          <span>→ {getRelatedServiceName(edge.target)}</span>
                        </div>
                      ),
                    )
                  )}
                </div>

                <div className="inspector-section">
                  <h4>
                    Incoming dependencies (
                    {getConnectedEdges(selectedNode.id, "incoming").length})
                  </h4>
                  {getConnectedEdges(selectedNode.id, "incoming").length === 0 ? (
                    <p className="message">No incoming dependencies.</p>
                  ) : (
                    getConnectedEdges(selectedNode.id, "incoming").map(
                      (edge, index) => (
                        <div className="connection-row" key={`${edge.source}-${index}`}>
                          <span>{getRelatedServiceName(edge.source)} →</span>
                          <span className="edge-label">{edge.label}</span>
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}


        
<section className="panel risk-panel">
  <div className="panel-heading">
    <div>
      <p className="eyebrow">RISK ANALYSIS</p>
      <h3>Service Risk Overview</h3>
      <p>Services ranked by calculated risk score</p>
    </div>
    <span className="live-status">RISK API</span>
  </div>

  {riskLoading && (
    <p className="message">Loading service risks...</p>
  )}

  {!riskLoading && riskError && (
    <div className="error-panel">
      <p>Unable to load service risks: {riskError}</p>
      <button onClick={loadRisks}>Try again</button>
    </div>
  )}

  {!riskLoading && !riskError && risks.length === 0 && (
    <p className="message">No service risks available.</p>
  )}

  {!riskLoading && !riskError && risks.length > 0 && (
    <div className="risk-list">
      {risks.map((risk) => {
        const level = (risk.riskLevel || "LOW").toLowerCase();

        return (
          <article className="risk-card" key={risk.service}>
            <div className="risk-card-heading">
              <div>
                <h4>{risk.service}</h4>
                <p>
                  Criticality: {risk.criticality}
                  {" · "}
                  {risk.affectedCount} affected services
                </p>
              </div>

              <div className="risk-score">
                <strong>{risk.riskScore}/100</strong>
                <span className={`risk-badge risk-${level}`}>
                  {risk.riskLevel}
                </span>
              </div>
            </div>

            <div
              className="risk-progress"
              role="progressbar"
              aria-label={`${risk.service} risk score`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={risk.riskScore}
            >
              <div
                className={`risk-progress-fill risk-fill-${level}`}
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, Number(risk.riskScore) || 0)
                  )}%`,
                }}
              />
            </div>
          </article>
        );
      })}
    </div>
  )}
</section>


      <footer>
        TraceGraphAI · Graph data supplied by Spring Boot and FalkorDB
      </footer>
    </main>
  );
}

export default App;
