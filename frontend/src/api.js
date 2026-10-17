// TraceGraphAI Backend API Client
// Reuses all existing Spring Boot endpoints and handles network errors gracefully

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.status) {
      throw err;
    }
    // Network / connection refused error
    const connectionError = new Error(
      `Cannot connect to TraceGraphAI backend at ${BASE_URL}. Ensure Spring Boot is running on port 8080.`
    );
    connectionError.isOffline = true;
    connectionError.original = err;
    throw connectionError;
  }
}

export const api = {
  // Graph topology
  async getGraph() {
    const data = await request('/api/graph');
    return {
      application: data.application || 'TraceGraphAI',
      graph: data.graph || 'tracegraph',
      nodes: Array.isArray(data.nodes) ? data.nodes : [],
      edges: Array.isArray(data.edges) ? data.edges : [],
    };
  },

  // Connection & graph tests
  async getGraphTest() {
    return request('/api/graph/test');
  },

  async getHealth() {
    return request('/api/health');
  },

  // Risk analytics
  async getAllRisks() {
    const data = await request('/api/graph/risks');
    return Array.isArray(data) ? data : [];
  },

  async getServiceRisk(serviceName) {
    return request(`/risk?service=${encodeURIComponent(serviceName.trim())}`);
  },

  // Impact analysis (outage simulation blast radius)
  async getServiceImpact(serviceName) {
    return request(`/api/graph/impact?service=${encodeURIComponent(serviceName.trim())}`);
  },

  // Dependency path between two services
  async getDependencyPath(source, target) {
    return request(
      `/api/graph/path?source=${encodeURIComponent(source.trim())}&target=${encodeURIComponent(target.trim())}`
    );
  },

  // AI Incident Assistant (Ollama Llama 3.2:3b grounded with FalkorDB evidence)
  async askAi(serviceName, question) {
    return request('/api/ai/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service: serviceName.trim(),
        question: question.trim(),
      }),
    });
  },

  // Service node & relationship mutations (preserves existing backend capabilities)
  async createService(name) {
    return request('/api/graph/nodes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: name.trim() }),
    });
  },

  async createRelationship(source, target) {
    return request('/api/graph/relationships', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: source.trim(),
        target: target.trim(),
      }),
    });
  },
};

export default api;
