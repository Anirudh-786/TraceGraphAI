import { memo, type ReactElement } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { getServiceIcon } from './Icons';
import type { ServiceNodeCustomData } from '../types';

export type ServiceNodeType = Node<ServiceNodeCustomData, 'serviceNode'>;

function ServiceNodeComponent({
  id,
  data,
  selected,
}: NodeProps<ServiceNodeType>): ReactElement {
  const serviceName =
    data.properties?.name || data.name || (data.id ? `Service ${data.id}` : `Service ${id}`);
  const criticality =
    data.properties?.criticality || data.riskData?.criticality;
  const riskScore = data.riskData?.riskScore;
  const riskLevel = data.riskData?.riskLevel;

  // Impact states passed from parent
  const isFailureOrigin = Boolean(data.isFailureOrigin);
  const impactType = data.impactType; // "DIRECT" or "INDIRECT" or null
  const impactDistance = data.impactDistance; // number
  const isSearchMatch = Boolean(data.isSearchMatch);
  const isDimmed = Boolean(data.isDimmed);
  const isAiHighlighted = Boolean(data.isAiHighlighted);

  // Accessible risk class
  let riskBadgeClass = '';
  if (riskLevel === 'HIGH' || (riskScore !== undefined && riskScore >= 70)) {
    riskBadgeClass = 'badge-risk-high';
  } else if (riskLevel === 'MEDIUM' || (riskScore !== undefined && riskScore >= 40)) {
    riskBadgeClass = 'badge-risk-medium';
  } else if (riskLevel === 'LOW' || (riskScore !== undefined && riskScore < 40)) {
    riskBadgeClass = 'badge-risk-low';
  }

  // Criticality class
  let critClass = '';
  if (criticality) {
    const c = String(criticality).toLowerCase();
    if (c === 'high') critClass = 'badge-crit-high';
    else if (c === 'medium') critClass = 'badge-crit-medium';
    else if (c === 'low') critClass = 'badge-crit-low';
  }

  // Compose dynamic class name
  const classNames = [
    'service-node-card',
    selected ? 'node-selected' : '',
    isFailureOrigin ? 'node-failure-origin' : '',
    impactType === 'DIRECT' ? 'node-direct-impact' : '',
    impactType === 'INDIRECT' ? 'node-indirect-impact' : '',
    isDimmed ? 'node-dimmed' : '',
    isSearchMatch ? 'node-search-match' : '',
    isAiHighlighted ? 'node-ai-highlight' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      tabIndex={0}
      role="button"
      aria-label={`Service ${serviceName}, ID ${id}${riskLevel ? `, Risk ${riskLevel}` : ''}${impactType ? `, Impact ${impactType}` : ''}`}
    >
      {/* React Flow handles for incoming & outgoing dependency edges */}
      {/* A depends on B: edge goes from A to B. So A connects via source, B receives via target */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="flow-handle handle-target"
        title="Incoming dependency target (services depending on this)"
      />

      {/* Top badges bar */}
      <div className="node-header">
        <div className="node-icon-wrapper" title={`Type: ${data.labels?.[0] || 'Service'}`}>
          {getServiceIcon(serviceName)}
        </div>

        <div className="node-badges-group">
          {/* Criticality only if present in data */}
          {criticality && (
            <span className={`node-badge ${critClass}`} title={`Criticality: ${criticality}`}>
              {criticality}
            </span>
          )}

          {/* Risk Level / Score only if supplied by risk API */}
          {riskScore !== undefined && riskScore !== null && (
            <span
              className={`node-badge ${riskBadgeClass}`}
              title={`Risk Score: ${riskScore}/100 (${riskLevel || 'Calculated'})`}
            >
              {riskScore}/100
            </span>
          )}
        </div>
      </div>

      {/* Service Name */}
      <div className="node-name-wrapper">
        <h4 className="node-service-name" title={serviceName}>
          {serviceName}
        </h4>
        <span className="node-service-id">ID: {id}</span>
      </div>

      {/* Dynamic Status Banner for Simulation or Inspection */}
      {isFailureOrigin && (
        <div className="node-status-banner banner-origin">
          <span className="status-dot dot-origin" />
          <span>OUTAGE ORIGIN</span>
        </div>
      )}

      {impactType === 'DIRECT' && (
        <div className="node-status-banner banner-direct">
          <span className="status-dot dot-direct" />
          <span>DIRECT IMPACT (Dist: 1)</span>
        </div>
      )}

      {impactType === 'INDIRECT' && (
        <div className="node-status-banner banner-indirect">
          <span className="status-dot dot-indirect" />
          <span>INDIRECT IMPACT (Dist: {impactDistance})</span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="flow-handle handle-source"
        title="Outgoing dependency source (this service depends on target)"
      />
    </div>
  );
}

export default memo(ServiceNodeComponent);
