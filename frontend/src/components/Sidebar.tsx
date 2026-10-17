import type { ReactElement } from 'react';
import {
  IconDashboard,
  IconNetwork,
  IconZap,
  IconSparkles,
  IconChevronLeft,
  IconChevronRight,
  IconCpu,
} from './Icons';
import type { ActiveTab, BackendStatus } from '../types';

export interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  backendStatus: BackendStatus;
  stats?: { nodes: number; relationships: number };
  onResetGraphSelection?: () => void;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  desc: string;
  icon: ReactElement;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  backendStatus,
  stats = { nodes: 0, relationships: 0 },
  onResetGraphSelection,
}: SidebarProps): ReactElement {
  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      desc: 'System health & risks',
      icon: <IconDashboard size={18} />,
    },
    {
      id: 'graph',
      label: 'Dependency Graph',
      desc: 'Interactive topology',
      icon: <IconNetwork size={18} />,
    },
    {
      id: 'impact',
      label: 'Impact Analysis',
      desc: 'Simulate blast radius',
      icon: <IconZap size={18} />,
    },
    {
      id: 'ai',
      label: 'AI Assistant',
      desc: 'Incident copilot',
      icon: <IconSparkles size={18} />,
    },
  ];

  return (
    <aside className={`app-sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div
          className="brand-logo"
          onClick={() => {
            setActiveTab('graph');
            if (onResetGraphSelection) onResetGraphSelection();
          }}
          title="TraceGraphAI"
          role="button"
          tabIndex={0}
        >
          <div className="brand-icon-hex">
            <IconCpu size={20} />
          </div>
          {!isCollapsed && (
            <div className="brand-meta">
              <span className="brand-title">TraceGraphAI</span>
              <span className="brand-badge">GRAPH INTELLIGENCE</span>
            </div>
          )}
        </div>

        <button
          className="collapse-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav" aria-label="Main Navigation">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                if (item.id === 'graph' && onResetGraphSelection) {
                  onResetGraphSelection();
                }
              }}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && (
                <div className="nav-text">
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-desc">{item.desc}</span>
                </div>
              )}
              {isActive && <span className="nav-active-pip" />}
            </button>
          );
        })}
      </nav>

      {/* Middle Spacer */}
      <div className="sidebar-spacer" />

      {/* Compact Graph Legend */}
      {!isCollapsed && (
        <div className="sidebar-legend-card">
          <div className="legend-header">
            <span>GRAPH LEGEND</span>
          </div>
          <div className="legend-items">
            <div className="legend-row">
              <span className="legend-dot dot-origin" />
              <span>Simulated Outage Root</span>
            </div>
            <div className="legend-row">
              <span className="legend-dot dot-direct" />
              <span>Direct Dependent (Dist 1)</span>
            </div>
            <div className="legend-row">
              <span className="legend-dot dot-indirect" />
              <span>Indirect Dependent (Dist &gt; 1)</span>
            </div>
            <div className="legend-row">
              <span className="legend-dot dot-risk-high" />
              <span>High Risk Service (&ge; 70)</span>
            </div>
            <div className="legend-row">
              <span className="legend-dot dot-selected" />
              <span>Selected Node</span>
            </div>
          </div>
        </div>
      )}

      {/* Backend / Database Connection Status Footer */}
      <div className="sidebar-status-box">
        <div className="status-indicator-row">
          <div className="status-ping-wrap">
            <span
              className={`status-pulse ${
                backendStatus === 'UP'
                  ? 'pulse-green'
                  : backendStatus === 'CHECKING'
                  ? 'pulse-amber'
                  : 'pulse-red'
              }`}
            />
            <span
              className={`status-dot ${
                backendStatus === 'UP'
                  ? 'dot-up'
                  : backendStatus === 'CHECKING'
                  ? 'dot-checking'
                  : 'dot-down'
              }`}
            />
          </div>
          {!isCollapsed && (
            <div className="status-info">
              <span className="status-title">
                {backendStatus === 'UP'
                  ? 'FalkorDB Connected'
                  : backendStatus === 'CHECKING'
                  ? 'Connecting...'
                  : 'Backend Offline'}
              </span>
              <span className="status-sub">
                {backendStatus === 'UP'
                  ? `tracegraph · ${stats.nodes} nodes, ${stats.relationships} edges`
                  : 'Spring Boot API'}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
