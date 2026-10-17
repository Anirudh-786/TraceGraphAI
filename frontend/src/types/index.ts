// TraceGraphAI Strictly Typed Domain Interfaces

export type Criticality = 'high' | 'medium' | 'low' | string;
export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ImpactType = 'DIRECT' | 'INDIRECT';
export type BackendStatus = 'UP' | 'DOWN' | 'CHECKING';
export type ToastType = 'info' | 'success' | 'error';
export type ActiveTab = 'overview' | 'graph' | 'impact' | 'ai';

export interface ServiceProperties {
  name?: string;
  criticality?: Criticality;
  serviceType?: string;
  environment?: string;
  description?: string;
  [key: string]: unknown;
}

export interface GraphNode {
  id: string | number;
  labels?: string[];
  properties?: ServiceProperties;
  name?: string;
  [key: string]: unknown;
}

export interface GraphEdge {
  source: string | number;
  target: string | number;
  label?: string;
  [key: string]: unknown;
}

export interface GraphData {
  application: string;
  graph: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphTestResponse {
  application: string;
  graph: string;
  status: string;
  nodes?: number;
  relationships?: number;
}

export interface HealthResponse {
  application: string;
  status: string;
}

export interface ServiceRisk {
  service: string;
  criticality: Criticality;
  affectedCount: number;
  criticalityScore: number;
  impactScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  found?: boolean;
  application?: string;
  message?: string;
}

export interface AffectedService {
  id: string | number;
  labels?: string[];
  properties?: ServiceProperties;
  name?: string;
  distance: number;
  impactType: ImpactType;
}

export interface ImpactResult {
  application: string;
  service: string;
  affectedCount: number;
  directCount: number;
  indirectCount: number;
  affectedServices: (AffectedService | string)[];
}

export interface DependencyPathResponse {
  application: string;
  source: string;
  target: string;
  found: boolean;
  path?: string[];
  relationships?: string[];
  error?: string;
}

export interface AiRequest {
  service: string;
  question: string;
}

export interface AiResponse {
  service: string;
  question: string;
  answer: string;
  risk?: ServiceRisk;
  impact?: ImpactResult;
  model?: string;
  error?: string;
}

export interface ToastData {
  message: string;
  type: ToastType;
}

export interface PageMeta {
  title: string;
  subtitle: string;
}

// React Flow Custom Node Data
export interface ServiceNodeCustomData {
  id?: string | number;
  name?: string;
  labels?: string[];
  properties?: ServiceProperties;
  riskData?: ServiceRisk | null;
  isFailureOrigin?: boolean;
  impactType?: ImpactType | null;
  impactDistance?: number;
  isSearchMatch?: boolean;
  isDimmed?: boolean;
  isAiHighlighted?: boolean;
  incomingCount?: number;
  outgoingCount?: number;
  rawLabels?: string[];
  rawProperties?: ServiceProperties;
  [key: string]: unknown;
}

export interface CustomNodeProps {
  id: string;
  data: ServiceNodeCustomData;
  selected?: boolean;
}

// API Error with metadata
export interface ApiError extends Error {
  status?: number;
  data?: Record<string, unknown> | null;
  isOffline?: boolean;
  original?: unknown;
}
