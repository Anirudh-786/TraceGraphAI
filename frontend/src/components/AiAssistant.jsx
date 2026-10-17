import React, { useState } from 'react';
import {
  IconSparkles,
  IconNetwork,
  IconAlertTriangle,
  IconCheck,
  IconCpu,
  IconZap,
  getServiceIcon,
} from './Icons';

export default function AiAssistant({
  services = [],
  selectedService = "",
  onSelectService,
  aiAnswer,
  aiLoading,
  aiError,
  onAskAi,
  onHighlightInGraph,
  topRiskService = "",
}) {
  const [question, setQuestion] = useState("");

  const suggestedQuestions = [
    {
      label: "What happens if database-service goes down?",
      service: "database-service",
      text: "What happens if database-service goes down? Explain direct and indirect impacts.",
    },
    {
      label: "Which services depend on payment-service?",
      service: "payment-service",
      text: "Which services depend on payment-service, and what is its blast radius?",
    },
    {
      label: topRiskService
        ? `Explain highest-risk service (${topRiskService})`
        : "Explain the highest-risk service",
      service: topRiskService || (services[0] || ""),
      text: `Explain the risk factors, criticality, and dependent cascade for ${topRiskService || 'this service'}.`,
    },
    {
      label: "Analyze the failure cascade and blast radius",
      service: selectedService || (services[0] || ""),
      text: "Analyze the failure cascade and summarize how dependent services are affected if an outage occurs.",
    },
  ];

  function handleSelectChip(item) {
    if (item.service && services.includes(item.service)) {
      onSelectService(item.service);
    }
    setQuestion(item.text);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedService || !question.trim() || aiLoading) return;
    onAskAi(selectedService, question.trim());
  }

  // Extract affected services from aiAnswer
  const affectedList = aiAnswer?.impact?.affectedServices || [];

  return (
    <div className="ai-assistant-container">
      {/* Top Header */}
      <div className="ai-view-header">
        <div className="ai-badge-tag">
          <IconCpu size={14} />
          <span>LOCAL AI INCIDENT COPILOT</span>
        </div>
        <h2>Grounded Incident Intelligence</h2>
        <p>
          Ask questions about service failure blast radii, risk factors, and architecture cascades.
          Responses are strictly grounded in your FalkorDB dependency graph evidence via local Ollama (<code>llama3.2:3b</code>).
        </p>
      </div>

      {/* Query Formulation Form */}
      <form onSubmit={handleSubmit} className="ai-query-form-card">
        <div className="ai-form-row">
          <div className="service-picker-wrap">
            <label htmlFor="ai-service-picker" className="form-label">
              Target Service for Analysis:
            </label>
            <select
              id="ai-service-picker"
              value={selectedService}
              onChange={(e) => onSelectService(e.target.value)}
              className="ai-service-select"
              disabled={aiLoading}
            >
              <option value="">-- Select a service to investigate --</option>
              {services.map((svc) => (
                <option key={svc} value={svc}>
                  {svc}
                </option>
              ))}
            </select>
          </div>

          <div className="ollama-tag-pill">
            <span className="dot-green-pulse" />
            <span>Ollama: llama3.2:3b</span>
          </div>
        </div>

        {/* Suggested Prompt Chips */}
        <div className="suggested-chips-wrapper">
          <span className="chips-title">Suggested Inquiries:</span>
          <div className="chips-list">
            {suggestedQuestions.map((chip, idx) => (
              <button
                type="button"
                key={idx}
                className="prompt-chip-btn"
                onClick={() => handleSelectChip(chip)}
                disabled={aiLoading}
              >
                <IconSparkles size={12} />
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Question Textarea */}
        <div className="textarea-wrapper">
          <label htmlFor="ai-question-input" className="form-label">
            Your Incident or Dependency Question:
          </label>
          <textarea
            id="ai-question-input"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What happens if this service experiences total failure? Which services are in the direct cascade?"
            className="ai-textarea"
            maxLength={1000}
            disabled={aiLoading}
          />
          <div className="textarea-char-count">
            {question.length} / 1000 characters
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-action-row">
          <button
            type="submit"
            className="btn-primary-glow btn-submit-ai"
            disabled={!selectedService || !question.trim() || aiLoading}
          >
            <IconSparkles size={15} />
            <span>{aiLoading ? 'Synthesizing FalkorDB Evidence...' : 'Ask TraceGraphAI Copilot'}</span>
          </button>
        </div>
      </form>

      {/* Loading Radar */}
      {aiLoading && (
        <div className="ai-loading-card">
          <div className="radar-spinner">
            <div className="radar-circle-1" />
            <div className="radar-circle-2" />
            <IconCpu size={24} className="radar-center-icon" />
          </div>
          <div className="radar-text">
            <strong>Analyzing FalkorDB Graph Evidence...</strong>
            <p>
              Retrieving topology paths, calculated risk scores, and calling local <code>llama3.2:3b</code> via Ollama.
            </p>
          </div>
        </div>
      )}

      {/* Error Card */}
      {aiError && (
        <div className="ai-error-card">
          <IconAlertTriangle size={24} className="text-red flex-shrink-0" />
          <div className="ai-error-body">
            <strong>AI Copilot Unavailable</strong>
            <p>{aiError}</p>
            <div className="ollama-help-box">
              <span>To use the local AI assistant, start Ollama in your terminal:</span>
              <code>ollama run llama3.2:3b</code>
            </div>
          </div>
        </div>
      )}

      {/* AI Answer & Evidence Card */}
      {aiAnswer && !aiLoading && (
        <div className="ai-answer-card">
          <div className="answer-header">
            <div className="answer-service-tag">
              <span className="tag-icon">{getServiceIcon(aiAnswer.service)}</span>
              <strong>{aiAnswer.service}</strong>
              <span className="tag-model">&middot; {aiAnswer.model || 'llama3.2:3b'}</span>
            </div>

            {affectedList.length > 0 && (
              <button
                className="btn-accent-canvas btn-highlight-graph"
                onClick={() => onHighlightInGraph(aiAnswer.service, affectedList)}
                title="Highlight target and affected services in the graph canvas"
              >
                <IconNetwork size={14} />
                <span>Highlight in Graph Canvas &rarr;</span>
              </button>
            )}
          </div>

          {/* Real Backend Evidence Bar */}
          {aiAnswer.risk && (
            <div className="evidence-metrics-bar">
              <div className="evidence-item">
                <span className="ev-label">RISK LEVEL</span>
                <span className={`ev-badge badge-risk-${(aiAnswer.risk.riskLevel || 'LOW').toLowerCase()}`}>
                  {aiAnswer.risk.riskLevel}
                </span>
              </div>
              <div className="evidence-item">
                <span className="ev-label">RISK SCORE</span>
                <strong className="ev-val">{aiAnswer.risk.riskScore}/100</strong>
              </div>
              <div className="evidence-item">
                <span className="ev-label">TOTAL AFFECTED</span>
                <strong className="ev-val text-orange">{aiAnswer.impact?.affectedCount ?? 0}</strong>
              </div>
              <div className="evidence-item">
                <span className="ev-label">DIRECT IMPACT</span>
                <strong className="ev-val">{aiAnswer.impact?.directCount ?? 0}</strong>
              </div>
              <div className="evidence-item">
                <span className="ev-label">INDIRECT IMPACT</span>
                <strong className="ev-val">{aiAnswer.impact?.indirectCount ?? 0}</strong>
              </div>
            </div>
          )}

          {/* Formatted Answer Output */}
          <div className="answer-prose-content">
            {aiAnswer.answer.split('\n\n').map((paragraph, pIdx) => (
              <p key={pIdx}>{paragraph}</p>
            ))}
          </div>

          {/* Affected Services Mentioned List */}
          {affectedList.length > 0 && (
            <div className="verified-evidence-section">
              <div className="verified-heading">
                <IconCheck size={14} className="text-green" />
                <span>Verified Affected Dependent Services in Blast Radius</span>
              </div>
              <div className="verified-pills">
                {affectedList.map((aff, i) => {
                  const name =
                    typeof aff === 'string'
                      ? aff
                      : aff.properties?.name || aff.name || `Service ${i + 1}`;
                  const dist = aff.distance || 1;
                  return (
                    <span key={i} className="verified-pill">
                      {name} <small>(Dist: {dist})</small>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="answer-disclaimer">
            <span>
              Grounding guarantee: The incident explanation is constrained by FalkorDB graph evidence.
              Risk scores are heuristic estimates calculated by the backend, not probabilities of failure.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
