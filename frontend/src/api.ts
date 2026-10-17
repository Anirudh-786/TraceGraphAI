// TraceGraphAI Strictly Typed Backend API Client
// Connects to Spring Boot backend via VITE_API_BASE_URL or fallback

import type {
  GraphData,
  GraphTestResponse,
  HealthResponse,
  ServiceRisk,
  ImpactResult,
  DependencyPathResponse,
  AiResponse,
  ApiError,
} from './types';

const BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        data?.error || data?.message || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg) as ApiError;
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data as T;
  } catch (err: unknown) {
    const apiErr = err as ApiError;
    if (apiErr.status) {
      throw apiErr;
    }
    // Network / connection refused error
    const connectionError = new Error(
      `Cannot connect to TraceGraphAI backend at ${BASE_URL}. Ensure Spring Boot is running and accessible.`
    ) as ApiError;
    connectionError.isOffline = true;
    connectionError.original = err;
    throw connectionError;
  }
}

export const api = {
  // Graph topology
  async getGraph(): Promise<GraphData> {
    const data = await request<GraphData>('/api/graph');
    return {
      application: data.application || 'TraceGraphAI',
      graph: data.graph || 'tracegraph',
      nodes: Array.isArray(data.nodes) ? data.nodes : [],
      edges: Array.isArray(data.edges) ? data.edges : [],
    };
  },

  // Connection & graph tests
  async getGraphTest(): Promise<GraphTestResponse> {
    return request<GraphTestResponse>('/api/graph/test');
  },

  async getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>('/api/health');
  },

  // Risk analytics
  async getAllRisks(): Promise<ServiceRisk[]> {
    const data = await request<ServiceRisk[]>('/api/graph/risks');
    return Array.isArray(data) ? data : [];
  },

  async getServiceRisk(serviceName: string): Promise<ServiceRisk> {
    return request<ServiceRisk>(`/risk?service=${encodeURIComponent(serviceName.trim())}`);
  },

  // Impact analysis (outage simulation blast radius)
  async getServiceImpact(serviceName: string): Promise<ImpactResult> {
    return request<ImpactResult>(`/api/graph/impact?service=${encodeURIComponent(serviceName.trim())}`);
  },

  // Dependency path between two services
  async getDependencyPath(source: string, target: string): Promise<DependencyPathResponse> {
    return request<DependencyPathResponse>(
      `/api/graph/path?source=${encodeURIComponent(source.trim())}&target=${encodeURIComponent(target.trim())}`
    );
  },

  // AI Incident Assistant (grounded in FalkorDB evidence)
  async askAi(serviceName: string, question: string): Promise<AiResponse> {
    return request<AiResponse>('/api/ai/ask', {
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

  // Service node & relationship mutations
  async createService(name: string): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>('/api/graph/nodes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: name.trim() }),
    });
  },

  async createRelationship(source: string, target: string): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>('/api/graph/relationships', {
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

  // Safe idempotent seed endpoint on backend (for local & remote FalkorDB seeding)
  async seedExpandedGraph(): Promise<Record<string, unknown>> {
    return request<Record<string, unknown>>('/api/graph/seed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
};

export default api;
