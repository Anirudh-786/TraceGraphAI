import React, { useRef, useEffect } from 'react';
import { IconSearch, IconRefresh, IconClose } from './Icons';

export default function TopNav({
  activeTab,
  pageMeta = { title: "Dependency Graph", subtitle: "Interactive service topology" },
  backendStatus = "CHECKING",
  nodeCount = 0,
  edgeCount = 0,
  searchQuery = "",
  onSearchChange,
  onRefresh,
  isLoading = false,
  matchingNodesCount = null,
}) {
  const searchInputRef = useRef(null);

  // Global hotkey: '/' focuses search input
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="app-topnav">
      {/* Left: Dynamic Title & Context */}
      <div className="topnav-titles">
        <h1 className="topnav-heading">{pageMeta.title}</h1>
        <p className="topnav-subtitle">{pageMeta.subtitle}</p>
      </div>

      {/* Center: Search Field */}
      <div className="topnav-search-wrapper">
        <div className="search-input-box">
          <IconSearch size={14} className="search-icon" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search services by name, label, or property... (Press / to focus)"
            className="search-input"
            aria-label="Search services"
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => onSearchChange("")}
              title="Clear search"
            >
              <IconClose size={12} />
            </button>
          )}
          {!searchQuery && (
            <kbd className="search-kbd">/</kbd>
          )}
        </div>

        {searchQuery && matchingNodesCount !== null && (
          <div className="search-result-badge">
            {matchingNodesCount} {matchingNodesCount === 1 ? 'match' : 'matches'}
          </div>
        )}
      </div>

      {/* Right: Real data metrics & Refresh button */}
      <div className="topnav-actions">
        {/* Real counts from backend */}
        <div className="topnav-metrics-pill" title="Actual counts from FalkorDB graph">
          <div className="metric-item">
            <span className="metric-val">{nodeCount}</span>
            <span className="metric-lbl">Services</span>
          </div>
          <span className="metric-divider">/</span>
          <div className="metric-item">
            <span className="metric-val">{edgeCount}</span>
            <span className="metric-lbl">Dependencies</span>
          </div>
        </div>

        {/* Live backend status chip */}
        <div
          className={`topnav-status-chip ${
            backendStatus === 'UP'
              ? 'status-chip-up'
              : backendStatus === 'CHECKING'
              ? 'status-chip-checking'
              : 'status-chip-down'
          }`}
          title={`Backend status: ${backendStatus}`}
        >
          <span className="chip-indicator" />
          <span className="chip-text">
            {backendStatus === 'UP' ? 'FalkorDB Connected' : backendStatus === 'CHECKING' ? 'Connecting...' : 'API Disconnected'}
          </span>
        </div>

        {/* Refresh button with spinner state */}
        <button
          className={`topnav-refresh-btn ${isLoading ? 'btn-loading' : ''}`}
          onClick={onRefresh}
          disabled={isLoading}
          title="Reload graph and risk scores from backend"
          aria-label="Refresh graph"
        >
          <IconRefresh size={14} className={isLoading ? 'spin-animation' : ''} />
          <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
        </button>
      </div>
    </header>
  );
}
