export interface Metric {
  id: number;
  service: string;
  cpu_usage: number;
  memory_usage: number;
  error_rate: number;
  latency_ms: number;
  request_count: number;
  is_anomaly: boolean;
  recorded_at: string;
}

export interface Incident {
  id: number;
  title: string;
  service: string;
  status: 'open' | 'investigating' | 'resolved';
  severity: 'critical' | 'high' | 'medium' | 'low';
  root_cause: string | null;
  confidence_score: number | null;
  recovery_action: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface RecoveryAction {
  id: number;
  incident_id: number;
  action_type: string;
  description: string;
  status: 'pending' | 'approved' | 'executed' | 'failed';
  executed_at: string | null;
}
