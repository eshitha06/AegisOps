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
  status: 'open' | 'investigating' | 'verifying' | 'recovery_pending' | 'recovering' | 'verification' | 'recovery_failed' | 'resolved';
  severity: 'critical' | 'high' | 'medium' | 'low';
  root_cause: string | null;
  confidence_score: number | null;
  recovery_action: string | null;
  observed_evidence: string | null;
  rca_result: string | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;

  // Live synchronization & telemetry comparison fields
  live_condition?: 'ACTIVE' | 'CLEARED';
  current_service_state?: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  current_cpu_percent?: number;
  current_memory_percent?: number;
  current_error_rate?: number;
  current_latency_ms?: number;
  incident_cpu_percent?: number | null;
  incident_memory_percent?: number | null;
  incident_error_rate?: number | null;
  incident_latency_ms?: number | null;
  last_telemetry_time?: string | null;
}

export interface RecoveryAction {
  id: number;
  incident_id: number;
  action_type: string;
  description: string;
  status: 'pending' | 'approved' | 'executed' | 'failed';
  executed_at: string | null;
  execution_log: string | null;
  verification_result: string | null;
  incident_title?: string | null;
  incident_service?: string | null;
  incident_status?: string | null;
  observed_evidence?: string | null;
  rca_result?: string | null;
}
