import { useEffect, type ReactElement } from 'react';
import {
  IconClose,
  IconZap,
  IconSparkles,
  getServiceIcon,
} from './Icons';
import type { GraphNode, GraphEdge, ServiceRisk, ImpactResult, AffectedService } from '../types';

export interface NodeInspectorProps {
  selectedNode: GraphNode | null;
  allNodes?: GraphNode[];
  allEdges?: GraphEdge[];
  riskData?: ServiceRisk | null;
  impactResult?: ImpactResult | null;
  isImpactLoading?: boolean;
  onClose: () => void;
  onRunImpact: (serviceName: string) => void;
  onSelectNodeByName: (serviceName: string) => void;
  onAskAi: (serviceName: string) => void;
}

export default function NodeInspector({
  selectedNode,
  allNodes = [],
  allEdges = [],
  riskData = null,
  impactResult = null,
  isImpactLoading = false,
  onClose,
  onRunImpact,
  onSelectNodeByName,
  onAskAi,
}: NodeInspectorProps): ReactElement | null {
  // Listen for Escape key to close inspector
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!selectedNode) return null;

  const nodeProperties =
    (selectedNode.properties as Record<string, unknown>) ||
    ((selectedNode.data as Record<string, unknown>)?.properties as Record<string, unknown>) ||
    {};
  const serviceName =
    (nodeProperties.name as string) ||
    ((selectedNode.data as Record<string, unknown>)?.name as string) ||
    `Service ${selectedNode.id}`;
  const nodeId = String(selectedNode.id);
  const labels =
    selectedNode.labels ||
    ((selectedNode.data as Record<string, unknown>)?.labels as string[]) ||
    [];

  // Criticality only when it exists in source data
  const criticality =
    (nodeProperties.criticality as string) || riskData?.criticality;

  // Real Risk metrics
  const riskScore = riskData?.riskScore;
  const riskLevel = riskData?.riskLevel;
  const criticalityScore = riskData?.criticalityScore;
  const impactScore = riskData?.impactScore;
  const totalAffectedFromRisk = riskData?.affectedCount;

  // Calculate connected edges
  // Direction semantics:
  // Edge A -> B with DEPENDS_ON means:
  // - A depends on B (outgoing for A)
  // - B is depended on by A (incoming for B)
  const outgoingDependencies = allEdges
    .filter((edge) => String(edge.source) === nodeId)
    .map((edge) => {
      const targetNode = allNodes.find((n) => String(n.id) === String(edge.target));
      const targetName =
        targetNode?.properties?.name ||
        ((targetNode?.data as Record<string, unknown>)?.properties as Record<string, unknown>)?.name ||
        `Node ${edge.target}`;
      return {
        edgeId: `${edge.source}->${edge.target}`,
        targetId: String(edge.target),
        targetName: String(targetName),
        label: edge.label || 'DEPENDS_ON',
      };
    });

  const incomingDependents = allEdges
    .filter((edge) => String(edge.target) === nodeId)
    .map((edge) => {
      const sourceNode = allNodes.find((n) => String(n.id) === String(edge.source));
      const sourceName =
        sourceNode?.properties?.name ||
        ((sourceNode?.data as Record<string, unknown>)?.properties as Record<string, unknown>)?.name ||
        `Node ${edge.source}`;
      return {
        edgeId: `${edge.source}->${edge.target}`,
        sourceId: String(edge.source),
        sourceName: String(sourceName),
        label: edge.label || 'DEPENDS_ON',
      };
    });

  // Check if impact analysis was run for THIS service
  const isImpactForThisNode = impactResult && impactResult.service === serviceName;
  const affectedServices = isImpactForThisNode ? impactResult.affectedServices || [] : [];

  return (
    <aside className="node-inspector-drawer" aria-label="Service Details Inspector">
      {/* Header */}
      <div className="inspector-topbar">
        <div className="inspector-title-group">
          <div className="inspector-icon-wrap">{getServiceIcon(serviceName)}</div>
          <div>
            <h3 className="inspector-name" title={serviceName}>
              {serviceName}
            </h3>
            <div className="inspector-meta-row">
              <span className="inspector-id">ID: {nodeId}</span>
              {labels.map((l) => (
                <span key={l} className="inspector-label-pill">
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>

        <button
          className="inspector-close-btn"
          onClick={onClose}
          title="Close Inspector (Esc)"
          aria-label="Close Inspector"
        >
          <IconClose size={16} />
        </button>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="inspector-actions-bar">
        <button
          className="action-btn action-simulate-btn"
          onClick={() => onRunImpact(serviceName)}
          disabled={isImpactLoading}
          title="Simulate service failure and calculate blast radius"
        >
          <IconZap size={14} />
          <span>{isImpactLoading ? 'Simulating...' : 'Analyze Outage Impact'}</span>
        </button>

        <button
          className="action-btn action-ai-btn"
          onClick={() => onAskAi(serviceName)}
          title="Ask AI Copilot about this service"
        >
          <IconSparkles size={14} />
          <span>Ask AI Assistant</span>
        </button>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="inspector-body">
        {/* Risk Assessment Section */}
        {riskData && riskData.found !== false && (
          <section className="inspector-card">
            <div className="card-header">
              <span className="card-title">CALCULATED RISK METRICS</span>
              {riskLevel && (
                <span className={`risk-badge risk-${riskLevel.toLowerCase()}`}>
                  {riskLevel} RISK
                </span>
              )}
            </div>

            <div className="risk-score-display">
              <div className="score-number-group">
                <span className="score-big">{riskScore}</span>
                <span className="score-max">/ 100</span>
              </div>
              <div className="score-progress-bar">
                <div
                  className={`score-progress-fill fill-${(riskLevel || 'low').toLowerCase()}`}
                  style={{ width: `${Math.max(0, Math.min(100, riskScore || 0))}%` }}
                />
              </div>
            </div>

            <div className="risk-breakdown-grid">
              <div className="risk-breakdown-item">
                <span className="breakdown-lbl">Criticality Score</span>
                <span className="breakdown-val">{criticalityScore ?? 'N/A'}</span>
              </div>
              <div className="risk-breakdown-item">
                <span className="breakdown-lbl">Impact Score</span>
                <span className="breakdown-val">{impactScore ?? 'N/A'}</span>
              </div>
              <div className="risk-breakdown-item">
                <span className="breakdown-lbl">Dependents</span>
                <span className="breakdown-val">{totalAffectedFromRisk ?? 0}</span>
              </div>
              <div className="risk-breakdown-item">
                <span className="breakdown-lbl">Criticality</span>
                <span className="breakdown-val text-capitalize">
                  {criticality || 'Unspecified'}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Impact Analysis Results (if run for this service) */}
        {isImpactForThisNode && impactResult && (
          <section className="inspector-card card-impact-results">
            <div className="card-header">
              <span className="card-title text-orange">SIMULATED OUTAGE IMPACT</span>
              <span className="impact-count-badge">
                {impactResult.affectedCount} Affected
              </span>
            </div>

            <p className="impact-summary-text">
              If <strong>{serviceName}</strong> fails,{' '}
              <strong>{impactResult.directCount ?? 0}</strong> direct and{' '}
              <strong>{impactResult.indirectCount ?? 0}</strong> indirect dependent services will be
              impacted.
            </p>

            {affectedServices.length > 0 ? (
              <div className="affected-services-list">
                {affectedServices.map((aff, idx) => {
                  const affObj = typeof aff === 'string' ? null : (aff as AffectedService);
                  const affName =
                    typeof aff === 'string'
                      ? aff
                      : affObj?.properties?.name || affObj?.name || `Affected Service ${idx + 1}`;
                  const distance =
                    affObj?.distance || (affObj?.impactType === 'DIRECT' ? 1 : 2);
                  const isDirect = affObj?.impactType === 'DIRECT' || distance === 1;

                  return (
                    <div
                      key={`${affName}-${idx}`}
                      className={`affected-service-row ${isDirect ? 'row-direct' : 'row-indirect'}`}
                      onClick={() => onSelectNodeByName(affName)}
                      title={`Click to focus ${affName} in graph`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="aff-name-col">
                        <span
                          className={`aff-bullet ${isDirect ? 'bullet-direct' : 'bullet-indirect'}`}
                        />
                        <span className="aff-name">{affName}</span>
                      </div>
                      <span
                        className={`aff-dist-badge ${isDirect ? 'badge-direct' : 'badge-indirect'}`}
                      >
                        {isDirect ? 'DIRECT (Hop 1)' : `INDIRECT (Hop ${distance})`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="empty-subtext">No dependent services rely on this node.</p>
            )}
          </section>
        )}

        {/* Incoming Dependents (Services that depend on this service) */}
        <section className="inspector-card">
          <div className="card-header">
            <span className="card-title">INCOMING DEPENDENTS ({incomingDependents.length})</span>
            <span className="card-hint">Services relying on {serviceName}</span>
          </div>

          {incomingDependents.length === 0 ? (
            <p className="empty-subtext">No services directly call or depend on this node.</p>
          ) : (
            <div className="connections-list">
              {incomingDependents.map((dep) => (
                <button
                  key={dep.edgeId}
                  className="connection-chip-btn"
                  onClick={() => onSelectNodeByName(dep.sourceName)}
                  title={`Select ${dep.sourceName}`}
                >
                  <span className="chip-name">{dep.sourceName}</span>
                  <span className="chip-rel">-[{dep.label}]-&gt;</span>
                  <span className="chip-focus-hint">View &rarr;</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Outgoing Dependencies (Services this service depends on) */}
        <section className="inspector-card">
          <div className="card-header">
            <span className="card-title">OUTGOING DEPENDENCIES ({outgoingDependencies.length})</span>
            <span className="card-hint">Services required by {serviceName}</span>
          </div>

          {outgoingDependencies.length === 0 ? (
            <p className="empty-subtext">This service does not depend on any other service.</p>
          ) : (
            <div className="connections-list">
              {outgoingDependencies.map((dep) => (
                <button
                  key={dep.edgeId}
                  className="connection-chip-btn"
                  onClick={() => onSelectNodeByName(dep.targetName)}
                  title={`Select ${dep.targetName}`}
                >
                  <span className="chip-rel">-[{dep.label}]-&gt;</span>
                  <span className="chip-name">{dep.targetName}</span>
                  <span className="chip-focus-hint">View &rarr;</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Raw Graph Properties from FalkorDB */}
        <section className="inspector-card">
          <div className="card-header">
            <span className="card-title">GRAPH PROPERTIES (FalkorDB)</span>
          </div>

          <dl className="inspector-prop-list">
            <div className="prop-row">
              <dt>Node ID</dt>
              <dd>
                <code>{nodeId}</code>
              </dd>
            </div>
            {Object.entries(nodeProperties).map(([k, v]) => (
              <div key={k} className="prop-row">
                <dt>{k}</dt>
                <dd>
                  <code>{typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}</code>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </aside>
  );
}
