import { useState, useEffect, useMemo, useCallback, type ReactElement } from 'react';
import './App.css';
import api from './api';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import GraphCanvas from './components/GraphCanvas';
import NodeInspector from './components/NodeInspector';
import ImpactAnalysisPanel from './components/ImpactAnalysisPanel';
import AiAssistant from './components/AiAssistant';
import OverviewDashboard from './components/OverviewDashboard';
import Toast from './components/Toast';
import type { Node } from '@xyflow/react';
import type {
  ActiveTab,
  BackendStatus,
  GraphData,
  GraphNode,
  ServiceRisk,
  ImpactResult,
  AiResponse,
  ToastData,
  ToastType,
  PageMeta,
  ServiceNodeCustomData,
  AffectedService,
} from './types';

function App(): ReactElement {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('graph');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Graph data & risks
  const [graph, setGraph] = useState<GraphData>({
    application: 'TraceGraphAI',
    graph: 'tracegraph',
    nodes: [],
    edges: [],
  });
  const [risks, setRisks] = useState<ServiceRisk[]>([]);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('CHECKING');
  const [loading, setLoading] = useState<boolean>(true);
  const [, setError] = useState<string>('');

  // Graph interaction state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [relationshipFilter, setRelationshipFilter] = useState<string>('ALL');
  const [selectedNodeId, setSelectedNodeId] = useState<string | number | null>(null);
  const [selectedServiceRisk, setSelectedServiceRisk] = useState<ServiceRisk | null>(null);

  // Impact analysis state
  const [selectedService, setSelectedService] = useState<string>('');
  const [impactResult, setImpactResult] = useState<ImpactResult | null>(null);
  const [impactLoading, setImpactLoading] = useState<boolean>(false);
  const [impactError, setImpactError] = useState<string>('');

  // AI assistant state
  const [aiAnswer, setAiAnswer] = useState<AiResponse | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');
  const [aiHighlightedServices, setAiHighlightedServices] = useState<string[]>([]);

  // Demo seeding state
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  // Show toast helper
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  }, []);

  // Fetch all initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setBackendStatus('CHECKING');

      // Check health
      try {
        await api.getHealth();
        setBackendStatus('UP');
      } catch {
        // If /api/health fails, try /api/graph/test
        try {
          await api.getGraphTest();
          setBackendStatus('UP');
        } catch {
          setBackendStatus('DOWN');
        }
      }

      // Fetch graph & risks concurrently
      const [graphData, risksData] = await Promise.all([
        api.getGraph().catch((err: Error) => {
          throw err;
        }),
        api.getAllRisks().catch(() => [] as ServiceRisk[]),
      ]);

      setGraph(graphData);
      setRisks(risksData);
      setBackendStatus('UP');
    } catch (err: unknown) {
      console.error('Failed to load initial graph data:', err);
      const msg = err instanceof Error ? err.message : 'Could not connect to TraceGraphAI backend';
      setError(msg);
      setBackendStatus('DOWN');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived list of all service names
  const allServiceNames = useMemo<string[]>(() => {
    const names = graph.nodes
      .map((n) => (n.properties?.name as string) || n.name || String(n.id))
      .filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [graph.nodes]);

  // Selected node object
  const selectedNode = useMemo<GraphNode | null>(() => {
    if (!selectedNodeId) return null;
    return graph.nodes.find((n) => String(n.id) === String(selectedNodeId)) || null;
  }, [graph.nodes, selectedNodeId]);

  // Fetch individual service risk when node is selected
  useEffect(() => {
    if (!selectedNode) {
      setSelectedServiceRisk(null);
      return;
    }

    const svcName =
      (selectedNode.properties?.name as string) || selectedNode.name || String(selectedNode.id);
    const existing = risks.find((r) => r.service === svcName);
    if (existing) {
      setSelectedServiceRisk(existing);
      return;
    }

    // Otherwise fetch from /risk?service=...
    api
      .getServiceRisk(svcName)
      .then((data) => setSelectedServiceRisk(data))
      .catch(() => setSelectedServiceRisk(null));
  }, [selectedNode, risks]);

  // Node selection handler from canvas
  const handleNodeSelect = useCallback((node: Node<ServiceNodeCustomData> | null) => {
    if (!node) {
      setSelectedNodeId(null);
      return;
    }
    setSelectedNodeId(node.id);
    const name =
      (node.data?.properties?.name as string) || node.data?.name || String(node.id);
    setSelectedService(name);
  }, []);

  // Select node by service name (e.g. from table or inspector chip)
  const handleSelectNodeByName = useCallback(
    (serviceName: string) => {
      const node = graph.nodes.find((n) => {
        const name = (n.properties?.name as string) || n.name || String(n.id);
        return name === serviceName;
      });

      if (node) {
        setSelectedNodeId(node.id);
        setSelectedService(serviceName);
        setActiveTab('graph');
        showToast(`Selected ${serviceName}`, 'info');
      }
    },
    [graph.nodes, showToast]
  );

  // Run impact analysis
  const handleRunImpact = useCallback(
    async (serviceName?: string) => {
      const target = (serviceName || selectedService).trim();
      if (!target) {
        setImpactError('Please specify a target service for impact simulation.');
        return;
      }

      try {
        setImpactLoading(true);
        setImpactError('');
        setSelectedService(target);

        const data = await api.getServiceImpact(target);
        setImpactResult(data);
        showToast(
          `Simulated failure for ${target}: ${data.affectedCount} services affected`,
          'success'
        );

        // Also ensure that target node is selected in graph
        const targetNode = graph.nodes.find((n) => {
          const name = (n.properties?.name as string) || n.name || String(n.id);
          return name === target;
        });
        if (targetNode) {
          setSelectedNodeId(targetNode.id);
        }
      } catch (err: unknown) {
        console.error('Impact analysis error:', err);
        const msg = err instanceof Error ? err.message : 'Could not complete impact analysis.';
        setImpactError(msg);
        showToast(msg, 'error');
      } finally {
        setImpactLoading(false);
      }
    },
    [selectedService, graph.nodes, showToast]
  );

  // Clear impact analysis
  const handleClearImpact = useCallback(() => {
    setImpactResult(null);
    setImpactError('');
    setAiHighlightedServices([]);
    showToast('Cleared simulated outage impact', 'info');
  }, [showToast]);

  // Run AI query
  const handleAskAi = useCallback(
    async (serviceName: string, question: string) => {
      const target = (serviceName || selectedService).trim();
      if (!target) {
        setAiError('Please pick a service to investigate.');
        return;
      }

      try {
        setAiLoading(true);
        setAiError('');
        setAiAnswer(null);

        const data = await api.askAi(target, question);
        setAiAnswer(data);
        showToast(`AI incident explanation generated for ${target}`, 'success');
      } catch (err: unknown) {
        console.error('AI Assistant error:', err);
        const errorObj = err as { data?: { error?: string }; message?: string };
        const msg = errorObj.data?.error || errorObj.message || 'Ollama or AI endpoint failed';
        setAiError(msg);
        showToast(msg, 'error');
      } finally {
        setAiLoading(false);
      }
    },
    [selectedService, showToast]
  );

  // Highlight verified AI affected services on graph canvas
  const handleHighlightInGraph = useCallback(
    (targetService: string, affectedServices: (AffectedService | string)[]) => {
      const names = [
        targetService,
        ...affectedServices.map((aff) => {
          if (typeof aff === 'string') return aff;
          return aff.properties?.name || aff.name || `Service ${aff.id}`;
        }),
      ];
      setAiHighlightedServices(names);
      setActiveTab('graph');
      showToast(`Highlighted ${names.length} services on graph canvas`, 'info');
    },
    [showToast]
  );

  // Seed sample demo architecture into FalkorDB
  const handleSeedDemoData = useCallback(async () => {
    try {
      setIsSeeding(true);
      showToast('Seeding realistic microservice architecture into FalkorDB...', 'info');

      // Try dedicated backend seed endpoint first
      try {
        await api.seedExpandedGraph();
      } catch {
        // Fallback: seed through sequential API calls
        const services = [
          'frontend-service',
          'api-gateway',
          'authentication-service',
          'user-service',
          'product-service',
          'inventory-service',
          'cart-service',
          'order-service',
          'payment-service',
          'notification-service',
          'shipping-service',
          'database-service',
          'cache-service',
          'message-queue',
          'search-service',
          'object-storage-service',
          'email-provider',
        ];

        for (const svc of services) {
          await api.createService(svc).catch(() => {});
        }

        const deps = [
          { source: 'frontend-service', target: 'api-gateway' },
          { source: 'api-gateway', target: 'authentication-service' },
          { source: 'api-gateway', target: 'product-service' },
          { source: 'api-gateway', target: 'cart-service' },
          { source: 'api-gateway', target: 'order-service' },
          { source: 'order-service', target: 'payment-service' },
          { source: 'order-service', target: 'inventory-service' },
          { source: 'order-service', target: 'shipping-service' },
          { source: 'payment-service', target: 'database-service' },
          { source: 'inventory-service', target: 'database-service' },
          { source: 'user-service', target: 'database-service' },
          { source: 'product-service', target: 'database-service' },
          { source: 'product-service', target: 'search-service' },
          { source: 'cart-service', target: 'cache-service' },
          { source: 'cart-service', target: 'database-service' },
          { source: 'order-service', target: 'message-queue' },
          { source: 'notification-service', target: 'message-queue' },
          { source: 'notification-service', target: 'email-provider' },
          { source: 'shipping-service', target: 'message-queue' },
        ];

        for (const dep of deps) {
          await api.createRelationship(dep.source, dep.target).catch(() => {});
        }
      }

      await loadData();
      showToast('Sample microservice architecture seeded successfully!', 'success');
    } catch (err: unknown) {
      console.error('Failed to seed demo data:', err);
      const msg = err instanceof Error ? err.message : String(err);
      showToast('Error seeding sample data: ' + msg, 'error');
    } finally {
      setIsSeeding(false);
    }
  }, [loadData, showToast]);

  // Dynamic Page Meta
  const pageMeta = useMemo<PageMeta>(() => {
    switch (activeTab) {
      case 'overview':
        return {
          title: 'System Overview',
          subtitle: 'Architecture topology metrics & calculated risk rankings',
        };
      case 'impact':
        return {
          title: 'Impact Analysis',
          subtitle: 'Simulate service failure blast radii & cascade paths',
        };
      case 'ai':
        return {
          title: 'AI Incident Assistant',
          subtitle: 'Local Ollama copilot grounded in FalkorDB graph evidence',
        };
      case 'graph':
      default:
        return {
          title: 'Service Dependency Graph',
          subtitle: 'Interactive architecture map & outage blast radius',
        };
    }
  }, [activeTab]);

  // Count search matches
  const matchingNodesCount = useMemo<number | null>(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.trim().toLowerCase();
    return graph.nodes.filter((node) => {
      const name = (node.properties?.name as string) || node.name || String(node.id);
      return (
        name.toLowerCase().includes(q) ||
        String(node.id).includes(q) ||
        (node.labels || []).some((l) => l.toLowerCase().includes(q))
      );
    }).length;
  }, [graph.nodes, searchQuery]);

  return (
    <div className="app-root-layout">
      {/* Toast Feedback */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        backendStatus={backendStatus}
        stats={{ nodes: graph.nodes.length, relationships: graph.edges.length }}
        onResetGraphSelection={() => setSelectedNodeId(null)}
      />

      {/* Main Content Area */}
      <div className="main-viewport">
        {/* Top Navigation Bar */}
        <TopNav
          activeTab={activeTab}
          pageMeta={pageMeta}
          backendStatus={backendStatus}
          nodeCount={graph.nodes.length}
          edgeCount={graph.edges.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={() => {
            loadData();
            showToast('Refreshed graph and risk scores', 'info');
          }}
          isLoading={loading}
          matchingNodesCount={matchingNodesCount}
        />

        {/* Tab View Container */}
        <div className="tab-content-area">
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'overview' && (
            <OverviewDashboard
              nodes={graph.nodes}
              edges={graph.edges}
              risks={risks}
              onSelectService={(svc) => setSelectedService(svc)}
              onNavigateToGraph={(svc) => {
                handleSelectNodeByName(svc);
                setActiveTab('graph');
              }}
              onNavigateToImpact={(svc) => {
                setSelectedService(svc);
                setActiveTab('impact');
                handleRunImpact(svc);
              }}
            />
          )}

          {/* TAB 2: INTERACTIVE DEPENDENCY GRAPH */}
          {activeTab === 'graph' && (
            <>
              <GraphCanvas
                rawNodes={graph.nodes}
                rawEdges={graph.edges}
                risks={risks}
                selectedNodeId={selectedNodeId}
                onNodeSelect={handleNodeSelect}
                impactResult={impactResult}
                searchQuery={searchQuery}
                aiHighlightedServices={aiHighlightedServices}
                relationshipFilter={relationshipFilter}
                onRelationshipFilterChange={setRelationshipFilter}
                onSeedDemoData={handleSeedDemoData}
                isSeeding={isSeeding}
                backendStatus={backendStatus}
              />

              {/* Node Inspector Drawer */}
              {selectedNode && (
                <NodeInspector
                  selectedNode={selectedNode}
                  allNodes={graph.nodes}
                  allEdges={graph.edges}
                  riskData={selectedServiceRisk}
                  impactResult={impactResult}
                  isImpactLoading={impactLoading}
                  onClose={() => setSelectedNodeId(null)}
                  onRunImpact={(svc) => {
                    handleRunImpact(svc);
                  }}
                  onSelectNodeByName={handleSelectNodeByName}
                  onAskAi={(svc) => {
                    setSelectedService(svc);
                    setActiveTab('ai');
                  }}
                />
              )}
            </>
          )}

          {/* TAB 3: IMPACT ANALYSIS */}
          {activeTab === 'impact' && (
            <ImpactAnalysisPanel
              services={allServiceNames}
              selectedService={selectedService}
              onSelectService={(svc) => setSelectedService(svc)}
              onRunImpact={handleRunImpact}
              onClearImpact={handleClearImpact}
              impactResult={impactResult}
              isLoading={impactLoading}
              error={impactError}
              onNavigateToGraph={() => setActiveTab('graph')}
              onAskAiWithService={(svc) => {
                setSelectedService(svc);
                setActiveTab('ai');
              }}
            />
          )}

          {/* TAB 4: AI INCIDENT ASSISTANT */}
          {activeTab === 'ai' && (
            <AiAssistant
              services={allServiceNames}
              selectedService={selectedService}
              onSelectService={(svc) => setSelectedService(svc)}
              aiAnswer={aiAnswer}
              aiLoading={aiLoading}
              aiError={aiError}
              onAskAi={handleAskAi}
              onHighlightInGraph={handleHighlightInGraph}
              topRiskService={risks[0]?.service || ''}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
