import React from 'react';
import {
  IconNetwork,
  IconZap,
  IconAlertTriangle,
  IconLayers,
  IconShield,
  IconArrowRight,
  getServiceIcon,
} from './Icons';

export default function OverviewDashboard({
  nodes = [],
  edges = [],
  risks = [],
  onSelectService,
  onNavigateToGraph,
  onNavigateToImpact,
}) {
  const totalNodes = nodes.length;
  const totalEdges = edges.length;

  const highRiskCount = risks.filter((r) => r.riskLevel === 'HIGH' || (r.riskScore >= 70)).length;
  const medRiskCount = risks.filter((r) => r.riskLevel === 'MEDIUM' || (r.riskScore >= 40 && r.riskScore < 70)).length;
  const lowRiskCount = risks.filter((r) => r.riskLevel === 'LOW' || (r.riskScore < 40)).length;

  const topRiskService = risks.length > 0 ? risks[0] : null;

  return (
    <div className="overview-container">
      {/* Overview Header */}
      <div className="overview-header">
        <div className="overview-tag">
          <IconLayers size={14} />
          <span>ARCHITECTURE OVERVIEW</span>
        </div>
        <h2>Service Graph Intelligence Dashboard</h2>
        <p>
          High-level topology metrics and calculated risk rankings derived from your active FalkorDB graph.
        </p>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">TOTAL SERVICES</span>
            <div className="kpi-icon-wrap icon-indigo">
              <IconNetwork size={16} />
            </div>
          </div>
          <strong className="kpi-value">{totalNodes}</strong>
          <span className="kpi-hint">Distinct microservices &amp; data stores</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">DEPENDENCY EDGES</span>
            <div className="kpi-icon-wrap icon-cyan">
              <IconLayers size={16} />
            </div>
          </div>
          <strong className="kpi-value">{totalEdges}</strong>
          <span className="kpi-hint">Explicit DEPENDS_ON relationships</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">HIGH RISK SERVICES</span>
            <div className="kpi-icon-wrap icon-red">
              <IconAlertTriangle size={16} />
            </div>
          </div>
          <strong className="kpi-value text-red">{highRiskCount}</strong>
          <span className="kpi-hint">Risk score &ge; 70 / 100</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">MED / LOW RISK</span>
            <div className="kpi-icon-wrap icon-green">
              <IconShield size={16} />
            </div>
          </div>
          <div className="kpi-multi-values">
            <span className="text-amber"><strong>{medRiskCount}</strong> Med</span>
            <span className="text-dim">/</span>
            <span className="text-green"><strong>{lowRiskCount}</strong> Low</span>
          </div>
          <span className="kpi-hint">Lower criticality or blast radius</span>
        </div>
      </div>

      {/* Spotlight on Highest Risk Service */}
      {topRiskService && (
        <div className="top-risk-spotlight-card">
          <div className="spotlight-badge-row">
            <span className="spotlight-badge">CRITICALITY SPOTLIGHT &bull; HIGHEST SYSTEM RISK</span>
            <span className="spotlight-risk-pill badge-risk-high">
              {topRiskService.riskLevel} RISK ({topRiskService.riskScore}/100)
            </span>
          </div>

          <div className="spotlight-content-row">
            <div className="spotlight-meta">
              <div className="spotlight-service-title">
                {getServiceIcon(topRiskService.service)}
                <h3>{topRiskService.service}</h3>
              </div>
              <p className="spotlight-desc">
                This service has the highest calculated blast radius in your graph. An outage here directly or indirectly cascades to <strong>{topRiskService.affectedCount}</strong> dependent services.
              </p>
              <div className="spotlight-stats-pills">
                <span className="pill-item">Criticality: <strong>{topRiskService.criticality || 'Medium'}</strong></span>
                <span className="pill-item">Impacted Dependents: <strong>{topRiskService.affectedCount} services</strong></span>
                <span className="pill-item">Criticality Score: <strong>{topRiskService.criticalityScore} pts</strong></span>
                <span className="pill-item">Impact Score: <strong>{topRiskService.impactScore} pts</strong></span>
              </div>
            </div>

            <div className="spotlight-actions">
              <button
                className="btn-primary-glow btn-spotlight-action"
                onClick={() => {
                  onSelectService(topRiskService.service);
                  onNavigateToImpact(topRiskService.service);
                }}
              >
                <IconZap size={14} />
                <span>Simulate Failure Blast Radius &rarr;</span>
              </button>
              <button
                className="btn-secondary btn-spotlight-action"
                onClick={() => {
                  onSelectService(topRiskService.service);
                  onNavigateToGraph(topRiskService.service);
                }}
              >
                <IconNetwork size={14} />
                <span>Locate on Graph Canvas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Risk Ranking Inventory Table */}
      <div className="overview-table-card">
        <div className="table-header-row">
          <div>
            <h3>All Services Architecture &amp; Risk Ranking</h3>
            <p className="table-subtext">Derived from Spring Boot /risk and /api/graph/risks endpoints</p>
          </div>
          <span className="table-count-label">{risks.length} Services Evaluated</span>
        </div>

        {risks.length === 0 ? (
          <div className="empty-subtext py-4">No risk data available from the backend.</div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="overview-risk-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Service</th>
                  <th>Risk Score</th>
                  <th>Risk Level</th>
                  <th>Criticality</th>
                  <th>Affected Dependents</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((item, index) => {
                  const level = (item.riskLevel || 'low').toLowerCase();
                  return (
                    <tr key={item.service} className={`tr-risk-${level}`}>
                      <td className="td-rank">#{index + 1}</td>
                      <td className="td-service">
                        <div className="service-name-cell">
                          {getServiceIcon(item.service)}
                          <span className="name-bold">{item.service}</span>
                        </div>
                      </td>
                      <td className="td-score">
                        <div className="score-mini-bar">
                          <strong>{item.riskScore}</strong>
                          <div className="bar-track">
                            <div
                              className={`bar-fill fill-${level}`}
                              style={{ width: `${item.riskScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`risk-badge badge-risk-${level}`}>
                          {item.riskLevel}
                        </span>
                      </td>
                      <td className="td-crit text-capitalize">
                        {item.criticality || 'Unspecified'}
                      </td>
                      <td className="td-dependents">
                        <strong>{item.affectedCount}</strong> services
                      </td>
                      <td className="td-actions">
                        <button
                          className="table-action-btn"
                          onClick={() => {
                            onSelectService(item.service);
                            onNavigateToGraph(item.service);
                          }}
                          title={`Inspect ${item.service} on graph`}
                        >
                          Graph
                        </button>
                        <button
                          className="table-action-btn action-btn-impact"
                          onClick={() => {
                            onSelectService(item.service);
                            onNavigateToImpact(item.service);
                          }}
                          title={`Simulate failure of ${item.service}`}
                        >
                          Simulate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
