import React from 'react';
import {
  IconZap,
  IconClose,
  IconSparkles,
  IconNetwork,
  IconAlertTriangle,
  getServiceIcon,
} from './Icons';

export default function ImpactAnalysisPanel({
  services = [],
  selectedService,
  onSelectService,
  onRunImpact,
  onClearImpact,
  impactResult,
  isLoading = false,
  error = "",
  onNavigateToGraph,
  onAskAiWithService,
}) {
  const isSimulationActive = Boolean(impactResult);
  const affectedList = impactResult?.affectedServices || [];

  return (
    <div className="impact-view-container">
      {/* Top Banner / Heading */}
      <div className="impact-view-header">
        <div className="impact-header-titles">
          <div className="impact-badge-tag">
            <IconZap size={14} />
            <span>OUTAGE SIMULATION &amp; BLAST RADIUS</span>
          </div>
          <h2>Service Failure Cascade Simulator</h2>
          <p>
            Simulate what happens if a core dependency or microservice experiences an outage.
            Trace direct and indirect dependents across your FalkorDB dependency graph.
          </p>
        </div>
      </div>

      {/* Control Bar: Selector & Run Buttons */}
      <div className="impact-controls-card">
        <div className="control-group">
          <label htmlFor="service-select" className="control-label">
            Target Service Outage Scenario:
          </label>
          <div className="select-wrapper">
            <select
              id="service-select"
              value={selectedService}
              onChange={(e) => onSelectService(e.target.value)}
              className="service-dropdown"
              disabled={isLoading}
            >
              <option value="">-- Choose a service to simulate failure --</option>
              {services.map((svc) => (
                <option key={svc} value={svc}>
                  {svc}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="control-buttons-group">
          <button
            className="btn-primary-glow btn-run-impact"
            onClick={() => onRunImpact(selectedService)}
            disabled={!selectedService || isLoading}
          >
            <IconZap size={15} />
            <span>{isLoading ? 'Calculating Blast Radius...' : 'Analyze Impact'}</span>
          </button>

          {isSimulationActive && (
            <button
              className="btn-secondary btn-clear-impact"
              onClick={onClearImpact}
              title="Reset graph styling to normal"
            >
              <IconClose size={14} />
              <span>Clear Analysis</span>
            </button>
          )}

          {isSimulationActive && (
            <button
              className="btn-accent-canvas"
              onClick={onNavigateToGraph}
              title="View the highlighted blast radius on the canvas"
            >
              <IconNetwork size={14} />
              <span>Inspect on Graph Canvas &rarr;</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Panel */}
      {error && (
        <div className="error-banner">
          <IconAlertTriangle size={18} className="text-red" />
          <div className="error-content">
            <strong>Impact Analysis Error</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Simulation Results Display */}
      {impactResult && (
        <div className="impact-results-layout">
          {/* Summary Stat Cards */}
          <div className="impact-metrics-row">
            <div className="impact-metric-card card-target">
              <span className="metric-tag">FAULT INJECTION TARGET</span>
              <strong className="metric-headline text-red">{impactResult.service}</strong>
              <span className="metric-sub">Origin of simulated outage</span>
            </div>

            <div className="impact-metric-card card-total">
              <span className="metric-tag">TOTAL AFFECTED SERVICES</span>
              <strong className="metric-number text-orange">{impactResult.affectedCount}</strong>
              <span className="metric-sub">Dependent services in blast radius</span>
            </div>

            <div className="impact-metric-card card-direct">
              <span className="metric-tag">DIRECT IMPACT</span>
              <strong className="metric-number text-amber">{impactResult.directCount ?? 0}</strong>
              <span className="metric-sub">Directly call target (Distance 1)</span>
            </div>

            <div className="impact-metric-card card-indirect">
              <span className="metric-tag">INDIRECT IMPACT</span>
              <strong className="metric-number text-yellow">{impactResult.indirectCount ?? 0}</strong>
              <span className="metric-sub">Transitive dependents (Distance &gt; 1)</span>
            </div>
          </div>

          {/* Quick AI Explainer CTA Banner */}
          <div className="impact-ai-cta-card">
            <div className="cta-info">
              <div className="cta-icon-wrap">
                <IconSparkles size={18} />
              </div>
              <div>
                <strong>Need an incident briefing for {impactResult.service}?</strong>
                <p>
                  Generate an incident explanation grounded in this FalkorDB evidence with the AI Assistant.
                </p>
              </div>
            </div>
            <button
              className="btn-primary-glow btn-ai-briefing"
              onClick={() => onAskAiWithService(impactResult.service)}
            >
              <IconSparkles size={14} />
              <span>Generate AI Incident Report &rarr;</span>
            </button>
          </div>

          {/* Affected Services Table */}
          <div className="affected-table-card">
            <div className="table-header-row">
              <h3>Affected Dependent Services Breakdown</h3>
              <span className="table-count-label">
                {affectedList.length} {affectedList.length === 1 ? 'service' : 'services'} identified
              </span>
            </div>

            {affectedList.length === 0 ? (
              <div className="no-dependents-box">
                <p>No dependent services found in FalkorDB. This service is a leaf dependency or has zero incoming callers.</p>
              </div>
            ) : (
              <div className="affected-table-container">
                <table className="affected-services-table">
                  <thead>
                    <tr>
                      <th>Service Name</th>
                      <th>Impact Type</th>
                      <th>Graph Distance</th>
                      <th>Labels</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affectedList.map((aff, idx) => {
                      const affName =
                        typeof aff === 'string'
                          ? aff
                          : aff.properties?.name || aff.name || `Affected Service ${idx + 1}`;
                      const distance = aff.distance || (aff.impactType === 'DIRECT' ? 1 : 2);
                      const isDirect = aff.impactType === 'DIRECT' || distance === 1;
                      const labels = aff.labels || [];

                      return (
                        <tr key={`${affName}-${idx}`} className={isDirect ? 'tr-direct' : 'tr-indirect'}>
                          <td className="td-name">
                            <div className="service-name-cell">
                              {getServiceIcon(affName)}
                              <span className="name-bold">{affName}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`impact-badge ${isDirect ? 'badge-direct' : 'badge-indirect'}`}>
                              {isDirect ? 'DIRECT DEPENDENT' : 'INDIRECT DEPENDENT'}
                            </span>
                          </td>
                          <td className="td-distance">
                            <code className="distance-chip">{distance} {distance === 1 ? 'hop' : 'hops'}</code>
                          </td>
                          <td className="td-labels">
                            {labels.length > 0 ? (
                              labels.map((l) => <span key={l} className="label-chip">{l}</span>)
                            ) : (
                              <span className="dim-text">Service</span>
                            )}
                          </td>
                          <td className="td-action">
                            <button
                              className="table-focus-btn"
                              onClick={() => {
                                onSelectService(affName);
                                onNavigateToGraph();
                              }}
                              title={`Focus ${affName} on graph canvas`}
                            >
                              Focus on Graph &rarr;
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="simulation-notice-bar">
              <span className="notice-icon">&bull;</span>
              <span>
                Graph semantics: If A has a <code>DEPENDS_ON</code> edge to B, A depends on B. If B fails, A is impacted.
                Graph distance represents dependency network hops, not severity.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no simulation has been run */}
      {!impactResult && !isLoading && (
        <div className="impact-empty-state">
          <div className="empty-state-icon">
            <IconZap size={36} />
          </div>
          <h3>Ready to Simulate an Outage Scenario</h3>
          <p>
            Select a service from the dropdown above and click <strong>Analyze Impact</strong> to compute the exact blast radius
            using real FalkorDB Cypher queries.
          </p>
          <div className="quick-suggestions">
            <span>Quick test services:</span>
            {services.slice(0, 4).map((svc) => (
              <button
                key={svc}
                className="chip-quick-select"
                onClick={() => {
                  onSelectService(svc);
                  onRunImpact(svc);
                }}
              >
                {svc} &rarr;
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
