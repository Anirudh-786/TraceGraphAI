import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

function App() {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState('graph'); // 'overview' | 'graph' | 'impact' | 'ai'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'info'|'success'|'error' }

  // Graph data & risks
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [risks, setRisks] = useState([]);
  const [backendStatus, setBackendStatus] = useState('CHECKING'); // 'UP' | 'DOWN' | 'CHECKING'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Graph interaction state
  const [searchQuery, setSearchQuery] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('ALL');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedServiceRisk, setSelectedServiceRisk] = useState(null);

  // Impact analysis state
  const [selectedService, setSelectedService] = useState('');
  const [impactResult, setImpactResult] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState('');

  // AI assistant state
  const [aiAnswer, setAiAnswer] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiHighlightedServices, setAiHighlightedServices] = useState([]);

  // Demo seeding state
  const [isSeeding, setIsSeeding] = useState(false);

  // Show toast helper
  const showToast = useCallback((message, type = 'info') => {
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
      } catch (healthErr) {
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
        api.getGraph().catch((err) => {
          throw err;
        }),
        api.getAllRisks().catch(() => []),
      ]);

      setGraph(graphData);
      setRisks(risksData);
      setBackendStatus('UP');
    } catch (err) {
      console.error("Failed to load initial graph data:", err);
      setError(err.message || 'Could not connect to TraceGraphAI backend');
      setBackendStatus('DOWN');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived list of all service names
  const allServiceNames = useMemo(() => {
    const names = graph.nodes
      .map((n) => n.properties?.name || n.name || String(n.id))
      .filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [graph.nodes]);

  // Selected node object
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return graph.nodes.find((n) => String(n.id) === String(selectedNodeId)) || null;
  }, [graph.nodes, selectedNodeId]);

  // Fetch individual service risk when node is selected
  useEffect(() => {
    if (!selectedNode) {
      setSelectedServiceRisk(null);
      return;
    }

    const svcName = selectedNode.properties?.name || selectedNode.name || String(selectedNode.id);
    const existing = risks.find((r) => r.service === svcName);
    if (existing) {
      setSelectedServiceRisk(existing);
      return;
    }

    // Otherwise fetch from /risk?service=...
    api.getServiceRisk(svcName)
      .then((data) => setSelectedServiceRisk(data))
      .catch(() => setSelectedServiceRisk(null));
  }, [selectedNode, risks]);

  // Node selection handler from canvas
  const handleNodeSelect = useCallback((node) => {
    if (!node) {
      setSelectedNodeId(null);
      return;
    }
    setSelectedNodeId(node.id);
    const name = node.data?.properties?.name || node.data?.name || node.properties?.name || String(node.id);
    setSelectedService(name);
  }, []);

  // Select node by service name (e.g. from table or inspector chip)
  const handleSelectNodeByName = useCallback((serviceName) => {
    const node = graph.nodes.find((n) => {
      const name = n.properties?.name || n.name || String(n.id);
      return name === serviceName;
    });

    if (node) {
      setSelectedNodeId(node.id);
      setSelectedService(serviceName);
      setActiveTab('graph');
      showToast(`Selected ${serviceName}`, 'info');
    }
  }, [graph.nodes, showToast]);

  // Run impact analysis
  const handleRunImpact = useCallback(async (serviceName) => {
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
      showToast(`Simulated failure for ${target}: ${data.affectedCount} services affected`, 'success');

      // Also ensure that target node is selected in graph
      const targetNode = graph.nodes.find((n) => {
        const name = n.properties?.name || n.name || String(n.id);
        return name === target;
      });
      if (targetNode) {
        setSelectedNodeId(targetNode.id);
      }
    } catch (err) {
      console.error("Impact analysis error:", err);
      setImpactError(err.message || 'Could not complete impact analysis.');
      showToast(err.message || 'Impact analysis failed', 'error');
    } finally {
      setImpactLoading(false);
    }
  }, [selectedService, graph.nodes, showToast]);

  // Clear impact analysis
  const handleClearImpact = useCallback(() => {
    setImpactResult(null);
    setImpactError('');
    setAiHighlightedServices([]);
    showToast('Cleared simulated outage impact', 'info');
  }, [showToast]);

  // Run AI query
  const handleAskAi = useCallback(async (serviceName, question) => {
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
    } catch (err) {
      console.error("AI Assistant error:", err);
      const msg = err.data?.error || err.message || 'Ollama or AI endpoint failed';
      setAiError(msg);
      showToast(msg, 'error');
    } finally {
      setAiLoading(false);
    }
  }, [selectedService, showToast]);

  // Highlight verified AI affected services on graph canvas
  const handleHighlightInGraph = useCallback((targetService, affectedServices) => {
    const names = [
      targetService,
      ...affectedServices.map((aff) =>
        typeof aff === 'string'
          ? aff
          : aff.properties?.name || aff.name || `Service ${aff.id}`
      ),
    ];
    setAiHighlightedServices(names);
    setActiveTab('graph');
    showToast(`Highlighted ${names.length} services on graph canvas`, 'info');
  }, [showToast]);

  // Seed sample demo architecture if graph is empty
  const handleSeedDemoData = useCallback(async () => {
    try {
      setIsSeeding(true);
      showToast('Seeding realistic microservice architecture into FalkorDB...', 'info');

      // 1. Create nodes
      const services = [
        'api-gateway',
        'auth-service',
        'order-service',
        'payment-service',
        'inventory-service',
        'notification-service',
        'database-service',
      ];

      for (const svc of services) {
        await api.createService(svc).catch(() => {});
      }

      // 2. Create relationships
      // In graph semantics: A depends on B
      const deps = [
        { source: 'api-gateway', target: 'auth-service' },
        { source: 'api-gateway', target: 'order-service' },
        { source: 'order-service', target: 'payment-service' },
        { source: 'order-service', target: 'inventory-service' },
        { source: 'order-service', target: 'notification-service' },
        { source: 'payment-service', target: 'database-service' },
        { source: 'inventory-service', target: 'database-service' },
        { source: 'auth-service', target: 'database-service' },
      ];

      for (const dep of deps) {
        await api.createRelationship(dep.source, dep.target).catch(() => {});
      }

      await loadData();
      showToast('Sample microservice architecture seeded successfully!', 'success');
    } catch (err) {
      console.error('Failed to seed demo data:', err);
      showToast('Error seeding sample data: ' + err.message, 'error');
    } finally {
      setIsSeeding(false);
    }
  }, [loadData, showToast]);

  // Dynamic Page Meta
  const pageMeta = useMemo(() => {
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
  const matchingNodesCount = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.trim().toLowerCase();
    return graph.nodes.filter((node) => {
      const name = node.properties?.name || node.name || String(node.id);
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
