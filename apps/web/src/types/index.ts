export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface WhatsAppInstance {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string | null;
  status: 'disconnected' | 'connecting' | 'qr' | 'connected';
  createdAt: string;
}

export interface Flow {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  trigger: FlowTrigger;
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt: string;
  updatedAt: string;
  _count?: { executions: number };
}

export interface FlowTrigger {
  type: string;
  config: Record<string, unknown>;
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface FlowExecution {
  id: string;
  flowId: string;
  contactId: string;
  status: 'running' | 'completed' | 'failed';
  currentNode: string | null;
  startedAt: string;
  completedAt: string | null;
  flow?: { name: string };
  contact?: { name: string | null; phone: string };
}

export interface Contact {
  id: string;
  userId: string;
  phone: string;
  name: string | null;
  email: string | null;
  tags: string[];
  variables: Record<string, unknown> | null;
  optOut: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  instanceId: string;
  contactId: string | null;
  direction: 'inbound' | 'outbound';
  type: string;
  content: Record<string, unknown>;
  status: string;
  sentAt: string | null;
  createdAt: string;
  contact?: { name: string | null; phone: string };
  instance?: { name: string };
}

export interface Webhook {
  id: string;
  userId: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  isActive: boolean;
  createdAt: string;
  _count?: { logs: number };
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  statusCode: number | null;
  payload: Record<string, unknown>;
  response: string | null;
  createdAt: string;
}

export interface DashboardStats {
  activeFlows: number;
  totalContacts: number;
  messagesToday: number;
  deliveryRate: number;
  recentExecutions: FlowExecution[];
  dailyMessages: Array<{ createdAt: string; _count: number }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
