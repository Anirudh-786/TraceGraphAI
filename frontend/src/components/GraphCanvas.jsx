import React, { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ServiceNode from './ServiceNode';
import { calculateGraphLayout } from '../utils/graphLayout';
import {
  IconFitView,
  IconRefresh,
  IconFilter,
  IconAlertTriangle,
  IconNetwork,
  IconZap,
} from './Icons';

const nodeTypes = {
  serviceNode: ServiceNode,
};

function InnerGraphCanvas({
  rawNodes = [],
  rawEdges = [],
  risks = [],
  selectedNodeId = null,
  onNodeSelect,
  impactResult = null,
  searchQuery = "",
  aiHighlightedServices = [],
  relationshipFilter = "ALL",
  onRelationshipFilterChange,
  onSeedDemoData,
  isSeeding = false,
  backendStatus = "UP",
}) {
  const { fitView } = useReactFlow();

  // Create risk map by service name
  const riskMap = useMemo(() => {
    const map = new Map();
    risks.forEach((r) => {
      if (r.service) map.set(r.service, r);
    });
    return map;
  }, [risks]);

  // Create impact map: serviceName -> { isOrigin, impactType, distance }
  const impactMap = useMemo(() => {
    const map = new Map();
    if (!impactResult || !impactResult.service) return map;

    // Origin
    map.set(impactResult.service, {
      isOrigin: true,
      impactType: null,
      distance: 0,
    });

    // Dependents
    const affected = impactResult.affectedServices || [];
    affected.forEach((aff) => {
      const name =
        typeof aff === 'string'
          ? aff
          : aff.properties?.name || aff.name || `Service ${aff.id}`;
      const distance = aff.distance || (aff.impactType === 'DIRECT' ? 1 : 2);
      map.set(name, {
        isOrigin: false,
        impactType: aff.impactType || (distance === 1 ? 'DIRECT' : 'INDIRECT'),
        distance,
      });
    });

    return map;
  }, [impactResult]);

  // Compute React Flow nodes with layout
  const initialNodes = useMemo(() => {
    return calculateGraphLayout(rawNodes, rawEdges);
  }, [rawNodes, rawEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Filter edges by relationship type
  const availableRelTypes = useMemo(() => {
    const types = new Set(rawEdges.map((e) => e.label || 'DEPENDS_ON'));
    return Array.from(types).sort();
  }, [rawEdges]);

  // Sync and enrich nodes when layout or states change
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    const hasActiveImpact = impactMap.size > 0;

    const enriched = initialNodes.map((node) => {
      const svcName = node.data.properties?.name || node.data.name || node.id;
      const riskData = riskMap.get(svcName) || null;
      const impactInfo = impactMap.get(svcName);

      // Search match
      const isSearchMatch = Boolean(
        query &&
        (svcName.toLowerCase().includes(query) ||
         String(node.id).includes(query) ||
         (node.data.labels || []).some((l) => l.toLowerCase().includes(query)))
      );

      // AI highlight
      const isAiHighlighted = aiHighlightedServices.includes(svcName);

      // Dimming: if impact simulation is active, dim nodes not involved in blast radius
      const isDimmed = hasActiveImpact && !impactInfo;

      return {
        ...node,
        selected: String(node.id) === String(selectedNodeId),
        data: {
          ...node.data,
          riskData,
          isFailureOrigin: impactInfo?.isOrigin,
          impactType: impactInfo?.impactType,
          impactDistance: impactInfo?.distance,
          isSearchMatch,
          isDimmed,
          isAiHighlighted,
        },
      };
    });

    setNodes(enriched);
  }, [initialNodes, selectedNodeId, riskMap, impactMap, searchQuery, aiHighlightedServices, setNodes]);

  // Sync and enrich edges
  useEffect(() => {
    const filtered = rawEdges.filter((edge) => {
      if (relationshipFilter === 'ALL') return true;
      return (edge.label || 'DEPENDS_ON') === relationshipFilter;
    });

    const flowEdges = filtered.map((edge) => {
      const sourceId = String(edge.source);
      const targetId = String(edge.target);
      const edgeId = `${sourceId}->${targetId}:${edge.label || 'DEPENDS_ON'}`;

      // Check if this edge is in the active impact cascade
      const sourceNode = rawNodes.find((n) => String(n.id) === sourceId);
      const targetNode = rawNodes.find((n) => String(n.id) === targetId);

      const sourceName = sourceNode?.properties?.name || sourceId;
      const targetName = targetNode?.properties?.name || targetId;

      // In Cypher: (affected)-[:DEPENDS_ON*]->(target)
      // Edge goes source -> target. If target is failure origin or affected, and source is affected:
      const isTargetInImpact = impactMap.has(targetName);
      const isSourceInImpact = impactMap.has(sourceName);
      const isImpactEdge = isTargetInImpact && isSourceInImpact;

      return {
        id: edgeId,
        source: sourceId,
        target: targetId,
        label: edge.label || 'DEPENDS_ON',
        animated: isImpactEdge,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: isImpactEdge ? '#f97316' : '#475569',
        },
        style: {
          stroke: isImpactEdge ? '#f97316' : '#334155',
          strokeWidth: isImpactEdge ? 2.5 : 1.5,
        },
        labelStyle: {
          fill: isImpactEdge ? '#fdba74' : '#94a3b8',
          fontWeight: 600,
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
        },
        labelBgStyle: {
          fill: '#090e17',
          stroke: isImpactEdge ? 'rgba(249, 115, 22, 0.4)' : 'rgba(51, 65, 85, 0.4)',
          rx: 4,
          ry: 4,
        },
      };
    });

    setEdges(flowEdges);
  }, [rawEdges, rawNodes, relationshipFilter, impactMap, setEdges]);

  // Node click handler
  const handleNodeClick = useCallback(
    (_, node) => {
      if (onNodeSelect) {
        onNodeSelect(node);
      }
    },
    [onNodeSelect]
  );

  // Pane click handler (deselect)
  const handlePaneClick = useCallback(() => {
    if (onNodeSelect) {
      onNodeSelect(null);
    }
  }, [onNodeSelect]);

  // Fit view handler
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 400 });
  }, [fitView]);

  // Reset layout handler
  const handleResetLayout = useCallback(() => {
    const freshlyLayouted = calculateGraphLayout(rawNodes, rawEdges);
    setNodes(freshlyLayouted);
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 });
    }, 50);
  }, [rawNodes, rawEdges, setNodes, fitView]);

  // MiniMap node color logic
  const getMiniMapNodeColor = useCallback(
    (node) => {
      if (node.data?.isFailureOrigin) return '#f43f5e';
      if (node.data?.impactType === 'DIRECT') return '#f97316';
      if (node.data?.impactType === 'INDIRECT') return '#fbbf24';
      if (node.selected) return '#8b5cf6';
      const risk = node.data?.riskData?.riskLevel;
      if (risk === 'HIGH') return '#ef4444';
      if (risk === 'MEDIUM') return '#f59e0b';
      return '#3b82f6';
    },
    []
  );

  // Initial fit view
  useEffect(() => {
    if (rawNodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [rawNodes.length, fitView]);

  // Empty state if 0 nodes
  if (rawNodes.length === 0) {
    return (
      <div className="graph-empty-container">
        <div className="graph-empty-box">
          <div className="empty-icon-ring">
            <IconNetwork size={36} />
          </div>
          <h3>FalkorDB Graph is Empty</h3>
          <p>
            No service nodes or dependency relationships were found in the <code>tracegraph</code> graph.
          </p>

          <div className="empty-curl-guide">
            <span className="guide-title">You can add services via the backend API:</span>
            <pre>
{`POST http://localhost:8080/api/graph/nodes
{ "name": "payment-service" }

POST http://localhost:8080/api/graph/nodes
{ "name": "database-service" }

POST http://localhost:8080/api/graph/relationships
{ "source": "payment-service", "target": "database-service" }`}
            </pre>
          </div>

          {onSeedDemoData && backendStatus === 'UP' && (
            <button
              className="btn-primary-glow btn-seed-demo"
              onClick={onSeedDemoData}
              disabled={isSeeding}
            >
              <IconZap size={14} />
              <span>{isSeeding ? 'Seeding Demo Services...' : 'Seed Sample Architecture Demo'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="graph-flow-wrapper">
      {/* Floating Canvas Controls Overlay */}
      <div className="canvas-floating-toolbar">
        <button
          className="canvas-tool-btn"
          onClick={handleFitView}
          title="Fit graph to view"
          aria-label="Fit graph to view"
        >
          <IconFitView size={14} />
          <span>Fit View</span>
        </button>

        <button
          className="canvas-tool-btn"
          onClick={handleResetLayout}
          title="Reset hierarchical layout"
          aria-label="Reset hierarchical layout"
        >
          <IconRefresh size={14} />
          <span>Auto Layout</span>
        </button>

        {availableRelTypes.length > 1 && (
          <div className="canvas-rel-filter">
            <IconFilter size={13} className="text-muted" />
            <select
              value={relationshipFilter}
              onChange={(e) => onRelationshipFilterChange(e.target.value)}
              className="canvas-select"
            >
              <option value="ALL">All Edges ({rawEdges.length})</option>
              {availableRelTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Semantic Notice Pill */}
      <div className="canvas-semantic-pill" title="Graph dependency semantics">
        <span className="pill-dot" />
        <span>A &rarr; B means <code>A depends on B</code></span>
      </div>

      {/* React Flow Core Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background color="#1e293b" gap={24} size={1} />
        <Controls
          showInteractive={false}
          className="react-flow-controls-custom"
        />
        <MiniMap
          nodeColor={getMiniMapNodeColor}
          nodeStrokeWidth={2}
          nodeBorderRadius={4}
          maskColor="rgba(9, 14, 23, 0.75)"
          className="react-flow-minimap-custom"
        />
      </ReactFlow>
    </div>
  );
}

export default function GraphCanvas(props) {
  return (
    <ReactFlowProvider>
      <InnerGraphCanvas {...props} />
    </ReactFlowProvider>
  );
}
